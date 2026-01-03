<?php
/**
 * Path: Public/api/auth/login.php
 * 說明: 登入 API（帳號 + 密碼）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method Not Allowed', 405);
}

$username = trim($_POST['username'] ?? '');
$password = trim($_POST['password'] ?? '');

if ($username === '' || $password === '') {
  json_error('帳號或密碼未填');
}

$stmt = db()->prepare(
  'SELECT id, password_hash FROM users WHERE username = ? AND is_active = 1 LIMIT 1'
);
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
  json_error('帳號或密碼錯誤', 401);
}

login_user((int)$user['id']);
json_ok(['user_id' => (int)$user['id']]);
