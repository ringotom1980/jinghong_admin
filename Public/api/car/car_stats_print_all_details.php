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
    // ✅ GET query: ?key=2025 / 2025-H1 / 2025-H2
    $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
    if ($key === '') {
        json_error('Missing key', 400);
    }

    $svc = new VehicleRepairStatsService(db());
    $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
    if ($key === '') json_error('Missing key', 400);

    $rows = $svc->getPrintAllVehicleDetails($key);

    // ✅ 回傳「service 已組好的列印 payload」當 data 根節點
    json_ok($rows);
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
