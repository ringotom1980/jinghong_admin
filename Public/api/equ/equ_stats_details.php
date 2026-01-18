<?php
/**
 * Path: Public/api/equ/equ_stats_details.php
 * 說明: 右表明細（key + tool_id）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/EquRepairStatsService.php';

try {
  $key = isset($_GET['key']) ? trim((string)$_GET['key']) : '';
  $toolId = isset($_GET['tool_id']) ? (int)$_GET['tool_id'] : 0;

  if ($key === '') json_error('缺少 key', 400);
  if ($toolId <= 0) json_error('缺少 tool_id', 400);

  $svc = new EquRepairStatsService(db());
  $rows = $svc->getDetails($key, $toolId);

  json_ok(['rows' => $rows]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
