<?php
/**
 * Path: Public/api/admin/users_list.php
 * 說明: ADMIN 取得使用者清單
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

$st = $pdo->query('SELECT id, username, name, role, is_active FROM users ORDER BY id ASC');
$users = $st->fetchAll();

json_ok(['users' => $users]);
