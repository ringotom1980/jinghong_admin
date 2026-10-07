<?php
/**
 * Path: Public/api/auth/change_password.php
 * 說明: 目前登入者改自己的密碼
 * body: { old_password, new_password }
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$uid = current_user_id();
if (!$uid) json_error('未登入', 401);

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) json_error('body 格式錯誤', 400);

$old = (string)($body['old_password'] ?? '');
$new = (string)($body['new_password'] ?? '');

if ($old === '' || $new === '') json_error('缺少密碼欄位', 400);
if (strlen($new) < 8) json_error('新密碼至少 8 碼', 400);

$pdo = db();
$st = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
$st->execute([$uid]);
$row = $st->fetch();
if (!$row) json_error('使用者不存在', 404);

$hash = (string)($row['password_hash'] ?? '');
if (!password_verify($old, $hash)) json_error('目前密碼錯誤', 400);

$newHash = password_hash($new, PASSWORD_DEFAULT);
$st = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1');
$st->execute([$newHash, $uid]);

json_ok(['ok' => 1]);
