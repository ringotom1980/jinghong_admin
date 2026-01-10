<?php
/**
 * Path: Public/api/mat/edit_category_materials.php
 * 說明: D 班分類材料歸屬 API
 * - GET  action=list       : 取得某分類已選材料
 * - GET  action=pick_list  : modal 用材料清單（shift=D），含 selected/disabled
 * - POST action=save       : 儲存某分類材料組合（整包覆蓋）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pdo = db();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = '';

// 統一 action 來源：GET 用 query；POST 用 JSON body
if ($method === 'GET') {
  $action = (string)($_GET['action'] ?? 'list');
} else {
  $payload = json_decode((string)file_get_contents('php://input'), true);
  if (!is_array($payload)) $payload = [];
  $action = (string)($payload['action'] ?? '');
}

function must_int($v, string $msg): int {
  $n = (int)$v;
  if ($n <= 0) json_error($msg, 400);
  return $n;
}

function normalize_material_numbers($arr): array {
  if (!is_array($arr)) return [];
  $out = [];
  foreach ($arr as $x) {
    $s = trim((string)$x);
    if ($s === '') continue;
    $out[] = $s;
  }
  // unique
  $out = array_values(array_unique($out));
  return $out;
}

try {

  /* =========================
   * GET: list
   * ========================= */
  if ($method === 'GET' && $action === 'list') {
    $categoryId = must_int($_GET['category_id'] ?? 0, '缺少 category_id');

    $st = $pdo->prepare("
      SELECT material_number
      FROM mat_edit_category_materials
      WHERE category_id = :cid
      ORDER BY material_number
    ");
    $st->execute([':cid' => $categoryId]);
    $rows = $st->fetchAll();

    $materials = [];
    foreach ($rows as $r) {
      $materials[] = (string)$r['material_number'];
    }

    json_ok([
      'category_id' => $categoryId,
      'material_numbers' => $materials
    ]);
  }

  /* =========================
   * GET: pick_list (modal)
   * ========================= */
  if ($method === 'GET' && $action === 'pick_list') {
    $categoryId = must_int($_GET['category_id'] ?? 0, '缺少 category_id');

    // 取 shift=D 的材料清單，並帶出目前是否已被某分類佔用（含本分類）
    $st = $pdo->prepare("
      SELECT
        m.material_number,
        m.material_name,
        cm.category_id AS assigned_category_id
      FROM mat_materials m
      LEFT JOIN mat_edit_category_materials cm
        ON cm.material_number = m.material_number
      WHERE m.shift = 'D'
      ORDER BY m.material_number
    ");
    $st->execute();
    $rows = $st->fetchAll();

    $items = [];
    foreach ($rows as $r) {
      $mn = (string)$r['material_number'];
      $assigned = $r['assigned_category_id'] !== null ? (int)$r['assigned_category_id'] : null;

      $isSelected = ($assigned !== null && $assigned === $categoryId);
      $isDisabled = ($assigned !== null && $assigned !== $categoryId);

      $items[] = [
        'material_number' => $mn,
        'material_name'   => (string)($r['material_name'] ?? ''),
        'is_selected'     => $isSelected,
        'is_disabled'     => $isDisabled,
        'assigned_category_id' => $assigned,
      ];
    }

    json_ok([
      'category_id' => $categoryId,
      'items' => $items
    ]);
  }

  /* =========================
   * POST: save
   * body: { action:"save", category_id:1, material_numbers:["123","456"] }
   * ========================= */
  if ($method === 'POST' && $action === 'save') {
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) $payload = [];

    $categoryId = must_int($payload['category_id'] ?? 0, '缺少 category_id');
    $numbers = normalize_material_numbers($payload['material_numbers'] ?? []);

    // 先檢查：材料必須存在於 mat_materials 且 shift='D'
    if (count($numbers) > 0) {
      $in = implode(',', array_fill(0, count($numbers), '?'));
      $st = $pdo->prepare("
        SELECT material_number
        FROM mat_materials
        WHERE shift='D' AND material_number IN ($in)
      ");
      $st->execute($numbers);
      $okRows = $st->fetchAll();
      $okSet = [];
      foreach ($okRows as $r) $okSet[(string)$r['material_number']] = true;

      $missing = [];
      foreach ($numbers as $mn) {
        if (!isset($okSet[$mn])) $missing[] = $mn;
      }
      if (count($missing) > 0) {
        json_error('材料不存在或非 D 班：' . implode(', ', $missing), 400);
      }

      // 互斥檢查：同一 material_number 不可被其他分類佔用
      $st = $pdo->prepare("
        SELECT material_number, category_id
        FROM mat_edit_category_materials
        WHERE material_number IN ($in) AND category_id <> ?
        LIMIT 1
      ");
      $args = $numbers;
      $args[] = $categoryId;
      $st->execute($args);
      $conf = $st->fetch();
      if ($conf) {
        json_error('材料編號已被其他分類使用，無法選取：' . (string)$conf['material_number'], 400);
      }
    }

    $pdo->beginTransaction();

    // 先清掉本分類既有配置（整包覆蓋）
    $stDel = $pdo->prepare("DELETE FROM mat_edit_category_materials WHERE category_id = :cid");
    $stDel->execute([':cid' => $categoryId]);

    if (count($numbers) > 0) {
      $stIns = $pdo->prepare("
        INSERT INTO mat_edit_category_materials (category_id, material_number)
        VALUES (:cid, :mn)
      ");
      foreach ($numbers as $mn) {
        $stIns->execute([':cid' => $categoryId, ':mn' => $mn]);
      }
    }

    $pdo->commit();

    json_ok(true);
  }

  json_error('不支援的 action', 400);

} catch (Throwable $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  json_error($e->getMessage(), 400);
}
