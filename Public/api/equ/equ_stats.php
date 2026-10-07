<?php
/**
 * Path: Public/api/equ/equ_stats.php
 * 說明: 工具維修統計頁初始化總控 API（capsules + vendor summary + default vendor details）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquRepairStatsService.php';

try {
  $svc = new EquRepairStatsService(db());

  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  $vendorId = isset($_GET['vendor_id']) ? (int)$_GET['vendor_id'] : 0;

  $capsules = $svc->getCapsules(5);
  $defaultKey = $svc->getDefaultKeyFromCapsules($capsules);

  if ($key === '') $key = $defaultKey;

  $summaryRows = $key ? $svc->getSummary($key) : [];

  if ($vendorId <= 0 && $summaryRows) {
    $vendorId = (int)($summaryRows[0]['vendor_id'] ?? 0);
  }

  $detailsRows = ($key && $vendorId > 0) ? $svc->getDetails($key, $vendorId) : [];

  json_ok([
    'capsules' => $capsules,
    'defaultKey' => $defaultKey,
    'summaryRows' => $summaryRows,
    'activeVendorId' => $vendorId > 0 ? $vendorId : null,
    'detailsRows' => $detailsRows,
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
