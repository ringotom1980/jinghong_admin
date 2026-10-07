<?php
/**
 * Path: Public/api/mat/issue_delete.php
 * 說明: 刪除整批（依 batch_id）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatIssueService.php';

$raw = file_get_contents('php://input');
$body = json_decode((string)$raw, true);
$batchId = isset($body['batch_id']) ? (int)$body['batch_id'] : 0;

if ($batchId <= 0) {
  json_error('batch_id 不可為空', 400);
}

try {
  $data = MatIssueService::deleteBatch($batchId);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
