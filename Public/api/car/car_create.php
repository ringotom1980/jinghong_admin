<?php
/**
 * Path: Public/api/car/car_create.php
 * 說明: 新增車輛（回傳 vehicle bundle）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) json_error('JSON 格式不正確', 400);

try {
  $bundle = VehicleService::createVehicle($body);
  json_ok($bundle);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
