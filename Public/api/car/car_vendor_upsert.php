<?php
/**
 * Path: Public/api/car/car_vendor_upsert.php
 * 說明: vendor upsert（body: { vendor }）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

try {
  $body = json_decode(file_get_contents('php://input'), true);
  $v = (is_array($body) && isset($body['vendor'])) ? trim((string)$body['vendor']) : '';
  if ($v === '') json_error('缺少 vendor', 400);

  $data = VehicleService::vehicleVendorUpsert($v);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
