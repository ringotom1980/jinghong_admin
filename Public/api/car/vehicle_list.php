<?php
/**
 * Path: Public/api/vehicle/vehicle_list.php
 * 說明: 車輛列表（搜尋 + 可選只顯示使用中）
 * 參數:
 * - q (optional)
 * - active_only=1|0 (default 1)
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$q = trim((string)($_GET['q'] ?? ''));
$activeOnly = (string)($_GET['active_only'] ?? '1') !== '0';

try {
  $rows = VehicleService::listVehicles($q, $activeOnly);
  json_ok(['rows' => $rows]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
