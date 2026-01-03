<?php
/**
 * Path: Public/api/auth/me.php
 * 說明: 取得目前登入使用者
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';

$uid = current_user_id();
if (!$uid) {
  json_error('未登入', 401);
}

$stmt = db()->prepare(
  'SELECT id, username, display_name FROM users WHERE id = ? LIMIT 1'
);
$stmt->execute([$uid]);
$user = $stmt->fetch();

json_ok($user);
