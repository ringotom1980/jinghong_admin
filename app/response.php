<?php
/**
 * Path: app/response.php
 * 說明: API JSON 回應工具（正式版）
 */

declare(strict_types=1);

function json_ok($data = null, int $code = 200): void
{
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([
    'success' => true,
    'data'    => $data,
    'error'   => null
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

function json_error(string $message, int $code = 400): void
{
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([
    'success' => false,
    'data'    => null,
    'error'   => $message
  ], JSON_UNESCAPED_UNICODE);
  exit;
}
