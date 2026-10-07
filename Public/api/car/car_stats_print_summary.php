<?php
/**
 * Path: Public/api/car/car_stats_print_summary.php
 * 說明: 列印：維修統計表（key）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleRepairStatsService.php';

try {
  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  if ($key === '') json_error('缺少 key', 400);

  $svc = new VehicleRepairStatsService(db());
  $data = $svc->getPrintSummary($key);

  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
