<?php
/**
 * Path: Public/api/car/car_inspection_rule_save.php
 * 說明: 檢查需要（rules）+ 到期日（inspections）一起存
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleService.php';

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '', true);
if (!is_array($body)) json_error('JSON 格式不正確', 400);

$vehicleId  = (int)($body['vehicle_id'] ?? 0);
$typeId     = (int)($body['type_id'] ?? 0);
$isRequired = (int)($body['is_required'] ?? 0);
$dueDate    = $body['due_date'] ?? null;

if ($vehicleId <= 0 || $typeId <= 0) json_error('vehicle_id/type_id 不正確', 400);
$isRequired = ($isRequired === 1) ? 1 : 0;

// due_date 格式
if ($dueDate !== null) {
  $dueDate = trim((string)$dueDate);
  if ($dueDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dueDate)) {
    json_error('due_date 格式不正確（YYYY-MM-DD）', 400);
  }
  if ($dueDate === '') $dueDate = null;
}

// ✅ 防呆：required=1 時 due_date 必填
if ($isRequired === 1 && $dueDate === null) {
  json_error('設定為需要檢查時，必須填寫到期日', 422);
}

try {
  $result = VehicleService::saveInspectionRuleAndDate($vehicleId, $typeId, $isRequired, $dueDate);
  json_ok($result);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
