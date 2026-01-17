<?php
/**
 * Path: Public/api/car/car_stats.php
 * 說明: 維修統計頁初始化總控 API（capsules + summary + default details）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleRepairStatsService.php';

try {
  $svc = new VehicleRepairStatsService(db());

  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  $vehicleId = isset($_GET['vehicle_id']) ? (int)$_GET['vehicle_id'] : 0;

  $capsules = $svc->getCapsules(5);
  $defaultKey = $svc->getDefaultKeyFromCapsules($capsules);

  if ($key === '') $key = $defaultKey;

  $summaryRows = $key ? $svc->getSummary($key) : [];
  if ($vehicleId <= 0 && $summaryRows) {
    $vehicleId = (int)($summaryRows[0]['vehicle_id'] ?? 0);
  }

  $detailsRows = ($key && $vehicleId > 0) ? $svc->getDetails($key, $vehicleId) : [];

  json_ok([
    'capsules' => $capsules,
    'defaultKey' => $defaultKey,
    'summaryRows' => $summaryRows,
    'activeVehicleId' => $vehicleId > 0 ? $vehicleId : null,
    'detailsRows' => $detailsRows,
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
