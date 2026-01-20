<?php
/**
 * Path: Public/api/admin/users_save.php
 * 說明: ADMIN 新增/更新使用者（含改姓名、帳號、角色、啟用/停用；可選擇同步設定新密碼）
 * body: { id, name, username, role, is_active, new_password? }
 * - id=0：新增（new_password 若空，回 400）
 * - id>0：更新（new_password 可空；不空才更新密碼）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$uid = current_user_id();
$pdo = db();

// ADMIN gate
$st = $pdo->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
$st->execute([$uid]);
$me = $st->fetch();
if (!$me || ($me['role'] ?? '') !== 'ADMIN') json_error('無權限', 403);

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) json_error('body 格式錯誤', 400);

$id = (int)($body['id'] ?? 0);
$name = trim((string)($body['name'] ?? ''));
$username = trim((string)($body['username'] ?? ''));
$role = strtoupper(trim((string)($body['role'] ?? 'STAFF')));
$isActive = (int)($body['is_active'] ?? 1);
$newPwd = (string)($body['new_password'] ?? '');

if ($name === '' || $username === '') json_error('姓名與帳號不可為空', 400);
if (mb_strlen($name) > 100) json_error('姓名過長', 400);
if (mb_strlen($username) > 100) json_error('帳號過長', 400);
if ($role !== 'ADMIN' && $role !== 'STAFF') json_error('角色不合法', 400);
if ($isActive !== 0 && $isActive !== 1) json_error('is_active 不合法', 400);

if ($id === 0 && strlen($newPwd) < 8) json_error('新增使用者需設定至少 8 碼密碼', 400);

if ($id > 0 && $id === (int)$uid && $isActive === 0) json_error('不可停用自己', 400);

// username unique (excluding id)
$st = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
$st->execute([$username, $id]);
if ($st->fetch()) json_error('此帳號已被使用', 409);

if ($id === 0) {
  $hash = password_hash($newPwd, PASSWORD_DEFAULT);
  $st = $pdo->prepare('INSERT INTO users (username, password_hash, name, role, is_active) VALUES (?,?,?,?,?)');
  $st->execute([$username, $hash, $name, $role, $isActive]);
  $newId = (int)$pdo->lastInsertId();
  json_ok(['id' => $newId, 'created' => 1]);
}

// update
$pdo->beginTransaction();
try {
  $st = $pdo->prepare('UPDATE users SET username=?, name=?, role=?, is_active=? WHERE id=? LIMIT 1');
  $st->execute([$username, $name, $role, $isActive, $id]);

  if (strlen($newPwd) > 0) {
    if (strlen($newPwd) < 8) json_error('新密碼至少 8 碼', 400);
    $hash = password_hash($newPwd, PASSWORD_DEFAULT);
    $st = $pdo->prepare('UPDATE users SET password_hash=? WHERE id=? LIMIT 1');
    $st->execute([$hash, $id]);
  }

  $pdo->commit();
  json_ok(['id' => $id, 'updated' => 1]);
} catch (Throwable $e) {
  $pdo->rollBack();
  json_error($e->getMessage(), 500);
}
