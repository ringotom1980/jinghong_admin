<?php
/**
 * Path: Public/api/car/car_dicts.php
 * 說明: 右側下拉選單字典：types/brands/boom_types/inspection_types
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

try {
  $data = VehicleService::getDicts();
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
