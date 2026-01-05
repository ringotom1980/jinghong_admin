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

require_once __DIR__ . '/../../../app/services/mat/MatIssueService.php';

$withdrawDate = trim((string)($_POST['withdraw_date'] ?? ''));
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $withdrawDate)) {
  json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
}

if (!isset($_FILES['files'])) {
  json_error('未收到檔案（files[]）', 400);
}

$files = normalize_files_array($_FILES['files']);

try {
  $uid = current_user_id();
  $data = MatIssueService::importFiles($withdrawDate, $files, $uid ? (int)$uid : null);
  json_ok($data);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}

/**
 * 將 $_FILES['files'] 轉為一維陣列（每個元素是單檔結構）
 * @return array<int, array<string, mixed>>
 */
function normalize_files_array(array $f): array
{
  $out = [];
  // multi
  if (is_array($f['name'] ?? null)) {
    $n = count($f['name']);
    for ($i = 0; $i < $n; $i++) {
      $out[] = [
        'name' => $f['name'][$i] ?? '',
        'type' => $f['type'][$i] ?? '',
        'tmp_name' => $f['tmp_name'][$i] ?? '',
        'error' => $f['error'][$i] ?? UPLOAD_ERR_NO_FILE,
        'size' => $f['size'][$i] ?? 0,
      ];
    }
    return $out;
  }

  // single
  $out[] = $f;
  return $out;
}
