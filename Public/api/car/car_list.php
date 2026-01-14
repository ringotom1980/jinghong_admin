<?php
/**
 * Path: Public/api/car/car_list.php
 * 說明: 左側清單用：車輛基本欄位 + 檢查狀態聚合所需資料
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

try {
  $data = VehicleService::listVehiclesWithInspectionAgg();
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
