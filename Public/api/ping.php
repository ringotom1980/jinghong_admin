<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

echo json_encode([
  'ok' => true,
  'where' => 'before_bootstrap',
  'php' => PHP_VERSION,
  'time' => date('c'),
], JSON_UNESCAPED_UNICODE);
