<?php
/**
 * Path: Public/api/car/car_stats_capsules.php
 * 說明: 只回 capsules（近 5 年、且有資料）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleRepairStatsService.php';

try {
  $svc = new VehicleRepairStatsService(db());
  $capsules = $svc->getCapsules(5);
  json_ok(['capsules' => $capsules, 'defaultKey' => $svc->getDefaultKeyFromCapsules($capsules)]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
