<?php
require_once __DIR__ . '/../../../app/bootstrap.php';
require_once __DIR__ . '/../../../app/auth.php';
require_once __DIR__ . '/../../../app/response.php';

$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

if ($username === '' || $password === '') {
  json_error('請輸入帳號與密碼');
}

$stmt = db()->prepare('SELECT id, password_hash FROM users WHERE username = ? AND is_active = 1');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
  json_error('帳號或密碼錯誤', 401);
}

login_user((int)$user['id']);
json_ok();
