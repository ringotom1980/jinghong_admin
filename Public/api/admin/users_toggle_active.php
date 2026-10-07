<?php
/**
 * Path: Public/api/admin/users_toggle_active.php
 * 說明: ADMIN 切換使用者啟用/停用（不可停用自己）
 * body: { id }
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
if ($id <= 0) json_error('缺少 id', 400);
if ($id === (int)$uid) json_error('不可停用自己', 400);

$st = $pdo->prepare('SELECT is_active FROM users WHERE id = ? LIMIT 1');
$st->execute([$id]);
$row = $st->fetch();
if (!$row) json_error('使用者不存在', 404);

$new = ((int)$row['is_active'] === 1) ? 0 : 1;
$st = $pdo->prepare('UPDATE users SET is_active = ? WHERE id = ? LIMIT 1');
$st->execute([$new, $id]);

json_ok(['id' => $id, 'is_active' => $new]);
