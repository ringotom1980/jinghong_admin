<?php
/**
 * Path: Public/api/hot/tools.php
 * 說明: 活電工具（tools）API（整合版，單檔）
 * - GET  : items / tools / vehicles / delete_preview / add_preview
 * - POST : item_create / item_update / item_delete / tool_add / tool_update
 *
 * 回傳：{success,data,error}
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/HotToolsService.php';

try {
  $svc = new HotToolsService(db());

  $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
  $action = '';

  if ($method === 'GET') {
    $action = isset($_GET['action']) ? trim((string)$_GET['action']) : '';
  } else {
    $body = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($body)) $body = [];
    $action = isset($body['action']) ? trim((string)$body['action']) : '';
  }

  if ($action === '') json_error('action 不可為空', 400);

  /* =========================
   * GET
   * ========================= */
  if ($method === 'GET') {
    switch ($action) {
      case 'items': {
        $rows = $svc->listItemsWithCounts();
        json_ok(['items' => $rows]);
      }

      case 'tools': {
        $itemId = isset($_GET['item_id']) ? (int)$_GET['item_id'] : 0;
        if ($itemId <= 0) json_error('item_id 不可為空', 400);
        $rows = $svc->listToolsByItem($itemId);
        json_ok(['tools' => $rows]);
      }

      case 'vehicles': {
        $rows = $svc->listVehiclesAll();
        json_ok(['vehicles' => $rows]);
      }

      case 'delete_preview': {
        $itemId = isset($_GET['item_id']) ? (int)$_GET['item_id'] : 0;
        if ($itemId <= 0) json_error('item_id 不可為空', 400);
        $data = $svc->getDeletePreview($itemId);
        json_ok($data);
      }

      case 'add_preview': {
        $itemId = isset($_GET['item_id']) ? (int)$_GET['item_id'] : 0;
        $qty = isset($_GET['qty']) ? (int)$_GET['qty'] : 0;
        if ($itemId <= 0) json_error('item_id 不可為空', 400);
        if ($qty <= 0) json_error('qty 必須 >= 1', 400);
        $range = $svc->previewAddToolsRange($itemId, $qty);
        json_ok(['range' => $range]);
      }

      default:
        json_error('未知 action', 400);
    }
  }

  /* =========================
   * POST
   * ========================= */
  $body = json_decode((string)file_get_contents('php://input'), true);
  if (!is_array($body)) json_error('body 格式錯誤', 400);

  switch ($action) {
    case 'item_create': {
      $name = (string)($body['name'] ?? '');
      $qty = (int)($body['qty'] ?? 0);
      $data = $svc->createItem($name, $qty);
      json_ok($data);
    }

    case 'item_update': {
      $rows = $body['rows'] ?? null;
      if (!is_array($rows)) json_error('rows 格式錯誤', 400);
      $data = $svc->updateItems($rows);
      json_ok($data);
    }

    case 'item_delete': {
      $id = (int)($body['id'] ?? 0);
      if ($id <= 0) json_error('id 不可為空', 400);
      $data = $svc->deleteItem($id);
      json_ok($data);
    }

    case 'tool_add': {
      $itemId = (int)($body['item_id'] ?? 0);
      $qty = (int)($body['qty'] ?? 0);
      if ($itemId <= 0) json_error('item_id 不可為空', 400);
      if ($qty <= 0) json_error('qty 必須 >= 1', 400);

      $inspectDate = isset($body['inspect_date']) ? (string)$body['inspect_date'] : null;
      $vehicleId = isset($body['vehicle_id']) && $body['vehicle_id'] !== '' ? (int)$body['vehicle_id'] : null;
      $note = isset($body['note']) ? (string)$body['note'] : null;

      $data = $svc->addTools($itemId, $qty, $inspectDate, $vehicleId, $note);
      json_ok($data);
    }

    case 'tool_update': {
      $itemId = (int)($body['item_id'] ?? 0);
      $rows = $body['rows'] ?? null;
      if ($itemId <= 0) json_error('item_id 不可為空', 400);
      if (!is_array($rows)) json_error('rows 格式錯誤', 400);

      $data = $svc->updateTools($itemId, $rows);
      json_ok($data);
    }

    default:
      json_error('未知 action', 400);
  }

} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
