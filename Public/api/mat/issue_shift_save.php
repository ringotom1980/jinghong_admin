<?php
/**
 * Path: Public/api/mat/issue_shift_save.php
 * 說明: 人工補齊 shift（寫入 mat_materials.shift + 回填 mat_issue_items.shift）
 */


declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$body = json_decode(file_get_contents('php://input'), true);

$data = MatIssueService::saveShiftByBatch(
  $body['batch_ids'] ?? [],
  $body['items'] ?? []
);

json_ok($data);
