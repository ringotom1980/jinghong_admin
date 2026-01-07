<?php
/**
 * Path: Public/api/mat/issue_import.php
 * 說明: 匯入（多檔、withdraw_date）
 * - 建 batch + 寫 items
 * - shift：有主檔就帶入，沒有就空白（缺漏由前端人工補齊）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$data = MatIssueService::importFiles(
  $_POST['withdraw_date'],
  normalize_files_array($_FILES['files']),
  current_user_id()
);

json_ok($data);
