<?php
/**
 * Path: Public/api/mat/issue_shift_save.php
 * 說明: 人工補齊 shift（逐筆指定）
 * Body:
 * {
 *   withdraw_date: "YYYY-MM-DD",
 *   batch_ids: [1,2,3],
 *   items: [
 *     { material_number, material_name, shift_code },
 *     ...
 *   ]
 * }
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatIssueService.php';

$raw = file_get_contents('php://input');
$body = json_decode((string)$raw, true);

$withdrawDate = trim((string)($body['withdraw_date'] ?? ''));
$batchIds = $body['batch_ids'] ?? [];
$items = $body['items'] ?? [];

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $withdrawDate)) {
  json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
}
if (!is_array($batchIds) || empty($batchIds)) {
  json_error('batch_ids 不可為空（需限定本次匯入範圍）', 400);
}
if (!is_array($items) || empty($items)) {
  json_error('items 不可為空', 400);
}

try {
  $data = MatIssueService::saveShift($withdrawDate, $items, $batchIds);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
