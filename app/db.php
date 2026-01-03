<?php
/**
 * Path: app/db.php
 * 說明: PDO 資料庫連線（utf8mb4_unicode_ci）
 */

declare(strict_types=1);

function db(): PDO
{
  static $pdo;
  if ($pdo instanceof PDO) {
    return $pdo;
  }

  $dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    getenv('DB_HOST'),
    getenv('DB_PORT') ?: 3306,
    getenv('DB_NAME')
  );

  $pdo = new PDO(
    $dsn,
    getenv('DB_USER'),
    getenv('DB_PASS'),
    [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]
  );

  return $pdo;
}
