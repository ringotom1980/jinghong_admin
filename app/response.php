<?php
/**
 * Path: app/response.php
 * 說明: API 統一 JSON 回應格式
 */

declare(strict_types=1);

function json_ok($data = null): void
{
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([
    'success' => true,
    'data'    => $data,
    'error'   => null,
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
    'error'   => $message,
  ], JSON_UNESCAPED_UNICODE);
  exit;
}
