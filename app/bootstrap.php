<?php
/**
 * Path: app/bootstrap.php
 * 說明: 全站初始化（env / session / 共用函式）
 */

declare(strict_types=1);

/* ========= 載入 .env（簡單版） ========= */
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

/* ========= Session ========= */
session_name(getenv('SESSION_NAME') ?: 'jinghong_admin_session');
session_set_cookie_params([
    'lifetime' => (int)(getenv('SESSION_LIFETIME') ?: 7200),
    'path'     => '/',
    'secure'   => !empty($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

/* ========= BASE_URL（全站唯一來源） ========= */
/**
 * 取得 BASE_URL（結尾不含 /）
 * 例：https://jinghong.pw/jinghong_admin → /jinghong_admin
 */
function base_url(): string
{
    // 1) 常數 BASE_URL
    if (defined('BASE_URL')) {
        return rtrim((string)constant('BASE_URL'), '/');
    }

    // 2) 環境變數 BASE_URL
    $env = getenv('BASE_URL');
    if (is_string($env) && trim($env) !== '') {
        return rtrim($env, '/');
    }

    // 3) 由 SCRIPT_NAME 推導（/xxx/Public/index.php → /xxx）
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    if (is_string($script)) {
        $pos = stripos($script, '/Public/');
        if ($pos !== false) {
            return rtrim(substr($script, 0, $pos), '/');
        }
    }

    return '';
}

/* ========= 共用模組 ========= */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once dirname(__DIR__) . '/vendor/autoload.php';
require_once __DIR__ . '/auth.php';
