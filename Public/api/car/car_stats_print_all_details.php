<?php
/**
 * Path: Public/api/car/car_stats_print_all_details.php
 * 說明: 列印用｜各車維修明細（依期間 key）
 * - 每台車一段明細
 * - 僅回資料，不處理版面
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/VehicleRepairStatsService.php';

try {
    $svc = new VehicleRepairStatsService(db());
    $rows = $svc->getPrintAllVehicleDetails($key);

    json_ok([
        'key'   => $key,
        'rows'  => $rows,
    ]);
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
