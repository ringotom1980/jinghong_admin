<?php
/**
 * Path: Public/api/mat/issue_dates.php
 * 說明: 回 withdraw_date 日期列表（給日期膠囊）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/mat/MatIssueService.php';

try {
  $data = MatIssueService::listDates();
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
