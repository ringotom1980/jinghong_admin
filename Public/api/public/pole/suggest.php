<?php
/**
 * Path: Public/api/public/pole/suggest.php
 * 說明: 公開電桿地圖 autocomplete（不需登入）
 */

declare(strict_types=1);

// 1) 載入 env（強制覆蓋空值，避免 DB_USER='' 或未載入）
require_once __DIR__ . '/../../../../app/env.php';
load_project_env(true);

// 2) 載入 db() 與 json_ok/json_error
require_once __DIR__ . '/../../../../app/db.php';
require_once __DIR__ . '/../../../../app/response.php';

function pole_api_log(string $msg): void
{
    $root = dirname(__DIR__, 4); // .../jinghong_admin
    $logDir = $root . '/storage/logs';
    @mkdir($logDir, 0775, true);
    @file_put_contents($logDir . '/pole_api.log', '[' . date('Y-m-d H:i:s') . '] ' . $msg . "\n", FILE_APPEND);
}

// 3) 先把 DB env 檢查掉（避免你又看到 SERVER_ERROR）
$required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'];
foreach ($required as $k) {
    $v = getenv($k);
    if ($v === false || trim((string)$v) === '') {
        pole_api_log("ENV_MISSING {$k}");
        json_error('ENV_MISSING:' . $k, 500);
    }
}

$q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
$len = function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q);
if ($q === '' || $len < 2) {
    json_ok([]);
}

// LIKE escape
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
          (pole_no = :q) DESC,
          (map_ref LIKE :prefix ESCAPE '\\\\') DESC,
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

        $displayAddress = ($address !== '') ? $address : '無';
        $displayMapRef  = ($mapRef !== '') ? $mapRef : '無';
        $displayPoleNo  = ($poleNo !== '') ? $poleNo : '無';

        $lat = isset($r['lat']) ? (float)$r['lat'] : null;
        $lng = isset($r['lng']) ? (float)$r['lng'] : null;

        $items[] = [
            'label'   => $displayMapRef . '｜桿號:' . $displayPoleNo . '｜' . $displayAddress,
            'lat'     => $lat,
            'lng'     => $lng,
            'address' => $displayAddress,
            'map_ref' => $displayMapRef,
            'pole_no' => $displayPoleNo,
        ];
    }

    json_ok($items);
} catch (Throwable $e) {
    pole_api_log('EXCEPTION ' . get_class($e) . ' | ' . $e->getMessage());
    json_error('SERVER_ERROR', 500);
}
