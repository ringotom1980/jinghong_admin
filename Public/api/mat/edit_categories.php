<?php
/**
 * Path: Public/api/mat/edit_categories.php
 * 說明: D 班分類 API（list/create/update/delete/sort）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatEditService.php';

$svc = new MatEditService(db());

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = '';

if ($method === 'GET') {
  $action = (string)($_GET['action'] ?? 'list');
} else {
  $payload = json_decode((string)file_get_contents('php://input'), true);
  if (!is_array($payload)) $payload = [];
  $action = (string)($payload['action'] ?? '');
}

try {
  if ($method === 'GET' && $action === 'list') {
    json_ok([
      'categories' => $svc->listCategories()
    ]);
  }

  if ($method === 'POST') {
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) $payload = [];
    $action = (string)($payload['action'] ?? '');

    if ($action === 'create') {
      $name = (string)($payload['category_name'] ?? '');
      $id = $svc->createCategory($name);
      json_ok(['id' => $id]);
    }

    if ($action === 'update') {
      $id = (int)($payload['id'] ?? 0);
      $name = (string)($payload['category_name'] ?? '');
      $svc->renameCategory($id, $name);
      json_ok(true);
    }

    if ($action === 'delete') {
      $ids = $payload['ids'] ?? [];
      if (!is_array($ids)) $ids = [];
      $svc->deleteCategories($ids);
      json_ok(true);
    }

    if ($action === 'sort') {
      $ordered = $payload['ordered_ids'] ?? [];
      if (!is_array($ordered)) $ordered = [];
      $svc->sortCategories($ordered);
      json_ok(true);
    }
  }

  json_error('不支援的 action', 400);
} catch (Throwable $e) {
  json_error($e->getMessage(), 400);
}
