<?php
/**
 * Path: scripts/import_poles.php
 * 說明: 每月自動下載台電 CSV 並匯入 poles（匯入時 TWD97 TM2-121 → WGS84 lat/lng）
 *
 * 定版規則：
 * - 唯一鍵：map_ref（圖號座標）
 * - pole_no：可空；空白與 '?' / '？' 視為 NULL
 * - 座標：來源為 TWD97_X/Y（TM2-121），匯入時轉為 lat/lng
 * - CSV 暫存：storage/import/pole/all.csv
 *
 * 環境變數：
 * - POLE_CSV_URL
 * - DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASS
 *
 * CLI 執行：
 *   php scripts/import_poles.php
 */

declare(strict_types=1);

/**
 * ✅ CLI 需自行載入 .env（因為不走 app/bootstrap.php）
 * - 直接沿用你 app/bootstrap.php 的讀法
 * - 不啟 session（避免 cron/CLI 帶出 session 檔案）
 */
$envFile = dirname(__DIR__) . '/.env';
if (is_file($envFile)) {
  foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = (string)$line;
    if ($line === '') continue;
    if (($line[0] ?? '') === '#') continue;
    if (strpos($line, '=') === false) continue;

    [$k, $v] = explode('=', $line, 2);
    $k = trim((string)$k);
    $v = trim((string)$v);

    if ($k === '') continue;

    if (($v[0] ?? '') === '"' && substr($v, -1) === '"') {
      $v = substr($v, 1, -1);
    }
    putenv($k . '=' . $v);
  }
}

require_once __DIR__ . '/../app/db.php';

$csvUrl = (string)(getenv('POLE_CSV_URL') ?: '');
if ($csvUrl === '') {
  fwrite(STDERR, "[ERR] POLE_CSV_URL is empty\n");
  exit(1);
}

$root    = dirname(__DIR__);
$csvDir  = $root . '/storage/import/pole';
$csvPath = $csvDir . '/all.csv';
$tmpPath = $csvDir . '/all.csv.tmp';

@mkdir($csvDir, 0775, true);

$pdo = db();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 1) 下載 CSV（原子替換）
echo "[INFO] Downloading CSV...\n";
download_file($csvUrl, $tmpPath);
if (!is_file($tmpPath) || filesize($tmpPath) < 100) {
  fwrite(STDERR, "[ERR] downloaded file missing/too small\n");
  @unlink($tmpPath);
  exit(1);
}
@rename($tmpPath, $csvPath);
echo "[OK] Saved: {$csvPath} (" . filesize($csvPath) . " bytes)\n";

// 2) 串流讀取 CSV（自動偵測分隔符：逗號/Tab）
$fh = fopen($csvPath, 'rb');
if (!$fh) {
  fwrite(STDERR, "[ERR] cannot open csv: {$csvPath}\n");
  exit(1);
}

$firstLine = fgets($fh);
if ($firstLine === false) {
  fwrite(STDERR, "[ERR] empty csv\n");
  exit(1);
}
// 回到開頭，稍後用 fgetcsv 重新讀 header
rewind($fh);

// 偵測 delimiter：逗號分欄太少就用 tab
$delim = (substr_count($firstLine, ',') >= 3) ? ',' : "\t";

$header = fgetcsv($fh, 0, $delim);
if (!$header) {
  fwrite(STDERR, "[ERR] cannot read header\n");
  exit(1);
}
$header[0] = strip_utf8_bom((string)$header[0]);

$idx = array_flip($header);

// 欄位名稱（含少數 alias）
$colCounty = find_col($idx, ['縣市']);
$colDist   = find_col($idx, ['行政區']);
$colLi     = find_col($idx, ['鄉里', '鄰里']);
$colMapRef = find_col($idx, ['圖號座標']);
$colPoleNo = find_col($idx, ['桿號']);
$colX      = find_col($idx, ['TWD_97_X', 'TWD97_X']);
$colY      = find_col($idx, ['TWD_97_Y', 'TWD97_Y']);

