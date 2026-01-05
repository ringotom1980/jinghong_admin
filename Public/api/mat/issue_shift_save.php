<?php
/**
 * Path: Public/api/mat/issue_shift_save.php
 * 說明: 人工補齊 shift（寫入 mat_materials.shift + 回填 mat_issue_items.shift）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/mat/MatIssueService.php';

$raw = file_get_contents('php://input');
$body = json_decode((string)$raw, true);

$withdrawDate = trim((string)($body['withdraw_date'] ?? ''));
$shiftCode = trim((string)($body['shift_code'] ?? ''));
$materialNumbers = $body['material_numbers'] ?? [];

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $withdrawDate)) {
  json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
}
if ($shiftCode === '') {
  json_error('shift_code 不可為空', 400);
}
if (!is_array($materialNumbers) || empty($materialNumbers)) {
  json_error('material_numbers 不可為空', 400);
}

try {
  $data = MatIssueService::saveShift($withdrawDate, $shiftCode, $materialNumbers);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
