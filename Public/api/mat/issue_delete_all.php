<?php
/**
 * Path: Public/api/mat/issue_delete_all.php
 * 說明: 依 withdraw_date 刪除該日期全部批次（連帶 items）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatIssueService.php';

$raw  = file_get_contents('php://input');
$body = json_decode((string)$raw, true);

$withdrawDate = trim((string)($body['withdraw_date'] ?? ''));

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $withdrawDate)) {
  json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
}

try {
  // 這個方法你目前 service 還沒有，需要加（下一段我給你要加哪裡）
  $data = MatIssueService::deleteAllByDate($withdrawDate);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
