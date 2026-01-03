<?php
/**
 * Path: app/db.php
 * 說明: PDO 資料庫連線（正式版）
 */

declare(strict_types=1);

function db(): PDO
{
  static $pdo = null;
  if ($pdo instanceof PDO) {
    return $pdo;
  }

  $host = getenv('DB_HOST');
  $name = getenv('DB_NAME');
  $user = getenv('DB_USER');
  $pass = getenv('DB_PASS');

  if (!$host || !$name || !$user) {
    throw new RuntimeException('Database environment variables not set.');
  }

  $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";

  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
  ]);

  return $pdo;
}