$missing = [];
if ($colCounty === null) $missing[] = '縣市';
if ($colDist   === null) $missing[] = '行政區';
if ($colLi     === null) $missing[] = '鄉里/鄰里';
if ($colMapRef === null) $missing[] = '圖號座標';
if ($colPoleNo === null) $missing[] = '桿號';
if ($colX      === null) $missing[] = 'TWD_97_X';
if ($colY      === null) $missing[] = 'TWD_97_Y';

if ($missing) {
  fwrite(STDERR, "[ERR] missing columns: " . implode(', ', $missing) . "\n");
  fwrite(STDERR, "[HINT] header=" . implode($delim, $header) . "\n");
  exit(1);
}

// 3) UPSERT（以 map_ref 為唯一鍵）
$sql = "
INSERT INTO poles (map_ref, pole_no, address, lat, lng, src_x, src_y)
VALUES (:map_ref, :pole_no, :address, :lat, :lng, :src_x, :src_y)
ON DUPLICATE KEY UPDATE
  pole_no = VALUES(pole_no),
  address = VALUES(address),
  lat     = VALUES(lat),
  lng     = VALUES(lng),
  src_x   = VALUES(src_x),
  src_y   = VALUES(src_y),
  updated_at = CURRENT_TIMESTAMP
";
$stmt = $pdo->prepare($sql);

$upserted = 0;
$skipped  = 0;
$badCoord = 0;

$batch = 0;
$pdo->beginTransaction();

while (($row = fgetcsv($fh, 0, $delim)) !== false) {
  $mapRef = trim((string)($row[$colMapRef] ?? ''));
  if ($mapRef === '') { $skipped++; continue; }

  $poleRaw = trim((string)($row[$colPoleNo] ?? ''));
  $poleNo  = normalize_pole_no($poleRaw); // ''/'?'/'？' => null

  $county  = trim((string)($row[$colCounty] ?? ''));
  $dist    = trim((string)($row[$colDist] ?? ''));
  $li      = trim((string)($row[$colLi] ?? ''));
  $address = build_address($county, $dist, $li); // 可為 null

  $xStr = trim((string)($row[$colX] ?? ''));
  $yStr = trim((string)($row[$colY] ?? ''));
  if ($xStr === '' || $yStr === '') { $badCoord++; continue; }

  $x = (float)$xStr;
  $y = (float)$yStr;
  if ($x <= 0 || $y <= 0) { $badCoord++; continue; }

  // TWD97 TM2-121 → WGS84
  [$lat, $lng] = twd97_tm2_to_wgs84($x, $y, 121);

  // 台灣範圍 quick check
  if ($lat < 20.0 || $lat > 27.0 || $lng < 118.0 || $lng > 123.0) {
    $badCoord++;
    continue;
  }

  $stmt->execute([
    ':map_ref' => $mapRef,
    ':pole_no' => $poleNo,
    ':address' => $address,
    ':lat'     => $lat,
    ':lng'     => $lng,
    ':src_x'   => $x,
    ':src_y'   => $y,
  ]);

  $upserted++;
  $batch++;

  if ($batch >= 1000) {
    $pdo->commit();
    $pdo->beginTransaction();
    $batch = 0;
  }
}

if ($pdo->inTransaction()) $pdo->commit();
fclose($fh);

echo "[DONE] upserted={$upserted}, skipped={$skipped}, badCoord={$badCoord}\n";
exit(0);

// ---------------- helpers ----------------

function download_file(string $url, string $destPath): void
{
  @mkdir(dirname($destPath), 0775, true);

  if (function_exists('curl_init')) {
    $fp = fopen($destPath, 'wb');
    if (!$fp) throw new RuntimeException("cannot write {$destPath}");

    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_FILE => $fp,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_CONNECTTIMEOUT => 20,
      CURLOPT_TIMEOUT => 300,
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_SSL_VERIFYHOST => 2,
      CURLOPT_USERAGENT => 'jinghong_admin-poles-import/1.0',
    ]);

    $ok   = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);
    fclose($fp);

    if ($ok !== true || $code < 200 || $code >= 300) {
      @unlink($destPath);
      throw new RuntimeException("download failed HTTP {$code} {$err}");
    }
    return;
  }

  $data = @file_get_contents($url);
  if ($data === false || $data === '') throw new RuntimeException("download failed");
  file_put_contents($destPath, $data);
}

