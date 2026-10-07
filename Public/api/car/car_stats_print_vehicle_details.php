<?php

/**
 * Path: Public/api/car/car_stats_print_vehicle_details.php
 * 說明: 列印用｜單一車輛維修明細（依期間 key + vehicle_id）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleRepairStatsService.php';

try {
    $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
    $vehicleId = isset($_GET['vehicle_id']) ? (int)$_GET['vehicle_id'] : 0;

    if ($key === '' || $vehicleId <= 0) {
        json_error('缺少必要參數：key 或 vehicle_id', 400);
    }

    $svc = new VehicleRepairStatsService(db());
    $payload = $svc->getPrintVehicleDetails($key, $vehicleId);
    json_ok($payload);
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
