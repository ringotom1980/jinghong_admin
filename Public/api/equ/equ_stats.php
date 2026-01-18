<?php
/**
 * Path: Public/api/equ/equ_stats.php
 * 說明: 工具維修統計頁初始化總控 API（capsules + summary + default details）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquRepairStatsService.php';

try {
  $svc = new EquRepairStatsService(db());

  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  $toolId = isset($_GET['tool_id']) ? (int)$_GET['tool_id'] : 0;

  $capsules = $svc->getCapsules(5);
  $defaultKey = $svc->getDefaultKeyFromCapsules($capsules);

  if ($key === '') $key = $defaultKey;

  $summaryRows = $key ? $svc->getSummary($key) : [];

  if ($toolId <= 0 && $summaryRows) {
    $toolId = (int)($summaryRows[0]['tool_id'] ?? 0);
  }

  $detailsRows = ($key && $toolId > 0) ? $svc->getDetails($key, $toolId) : [];

  json_ok([
    'capsules' => $capsules,
    'defaultKey' => $defaultKey,
    'summaryRows' => $summaryRows,
    'activeToolId' => $toolId > 0 ? $toolId : null,
    'detailsRows' => $detailsRows,
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