function strip_utf8_bom(string $s): string
{
  return preg_replace('/^\xEF\xBB\xBF/', '', $s) ?? $s;
}

function find_col(array $idx, array $names): ?int
{
  foreach ($names as $n) {
    if (isset($idx[$n])) return (int)$idx[$n];
  }
  return null;
}

function normalize_pole_no(string $s): ?string
{
  $s = trim($s);
  if ($s === '') return null;
  if ($s === '?' || $s === '？') return null;
  return $s;
}

function build_address(string $county, string $dist, string $li): ?string
{
  $parts = [];
  if ($county !== '') $parts[] = $county;
  if ($dist !== '')   $parts[] = $dist;
  if ($li !== '')     $parts[] = $li;
  return $parts ? implode('', $parts) : null;
}

/**
 * TWD97 / TM2 inverse projection (GRS80), central meridian 121 for TM2-121
 */
function twd97_tm2_to_wgs84(float $x, float $y, int $centralMeridianDeg = 121): array
{
  $a  = 6378137.0;
  $b  = 6356752.314140356; // GRS80
  $k0 = 0.9999;
  $dx = 250000.0;
  $dy = 0.0;

  $e  = sqrt(1.0 - ($b * $b) / ($a * $a));
  $e2 = ($e * $e) / (1.0 - $e * $e);

  $xAdj = $x - $dx;
  $yAdj = $y - $dy;

  $m  = $yAdj / $k0;
  $mu = $m / ($a * (1.0 - pow($e, 2) / 4.0 - 3.0 * pow($e, 4) / 64.0 - 5.0 * pow($e, 6) / 256.0));

  $e1 = (1.0 - sqrt(1.0 - $e * $e)) / (1.0 + sqrt(1.0 - $e * $e));

  $j1 = (3.0 * $e1 / 2.0 - 27.0 * pow($e1, 3) / 32.0);
  $j2 = (21.0 * pow($e1, 2) / 16.0 - 55.0 * pow($e1, 4) / 32.0);
  $j3 = (151.0 * pow($e1, 3) / 96.0);
  $j4 = (1097.0 * pow($e1, 4) / 512.0);

  $fp = $mu + $j1 * sin(2.0 * $mu) + $j2 * sin(4.0 * $mu) + $j3 * sin(6.0 * $mu) + $j4 * sin(8.0 * $mu);

  $c1 = $e2 * pow(cos($fp), 2);
  $t1 = pow(tan($fp), 2);
  $r1 = $a * (1.0 - $e * $e) / pow(1.0 - $e * $e * pow(sin($fp), 2), 1.5);
  $n1 = $a / sqrt(1.0 - $e * $e * pow(sin($fp), 2));

  $d = $xAdj / ($n1 * $k0);

  $q1 = $n1 * tan($fp) / $r1;
  $q2 = ($d * $d / 2.0);
  $q3 = (5.0 + 3.0 * $t1 + 10.0 * $c1 - 4.0 * $c1 * $c1 - 9.0 * $e2) * pow($d, 4) / 24.0;
  $q4 = (61.0 + 90.0 * $t1 + 298.0 * $c1 + 45.0 * $t1 * $t1 - 252.0 * $e2 - 3.0 * $c1 * $c1) * pow($d, 6) / 720.0;

  $lat = $fp - $q1 * ($q2 - $q3 + $q4);

  $q5 = $d;
  $q6 = (1.0 + 2.0 * $t1 + $c1) * pow($d, 3) / 6.0;
  $q7 = (5.0 - 2.0 * $c1 + 28.0 * $t1 - 3.0 * $c1 * $c1 + 8.0 * $e2 + 24.0 * $t1 * $t1) * pow($d, 5) / 120.0;

  $lng0 = deg2rad((float)$centralMeridianDeg);
  $lng  = $lng0 + ($q5 - $q6 + $q7) / cos($fp);

  return [rad2deg($lat), rad2deg($lng)];
}
