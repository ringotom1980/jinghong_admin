<?php
/**
 * Path: Public/logout.php
 * 說明: 登出（清 Session → 回登入頁）
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/auth.php';

logout_user();
header('Location: ' . base_url() . '/login');
exit;
