<?php
/**
 * Path: Public/api/mat/personnel.php
 * 說明: 承辦人異動 API（list / update）
 * - GET  action=list   => 回傳 A-F
 * - POST action=update => 更新單一班別姓名（若該班別不存在則 upsert）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pdo = db();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

/** 統一讀 payload（JSON body） */
$payload = [];
if ($method !== 'GET') {
  $payload = json_decode((string)file_get_contents('php://input'), true);
  if (!is_array($payload)) $payload = [];
}

/** action：GET 走 query；POST 優先 query，其次 payload */
if ($method === 'GET') {
  $action = (string)($_GET['action'] ?? 'list');
} else {
  $action = (string)($_GET['action'] ?? '');
  if ($action === '') $action = (string)($payload['action'] ?? '');
}

function norm_shift(string $s): string {
  $s = strtoupper(trim($s));
  return $s;
}

function is_valid_shift(string $s): bool {
  return (bool)preg_match('/^[A-F]$/', $s);
}

try {

  if ($method === 'GET' && $action === 'list') {

    // 固定班別 A-F：若 DB 缺列，仍回傳空字串（前端仍可更新，update 會 upsert）
    $wanted = ['A','B','C','D','E','F'];

    $st = $pdo->query("SELECT shift_code, person_name FROM mat_personnel");
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    $map = [];
    foreach ($rows as $r) {
      $sc = isset($r['shift_code']) ? norm_shift((string)$r['shift_code']) : '';
      if ($sc !== '' && is_valid_shift($sc)) {
        $map[$sc] = (string)($r['person_name'] ?? '');
      }
    }

    $out = [];
    foreach ($wanted as $sc) {
      $out[] = [
        'shift_code' => $sc,
        'person_name' => $map[$sc] ?? ''
      ];
    }

    json_ok(['rows' => $out]);
  }

  if ($method === 'POST' && $action === 'update') {

    $shift = norm_shift((string)($payload['shift_code'] ?? ''));
    $name  = trim((string)($payload['person_name'] ?? ''));

    if (!is_valid_shift($shift)) {
      json_error('班別代號不正確（僅允許 A-F）', 400);
    }
    if ($name === '') {
      json_error('承辦人姓名不可為空', 400);
    }
    if (mb_strlen($name, 'UTF-8') > 50) {
      json_error('承辦人姓名長度不可超過 50 字元', 400);
    }

    // upsert by uk_shift_code（你表上有 UNIQUE）
    $sql = "
      INSERT INTO mat_personnel (shift_code, person_name)
      VALUES (:sc, :nm)
      ON DUPLICATE KEY UPDATE
        person_name = VALUES(person_name),
        updated_at = CURRENT_TIMESTAMP()
    ";
    $st = $pdo->prepare($sql);
    $st->execute([':sc' => $shift, ':nm' => $name]);

    // 回傳 updated_at（可選）
    $st2 = $pdo->prepare("SELECT updated_at FROM mat_personnel WHERE shift_code = :sc LIMIT 1");
    $st2->execute([':sc' => $shift]);
    $updatedAt = $st2->fetchColumn();

    json_ok([
      'shift_code' => $shift,
      'person_name' => $name,
      'updated_at' => $updatedAt ?: null
    ]);
  }

  json_error('不支援的 action', 400);

} catch (Throwable $e) {
  json_error($e->getMessage(), 400);
}
