<?php
/**
 * Path: app/bootstrap.php
 * 說明: 全站初始化（env / session / 共用函式）
 */

declare(strict_types=1);

/* 載入 .env（簡單版，避免外部套件） */
$envFile = dirname(__DIR__) . '/.env';
if (is_file($envFile)) {
  foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if ($line[0] === '#' || !str_contains($line, '=')) continue;
    [$k, $v] = explode('=', $line, 2);
    $v = trim($v);
    if (($v[0] ?? '') === '"' && str_ends_with($v, '"')) {
      $v = substr($v, 1, -1);
    }
    putenv(trim($k) . '=' . $v);
  }
}

/* Session */
session_name(getenv('SESSION_NAME') ?: 'jinghong_admin_session');
session_set_cookie_params([
  'lifetime' => (int)(getenv('SESSION_LIFETIME') ?: 7200),
  'path'     => '/',
  'secure'   => isset($_SERVER['HTTPS']),
  'httponly' => true,
  'samesite' => 'Lax',
]);
session_start();

/* 共用模組 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/response.php';
