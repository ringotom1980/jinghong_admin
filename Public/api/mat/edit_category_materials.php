<?php
/**
 * Path: Public/api/mat/edit_category_materials.php
 * 說明: D 班分類-材料歸屬 API（list/materials/set）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatEditService.php';

$svc = new MatEditService(db());

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
  if ($method === 'GET') {
    $action = (string)($_GET['action'] ?? 'list');

    if ($action === 'list') {
      json_ok([
        'categories' => $svc->listCategoryMaterials()
      ]);
    }

    if ($action === 'materials') {
      json_ok([
        'materials' => $svc->listMaterialsShiftDWithAssignment()
      ]);
    }

    json_error('不支援的 action', 400);
  }

  if ($method === 'POST') {
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) $payload = [];
    $action = (string)($payload['action'] ?? '');

    if ($action === 'set') {
      $cid = (int)($payload['category_id'] ?? 0);
      $nums = $payload['material_numbers'] ?? [];
      if (!is_array($nums)) $nums = [];
      $svc->setCategoryMaterials($cid, $nums);
      json_ok(true);
    }

    json_error('不支援的 action', 400);
  }

  json_error('不支援的 method', 405);
} catch (Throwable $e) {
  json_error($e->getMessage(), 400);
}
