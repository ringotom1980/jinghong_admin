<?php
/**
 * Path: Public/api/car/car_save.php
 * 說明: 更新車輛基本資料（EDIT 用）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) json_error('JSON 格式不正確', 400);

$id = (int)($body['id'] ?? 0);
if ($id <= 0) json_error('缺少 id', 400);

try {
  $vehicle = VehicleService::saveVehicle($id, $body);
  // 這裡回傳 bundle（與前端 car_base_detail.js 的期待一致：j.data.vehicle）
  $bundle = VehicleService::getVehicleBundle($id);
  if (!$bundle) json_error('儲存成功但讀取失敗', 500);

  json_ok($bundle);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
