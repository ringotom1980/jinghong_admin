<?php
/**
 * Path: Public/api/car/car_repair_list.php
 * 說明: 維修紀錄列表（支援 key 篩選）
 * - key=YYYY-H1 / YYYY-H2 / YYYY
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_once __DIR__ . '/../../../app/services/VehicleService.php';

require_login();

header('Content-Type: application/json; charset=utf-8');

try {
  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  $rows = VehicleService::vehicleRepairList(['key' => $key]);
  echo json_encode(['success' => true, 'data' => $rows, 'error' => null], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(400);
  echo json_encode(['success' => false, 'data' => null, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
