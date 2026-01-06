<?php

/**
 * Path: app/auth.php
 * 說明: 身分驗證與登入狀態工具
 * - current_user_id()
 * - require_login()
 * - login_user() / logout_user()
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
 * - API：JSON 401
 * - Page：redirect 到 {BASE_URL}/login?return=原路徑
 */
function require_login(): void
{
    if (current_user_id()) {
        return;
    }

    $uri = parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';

    // API：支援 /api/* 以及 {BASE_URL}/api/*
    $base = base_url();                // 例：/jinghong_admin（或空字串）
    $apiPrefix = rtrim($base, '/') . '/api/'; // 例：/jinghong_admin/api/

    if (str_starts_with($uri, '/api/') || ($base !== '' && str_starts_with($uri, $apiPrefix))) {
        json_error('未登入', 401);
    }

    // Page
    // Page
    $loginPath = rtrim($base, '/') . '/login';

    $return = ($uri !== '/login')
        ? '?return=' . rawurlencode($uri)
        : '';

    header('Location: ' . $loginPath . $return);
    exit;
}

/**
 * 登入
 */
function login_user(int $userId): void
{
    $_SESSION['user_id'] = $userId;
}

/**
 * 登出
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
