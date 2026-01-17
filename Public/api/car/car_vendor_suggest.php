<?php
/**
 * Path: Public/api/car/car_vendor_suggest.php
 * 說明: vendor 建議（like 查詢）
 * 參數：q
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

try {
  $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
  $data = VehicleService::vehicleVendorSuggest($q);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
