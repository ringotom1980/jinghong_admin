<?php
/**
 * Path: Public/api/hot/assign.php
 * 說明: 活電工具配賦（assign）API（整合版，單檔）
 * - GET  : vehicles / tools / available_vehicles / items_counts / unassigned_tools
 * - POST : vehicle_add / vehicle_unassign_all / assign_more / transfer / tool_unassign
 *
 * 回傳：{success,data,error}
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/HotAssignService.php';

try {
  $svc = new HotAssignService(db());

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
      case 'vehicles': {
        $rows = $svc->listAssignedVehicles();
        json_ok(['vehicles' => $rows]);
      }

      case 'tools': {
        $vehicleId = isset($_GET['vehicle_id']) ? (int)$_GET['vehicle_id'] : 0;
        if ($vehicleId <= 0) json_error('vehicle_id 不可為空', 400);
        $rows = $svc->listToolsByVehicle($vehicleId);
        json_ok(['tools' => $rows]);
      }

      case 'available_vehicles': {
        $rows = $svc->listAvailableVehiclesForAdd();
        json_ok(['vehicles' => $rows]);
      }

      case 'items_counts': {
        $rows = $svc->listItemsCounts();
        json_ok(['items' => $rows]);
      }

      case 'unassigned_tools': {
        $itemId = isset($_GET['item_id']) && $_GET['item_id'] !== '' ? (int)$_GET['item_id'] : null;
        if ($itemId !== null && $itemId <= 0) $itemId = null;
        $rows = $svc->listUnassignedTools($itemId);
        json_ok(['tools' => $rows]);
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
    case 'vehicle_add': {
      $vehicleId = (int)($body['vehicle_id'] ?? 0);
      $rows = $body['rows'] ?? null;
      if ($vehicleId <= 0) json_error('vehicle_id 不可為空', 400);
      if (!is_array($rows)) json_error('rows 格式錯誤', 400);

      $data = $svc->addVehicleWithTools($vehicleId, $rows);
      json_ok($data);
    }

    case 'vehicle_unassign_all': {
      $vehicleId = (int)($body['vehicle_id'] ?? 0);
      if ($vehicleId <= 0) json_error('vehicle_id 不可為空', 400);

      $data = $svc->unassignAllByVehicle($vehicleId);
      json_ok($data);
    }

    case 'assign_more': {
      $vehicleId = (int)($body['vehicle_id'] ?? 0);
      $toolIds = $body['tool_ids'] ?? null;
      if ($vehicleId <= 0) json_error('vehicle_id 不可為空', 400);
      if (!is_array($toolIds)) json_error('tool_ids 格式錯誤', 400);

      $data = $svc->assignMoreUnassignedTools($vehicleId, $toolIds);
      json_ok($data);
    }

        case 'update': {
      $vehicleId = (int)($body['vehicle_id'] ?? 0);
      $addIds = $body['add_tool_ids'] ?? null;
      $removeIds = $body['remove_tool_ids'] ?? null;

      if ($vehicleId <= 0) json_error('vehicle_id 不可為空', 400);
      if (!is_array($addIds)) $addIds = [];
      if (!is_array($removeIds)) $removeIds = [];

      $data = $svc->updateAssignDiff($vehicleId, $addIds, $removeIds);
      json_ok($data);
    }

    case 'transfer': {
      $vehicleId = (int)($body['vehicle_id'] ?? 0);
      $toolIds = $body['tool_ids'] ?? null;
      if ($vehicleId <= 0) json_error('vehicle_id 不可為空', 400);
      if (!is_array($toolIds)) json_error('tool_ids 格式錯誤', 400);

      $data = $svc->transferToolsToVehicle($vehicleId, $toolIds);
      json_ok($data);
    }

    case 'tool_unassign': {
      $toolIds = $body['tool_ids'] ?? null;
      if (!is_array($toolIds)) json_error('tool_ids 格式錯誤', 400);

      $data = $svc->unassignTools($toolIds);
      json_ok($data);
    }

    default:
      json_error('未知 action', 400);
  }

} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
