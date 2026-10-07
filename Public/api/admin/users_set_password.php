<?php
/**
 * Path: Public/api/admin/users_set_password.php
 * 說明: ADMIN 直接重設指定使用者密碼（含 STAFF/ADMIN，但建議只用在一般使用者）
 * body: { id, new_password }
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
$new = (string)($body['new_password'] ?? '');

if ($id <= 0) json_error('缺少 id', 400);
if (strlen($new) < 8) json_error('新密碼至少 8 碼', 400);

$newHash = password_hash($new, PASSWORD_DEFAULT);

$st = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1');
$st->execute([$newHash, $id]);

json_ok(['id' => $id, 'ok' => 1]);
