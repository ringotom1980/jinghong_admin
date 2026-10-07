<?php
/**
 * Path: Public/me_password.php
 * 說明: 舊入口相容：導向到 /me/account 的改密碼分頁
 */
declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_login();

header('Location: ' . rtrim(base_url(), '/') . '/me/account');
exit;
