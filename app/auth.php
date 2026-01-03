<?php
/**
 * Path: app/auth.php
 * 說明: 登入 / 登出 / 權限控制（正式版）
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

function current_user_id(): ?int
{
  return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}

function current_user(): ?array
{
  if (!current_user_id()) return null;

  static $user = null;
  if ($user !== null) return $user;

  $stmt = db()->prepare('SELECT id, username, role FROM users WHERE id = ? AND is_active = 1');
  $stmt->execute([current_user_id()]);
  $user = $stmt->fetch() ?: null;

  return $user;
}

function require_login(): void
{
  if (!current_user_id()) {
    $uri = $_SERVER['REQUEST_URI'] ?? '/';
    header('Location: ' . base_url() . '/login?return=' . rawurlencode($uri));
    exit;
  }
}

function login_user(int $userId): void
{
  session_regenerate_id(true);
  $_SESSION['user_id'] = $userId;
}

function logout_user(): void
{
  $_SESSION = [];
  if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
      $p['path'], $p['domain'], $p['secure'], $p['httponly']
    );
  }
  session_destroy();
}
