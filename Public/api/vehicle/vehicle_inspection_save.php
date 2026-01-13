<?php
/**
 * Path: Public/api/vehicle/vehicle_inspection_save.php
 * 說明: 儲存檢查到期日 + 檢查需求規則（同一支 API 一次存）
 * Body(JSON):
 * - vehicle_id (required)
 * - inspections: [{type_id, due_date|null}]
 * - rules: [{type_id, is_required(1|0)}]
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

$vehicleId = (int)($payload['vehicle_id'] ?? 0);
if ($vehicleId <= 0) {
  json_error('vehicle_id 不可空白', 400);
}

$inspections = $payload['inspections'] ?? [];
$rules = $payload['rules'] ?? [];

if (!is_array($inspections) || !is_array($rules)) {
  json_error('inspections / rules 格式不正確', 400);
}

try {
  VehicleService::saveInspectionsAndRules($vehicleId, $inspections, $rules);
  json_ok(['ok' => true]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
