<?php
/**
 * Path: Public/api/car/car_repair_delete.php
 * 說明: 刪除維修紀錄（刪 header；items 由 ON DELETE CASCADE 自動刪）
 * body: { id }
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

try {
  $body = json_decode(file_get_contents('php://input'), true);
  $id = (is_array($body) && isset($body['id'])) ? (int)$body['id'] : 0;
  if ($id <= 0) json_error('缺少 id', 400);

  $data = VehicleService::vehicleRepairDelete($id);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
