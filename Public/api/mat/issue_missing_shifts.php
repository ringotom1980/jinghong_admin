<?php
/**
 * Path: Public/api/mat/issue_missing_shifts.php
 * 說明: 依 withdraw_date 回缺 shift 清單 + mat_personnel 下拉清單
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/mat/MatIssueService.php';

$withdrawDate = (string)($_GET['withdraw_date'] ?? '');
$withdrawDate = trim($withdrawDate);

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $withdrawDate)) {
  json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
}

try {
  $data = MatIssueService::listMissingShifts($withdrawDate);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
