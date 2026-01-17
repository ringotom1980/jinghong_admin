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
    $svc = new VehicleRepairStatsService(db());
    $rows = $svc->getPrintVehicleDetails($key, $vehicleId);

    json_ok([
        'key'        => $key,
        'vehicle_id'=> $vehicleId,
        'rows'       => $rows,
    ]);
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
