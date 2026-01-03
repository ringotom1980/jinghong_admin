<?php
/**
 * Path: Public/api/public/pole/suggest.php
 * 說明: 公開電桿地圖 autocomplete（不需登入）
 *
 * 規則（定版）：
 * - 查詢欄位：圖號座標(map_ref) / 桿號(pole_no)
 * - q >= 2 才查；否則回空陣列
 * - 最多 10 筆
 * - 回傳包含 lat/lng 供前端定位
 * - 資訊卡欄位：地址、圖號座標、桿號（缺值顯示「無」）
 */

declare(strict_types=1);
ini_set('display_errors', '1');
error_reporting(E_ALL);
// ✅ 公開 API 不應啟 session：不要引 bootstrap.php
require_once __DIR__ . '/../../../../app/db.php';
require_once __DIR__ . '/../../../../app/response.php';

$q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';

$len = function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q);
if ($q === '' || $len < 2) {
  json_ok([]); // 定版：不足 2 字直接回空
}

// LIKE 轉義：避免 % _ 被當萬用字元
$esc = str_replace('\\', '\\\\', $q);
$esc = str_replace('%', '\%', $esc);
$esc = str_replace('_', '\_', $esc);

$like   = '%' . $esc . '%';
$prefix = $esc . '%';

try {
  $pdo = db();

  // 只查 map_ref / pole_no（定版）
  $sql = "
    SELECT map_ref, pole_no, address, lat, lng
    FROM poles
    WHERE (map_ref LIKE :like ESCAPE '\\\\' OR pole_no LIKE :like ESCAPE '\\\\')
    ORDER BY
      (map_ref = :q) DESC,
      (pole_no IS NOT NULL) DESC,
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

    // 資訊卡欄位：缺值顯示「無」（定版）
    $displayAddress = ($address !== '') ? $address : '無';
    $displayMapRef  = ($mapRef !== '') ? $mapRef : '無';
    $displayPoleNo  = ($poleNo !== '') ? $poleNo : '無';

    $lat = isset($r['lat']) ? (float)$r['lat'] : null;
    $lng = isset($r['lng']) ? (float)$r['lng'] : null;

    // autocomplete 顯示字串
    $label = $displayMapRef . '｜桿號:' . $displayPoleNo . '｜' . $displayAddress;

    $items[] = [
      'label'   => $label,
      'lat'     => $lat,
      'lng'     => $lng,
      'address' => $displayAddress,
      'map_ref' => $displayMapRef,
      'pole_no' => $displayPoleNo,
    ];
  }

  json_ok($items);
} catch (Throwable $e) {
  json_error('SERVER_ERROR: ' . $e->getMessage(), 500);
}
