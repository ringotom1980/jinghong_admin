<?php
/**
 * Path: app/bootstrap.php
 * 說明: 全站核心啟動檔（正式版）
 * - session
 * - timezone
 * - error handling（prod / dev）
 * - BASE_URL（可由 env 或自動推導）
 */

declare(strict_types=1);

// 時區
date_default_timezone_set('Asia/Taipei');

// Session（一定要最早）
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

// 基本錯誤模式（可依 APP_ENV 調整）
$env = getenv('APP_ENV') ?: 'production';
if ($env === 'development') {
  ini_set('display_errors', '1');
  error_reporting(E_ALL);
} else {
  ini_set('display_errors', '0');
  error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
}

// BASE_URL（不強制寫死）
if (!defined('BASE_URL')) {
  $base = getenv('BASE_URL');
  if (is_string($base) && trim($base) !== '') {
    define('BASE_URL', rtrim($base, '/'));
  }
}
