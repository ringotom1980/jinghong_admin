<?php
/**
 * Path: Public/api/mat/issue_missing_shifts.php
 * 說明: 缺 shift 清單 + mat_personnel 下拉清單
 * - 必留 withdraw_date（相容舊前端）
 * - ✅ 可選：batch_ids（限定本次匯入範圍）
 *   支援：
 *     ?batch_ids=1,2,3
 *     或 ?batch_ids[]=1&batch_ids[]=2
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatIssueService.php';

$withdrawDate = trim((string)($_GET['withdraw_date'] ?? ''));
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $withdrawDate)) {
  json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
}

$batchIds = [];
if (isset($_GET['batch_ids'])) {
  $v = $_GET['batch_ids'];
  if (is_array($v)) {
    $batchIds = $v;
  } else {
    $s = trim((string)$v);
    if ($s !== '') $batchIds = explode(',', $s);
  }
}

try {
  $data = MatIssueService::listMissingShifts($withdrawDate, $batchIds);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
