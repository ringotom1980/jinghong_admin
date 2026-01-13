<?php
/**
 * Path: Public/api/vehicle/vehicle_save.php
 * 說明: 新增/更新 車輛主檔 vehicle_vehicles
 * Body(JSON):
 * - id (nullable)
 * - vehicle_code (required)
 * - plate_no, vehicle_type_id, brand_id, boom_type_id
 * - owner_name, user_name, tonnage, vehicle_year
 * - vehicle_price, boom_price, bucket_price
 * - is_active (bool/int)
 * - note
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$raw = file_get_contents('php://input');
$payload = json_decode((string)$raw, true);
if (!is_array($payload)) {
  json_error('JSON 解析失敗', 400);
}

try {
  $res = VehicleService::saveVehicle($payload);
  json_ok($res);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
