<?php
/**
 * Path: Public/api/car/car_stats_details.php
 * 說明: 右表明細（key + vehicle_id）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleRepairStatsService.php';

try {
  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  $vehicleId = isset($_GET['vehicle_id']) ? (int)$_GET['vehicle_id'] : 0;

  if ($key === '') json_error('缺少 key', 400);
  if ($vehicleId <= 0) json_error('缺少 vehicle_id', 400);

  $svc = new VehicleRepairStatsService(db());
  $rows = $svc->getDetails($key, $vehicleId);

  json_ok(['rows' => $rows]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
