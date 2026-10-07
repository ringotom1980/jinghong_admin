<?php
/**
 * Path: Public/api/auth/logout.php
 * 說明: 登出 API
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';

logout_user();
json_ok(true);
