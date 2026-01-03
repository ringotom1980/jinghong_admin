<?php
/**
 * Path: Public/api/public/pole/suggest.php
 * 說明: 公開電桿地圖 autocomplete（不需登入）
 *
 * 規則：
 * - 只查詢：map_ref（圖號座標）/ pole_no（桿號）
 * - q >= 2（字元）才查；否則回空陣列
 * - 最多 10 筆
 * - 回傳包含 lat/lng 供前端定位（zoom=17 由前端控制）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../../app/bootstrap.php'; // env + db + response + auth（不會強制 require_login）

header('Content-Type: application/json; charset=utf-8');

$q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';

// q < 2 => 空結果（前端已 debounce 300ms）
if ($q === '' || (function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q)) < 2) {
  output_json([
    'success' => true,
    'data'    => [],
    'error'   => null,
  ]);
  exit;
}

// LIKE 轉義（避免 % _ 變成萬用字元）
$esc = str_replace('\\', '\\\\', $q);
$esc = str_replace('%', '\%', $esc);
$esc = str_replace('_', '\_', $esc);

$like   = '%' . $esc . '%';
$prefix = $esc . '%';

try {
  $pdo = db();

  $sql = "
    SELECT map_ref, pole_no, address, lat, lng
    FROM poles
    WHERE (map_ref LIKE :like ESCAPE '\\\\' OR pole_no LIKE :like ESCAPE '\\\\')
    ORDER BY
      (map_ref = :q) DESC,
      (map_ref LIKE :prefix ESCAPE '\\\\') DESC,
      (pole_no = :q) DESC,
      map_ref ASC
    LIMIT 10
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute([
    ':like'   => $like,
    ':prefix' => $prefix,
    ':q'      => $q,
  ]);

  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $items = [];
  foreach ($rows as $r) {
    $mapRef  = isset($r['map_ref']) ? trim((string)$r['map_ref']) : '';
    $poleNo  = isset($r['pole_no']) ? trim((string)$r['pole_no']) : '';
    $address = isset($r['address']) ? trim((string)$r['address']) : '';

    // 缺值顯示「無」（依你定版）
    $displayAddress = ($address !== '') ? $address : '無';
    $displayMapRef  = ($mapRef !== '') ? $mapRef : '無';
    $displayPoleNo  = ($poleNo !== '') ? $poleNo : '無';

    $lat = isset($r['lat']) ? (float)$r['lat'] : null;
    $lng = isset($r['lng']) ? (float)$r['lng'] : null;

    $items[] = [
      // 給 autocomplete 用
      'value' => $mapRef !== '' ? $mapRef : ($poleNo !== '' ? $poleNo : ''),
      'label' => $displayMapRef . '｜桿號:' . $displayPoleNo . '｜' . $displayAddress,

      // 給點選後定位用
      'lat' => $lat,
      'lng' => $lng,

      // 給資訊卡用（缺值已轉「無」）
      'address' => $displayAddress,
      'map_ref' => $displayMapRef,
      'pole_no' => $displayPoleNo,
    ];
  }

  output_json([
    'success' => true,
    'data'    => $items,
    'error'   => null,
  ]);
} catch (Throwable $e) {
  output_json([
    'success' => false,
    'data'    => [],
    'error'   => 'SERVER_ERROR',
  ]);
}

/**
 * 依你專案 response.php 可能已有共用輸出函式；這裡做「相容輸出」。
 * - 如果你 response.php 有 json_response()/json_ok()/json_fail() 之類，可再告訴我，我會改成完全一致版本。
 */
function output_json(array $payload): void
{
  // 若你專案已有共用 JSON 輸出函式，優先用它（避免格式不一致）
  if (function_exists('json_response')) {
    // 假設簽名: json_response($payload, $statusCode=200)
    json_response($payload, 200);
    return;
  }
  if (function_exists('respond_json')) {
    respond_json($payload);
    return;
  }

  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
