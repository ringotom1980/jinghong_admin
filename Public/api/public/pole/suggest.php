<?php
/**
 * Path: Public/api/public/pole/suggest.php
 * 說明: 公開電桿地圖 autocomplete（不需登入）
 *
 * 規則（定版）：
 * - 查詢欄位：map_ref / pole_no
 * - q >= 2 才查；否則回空陣列
 * - 最多 10 筆
 * - 回傳 lat/lng 供前端定位
 */

declare(strict_types=1);

// 1) 載入 env（不啟 session）
require_once __DIR__ . '/../../../../app/env.php';
load_project_env(true); // 強制覆蓋一次，避免 PHP-FPM 環境殘值干擾

// 2) 載入 db() 與 json_ok/json_error
require_once __DIR__ . '/../../../../app/db.php';
require_once __DIR__ . '/../../../../app/response.php';

function pole_api_log(string $msg): void
{
    $root = dirname(__DIR__, 5); // .../jinghong_admin
    $logDir = $root . '/storage/logs';
    @mkdir($logDir, 0775, true);
    @file_put_contents($logDir . '/pole_api.log', '[' . date('Y-m-d H:i:s') . '] ' . $msg . "\n", FILE_APPEND);
}

$debug = (isset($_GET['debug']) && (string)$_GET['debug'] === '1');

$q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
$len = function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q);

if ($q === '' || $len < 2) {
    json_ok([]);
}

// LIKE escape（保留 ESCAPE 行為）
$esc = str_replace('\\', '\\\\', $q);
$esc = str_replace('%', '\%', $esc);
$esc = str_replace('_', '\_', $esc);
$like   = '%' . $esc . '%';
$prefix = $esc . '%';

try {
    pole_api_log('ENV DB_HOST='.(string)getenv('DB_HOST').' DB_NAME='.(string)getenv('DB_NAME').' DB_USER='.(string)getenv('DB_USER').' DB_PASS_LEN='.strlen((string)getenv('DB_PASS')));

    $pdo = db();

    // ✅ 改用位置參數 ?，徹底避免 HY093（命名參數重複）問題
    $sql = "
        SELECT map_ref, pole_no, address, lat, lng
        FROM poles
        WHERE (map_ref LIKE ? ESCAPE '\\\\' OR pole_no LIKE ? ESCAPE '\\\\')
        ORDER BY
          (map_ref = ?) DESC,
          (pole_no = ?) DESC,
          (map_ref LIKE ? ESCAPE '\\\\') DESC,
          map_ref ASC
        LIMIT 10
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $like,    // map_ref LIKE ?
        $like,    // pole_no LIKE ?
        $q,       // map_ref = ?
        $q,       // pole_no = ?
        $prefix,  // map_ref LIKE ?
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

        $lat = array_key_exists('lat', $r) && $r['lat'] !== null ? (float)$r['lat'] : null;
        $lng = array_key_exists('lng', $r) && $r['lng'] !== null ? (float)$r['lng'] : null;

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

    if ($debug) {
        json_error('SERVER_ERROR: ' . $e->getMessage(), 500);
    }
    json_error('SERVER_ERROR', 500);
}
