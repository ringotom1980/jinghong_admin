<?php
/**
 * Path: Public/api/vehicle/vehicle_dicts.php
 * 說明: 車輛字典（類型/廠牌/吊臂型式/檢查項目）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

try {
  $data = VehicleService::dicts();
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
