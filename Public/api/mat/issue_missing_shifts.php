<?php
/**
 * Path: Public/api/mat/issue_missing_shifts.php
 * 說明: 依 withdraw_date 回缺 shift 清單 + mat_personnel 下拉清單
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$withdrawDate = (string)($_GET['withdraw_date'] ?? '');
$batchIds = $_GET['batch_ids'] ?? [];

$data = MatIssueService::listMissingShifts(
  $withdrawDate,
  array_map('intval', $batchIds)
);

json_ok($data);
