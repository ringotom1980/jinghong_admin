<?php
/**
 * Path: app/auth.php
 * 說明: Session 驗證與登入狀態管理
 */

declare(strict_types=1);

function current_user_id(): ?int
{
  return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}

function require_login(): void
{
  if (!current_user_id()) {
    http_response_code(401);
    echo 'Unauthorized';
    exit;
  }
}

function login_user(int $userId): void
{
  $_SESSION['user_id'] = $userId;
}

function logout_user(): void
{
  $_SESSION = [];

  if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
      session_name(),
      '',
      time() - 42000,
      $params['path'],
      $params['domain'],
      $params['secure'],
      $params['httponly']
    );
  }

  session_destroy();
}
