<?php
/**
 * Path: Public/api/public/pole/suggest.php
 * 說明: 公開電桿地圖 autocomplete（不需登入）
 *
 * 定版規則：
 * - 查詢欄位：map_ref / pole_no
 * - q 長度 < 2 → 回空陣列
 * - 最多 10 筆
 * - 回傳 lat / lng 供前端定位
 */

declare(strict_types=1);

// 1) 載入 env（不啟 session）
require_once __DIR__ . '/../../../../app/env.php';
load_project_env(true);

// 2) 載入 db() 與 json 回應工具
require_once __DIR__ . '/../../../../app/db.php';
require_once __DIR__ . '/../../../../app/response.php';

// 取得查詢字串
$q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
$len = function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q);

// q 太短直接回空（autocomplete 規則）
if ($q === '' || $len < 2) {
    json_ok([]);
}

// LIKE escape（配合 ESCAPE '\\'）
$esc = str_replace('\\', '\\\\', $q);
$esc = str_replace('%', '\%', $esc);
$esc = str_replace('_', '\_', $esc);

$like   = '%' . $esc . '%';
$prefix = $esc . '%';

try {
    $pdo = db();

    // ✅ 使用位置參數，避免 PDO 命名參數重複造成 HY093
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
        $prefix,  // map_ref LIKE 'xxx%'
    ]);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $items = [];
    foreach ($rows as $r) {
        $mapRef  = trim((string)($r['map_ref'] ?? ''));
        $poleNo  = trim((string)($r['pole_no'] ?? ''));
        $address = trim((string)($r['address'] ?? ''));

        $items[] = [
            'label'   => ($mapRef !== '' ? $mapRef : '無')
                       . '｜桿號:' . ($poleNo !== '' ? $poleNo : '無')
                       . '｜' . ($address !== '' ? $address : '無'),
            'lat'     => isset($r['lat']) ? (float)$r['lat'] : null,
            'lng'     => isset($r['lng']) ? (float)$r['lng'] : null,
            'address' => $address !== '' ? $address : '無',
            'map_ref' => $mapRef !== '' ? $mapRef : '無',
            'pole_no' => $poleNo !== '' ? $poleNo : '無',
        ];
    }

    json_ok($items);

} catch (Throwable $e) {
    // 對外一律只回 SERVER_ERROR（公開 API 安全）
    json_error('SERVER_ERROR', 500);
}
