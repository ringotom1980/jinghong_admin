<?php
/**
 * Path: Public/api/car/car_repair_list.php
 * 說明: 維修紀錄列表（無篩選）
 * 回傳：rows[]
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

try {
  $data = VehicleService::vehicleRepairList();
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
