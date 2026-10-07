<?php
/**
 * Path: Public/api/car/car_stats_summary.php
 * 說明: 左表彙總（key）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleRepairStatsService.php';

try {
  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  if ($key === '') json_error('缺少 key', 400);

  $svc = new VehicleRepairStatsService(db());
  $rows = $svc->getSummary($key);

  json_ok(['rows' => $rows]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
