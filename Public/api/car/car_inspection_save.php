<?php
/**
 * Path: Public/api/car/car_inspection_save.php
 * 說明: 檢查到期日：date input 變更即存
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) json_error('JSON 格式不正確', 400);

$vehicleId = (int)($body['vehicle_id'] ?? 0);
$typeId = (int)($body['type_id'] ?? 0);
$dueDate = $body['due_date'] ?? null;

if ($vehicleId <= 0 || $typeId <= 0) json_error('vehicle_id/type_id 不正確', 400);

if ($dueDate !== null) {
  $dueDate = trim((string)$dueDate);
  if ($dueDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dueDate)) {
    json_error('due_date 格式不正確（YYYY-MM-DD）', 400);
  }
  if ($dueDate === '') $dueDate = null;
}

try {
  $inspections = VehicleService::saveInspectionDueDate($vehicleId, $typeId, $dueDate);
  json_ok(['inspections' => $inspections]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
