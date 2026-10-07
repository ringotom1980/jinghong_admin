<?php
/**
 * Path: Public/api/car/car_get.php
 * 說明: 右側工作區用：單車完整資料 + inspections + rules
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
  json_error('缺少 id', 400);
}

try {
  $data = VehicleService::getVehicleBundle($id);
  if (!$data) json_error('找不到車輛', 404);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
