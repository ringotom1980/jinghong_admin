<?php
/**
 * Path: Public/api/mat/edit_reconciliation.php
 * 說明: D 班對帳 API（get/save）
 * - withdraw_date -> recon_values_json（整包覆蓋）
 * - 儲存前檢查：mat_issue_items.withdraw_date 是否有資料
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatEditService.php';

$svc = new MatEditService(db());

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
  if ($method === 'GET') {
    $action = (string)($_GET['action'] ?? 'get');
    if ($action !== 'get') json_error('不支援的 action', 400);

    $d = (string)($_GET['withdraw_date'] ?? '');
    $rec = $svc->getReconciliation($d);

    json_ok($rec);
  }

  if ($method === 'POST') {
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) $payload = [];
    $action = (string)($payload['action'] ?? '');

    if ($action !== 'save') json_error('不支援的 action', 400);

    $d = (string)($payload['withdraw_date'] ?? '');
    $values = $payload['values'] ?? [];
    if (!is_array($values)) $values = [];

    $confirm = (bool)($payload['confirm'] ?? false);

    $hasIssue = $svc->hasIssueData($d);
    if (!$hasIssue && !$confirm) {
      json_ok([
        'need_confirm' => true,
        'message' => '提領時間為' . $d . '當日尚未匯入提領資料(判斷mat_issue_items.withdraw_date)，日期是否正確'
      ]);
    }

    $uid = function_exists('current_user_id') ? current_user_id() : null;
    $svc->saveReconciliation($d, $values, $uid ? (int)$uid : null);

    json_ok([
      'saved' => true,
      'had_issue_data' => $hasIssue
    ]);
  }

  json_error('不支援的 method', 405);
} catch (Throwable $e) {
  json_error($e->getMessage(), 400);
}
