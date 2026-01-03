<?php

/**
 * Path: app/auth.php
 * 說明: 身分驗證與登入狀態工具
 * - current_user_id(): 取得目前登入者 ID
 * - require_login(): 未登入自動導向 /login（頁面）或回 401（API）
 * - login_user() / logout_user(): Session 控制
 */

declare(strict_types=1);

/**
 * 取得目前登入者 ID
 */
function current_user_id(): ?int
{
    return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}

/**
 * 要求必須登入
 * - 頁面：導向 /login?return=原路徑
 * - API：回傳 JSON 401
 */
function require_login(): void
{
    if (current_user_id()) {
        return;
    }

    $uri = parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';

    // API 請求 → JSON
    if (strpos($uri, '/api/') === 0) {
        json_error('未登入', 401);
    }

    // 頁面請求 → redirect（需帶上 base，避免 /jinghong_admin 部署時導到站台根 /login）
    $base = function_exists('base_url') ? base_url() : '';
    $loginPath = rtrim($base, '/') . '/login';

    // 避免已在 /login 又被加 return 造成混亂
    $return = ($uri !== '/login' && $uri !== rtrim($base, '/') . '/login')
        ? '?return=' . rawurlencode($uri)
        : '';

    header('Location: ' . $loginPath . $return);
    exit;
}

/**
 * 登入：寫入 Session
 */
function login_user(int $userId): void
{
    $_SESSION['user_id'] = $userId;
}

/**
 * 登出：清除 Session
 */
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
