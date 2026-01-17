<?php
/**
 * Path: Public/api/car/car_repair_save.php
 * 說明: 新增/更新維修紀錄（transaction）
 * body:
 *  - id (0=新增)
 *  - header { vehicle_id, repair_date, vendor, repair_type, mileage, note }
 *  - items [{ seq, content, team_amount, company_amount }]
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

try {
  $body = json_decode(file_get_contents('php://input'), true);
  if (!is_array($body)) json_error('body 格式錯誤', 400);

  $data = VehicleService::vehicleRepairSave($body);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
