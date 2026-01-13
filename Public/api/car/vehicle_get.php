<?php
/**
 * Path: Public/api/vehicle/vehicle_get.php
 * 說明: 取得車輛明細 + 檢查日期 + 檢查需求規則
 * 參數:
 * - id (required)
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
  json_error('id 不可空白', 400);
}

try {
  $data = VehicleService::getVehicle($id);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
