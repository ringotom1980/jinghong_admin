<?php
/**
 * Path: Public/api/me/account_update.php
 * 說明: 一般使用者更新自己的 name / username
 * body: { name, username }
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$uid = current_user_id();
if (!$uid) json_error('未登入', 401);

$body = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($body)) json_error('body 格式錯誤', 400);

$name = trim((string)($body['name'] ?? ''));
$username = trim((string)($body['username'] ?? ''));

if ($name === '' || $username === '') json_error('姓名與帳號不可為空', 400);
if (mb_strlen($name) > 100) json_error('姓名過長', 400);
if (mb_strlen($username) > 100) json_error('帳號過長', 400);

$pdo = db();

// username 不可被別人使用
$st = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1');
$st->execute([$username, $uid]);
if ($st->fetch()) json_error('此帳號已被使用', 409);

$st = $pdo->prepare('UPDATE users SET name = ?, username = ? WHERE id = ? LIMIT 1');
$st->execute([$name, $username, $uid]);

json_ok(['id' => $uid, 'name' => $name, 'username' => $username]);
