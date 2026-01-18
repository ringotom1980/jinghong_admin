<?php
/**
 * Path: Public/api/equ/equ_stats_print.php
 * 說明: 列印：工具維修統計表（廠商 × 月份矩陣）（key）
 * - 依你的需求：工具只有一種列印，不做選項彈窗
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquRepairStatsService.php';

try {
  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  if ($key === '') json_error('缺少 key', 400);

  $svc = new EquRepairStatsService(db());
  $data = $svc->getPrintVendorMatrix($key);

  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
