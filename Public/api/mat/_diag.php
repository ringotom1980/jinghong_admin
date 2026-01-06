<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

header('Content-Type: application/json; charset=utf-8');

$svc = __DIR__ . '/../../../app/services/mat/MatIssueService.php';

$out = [
  'ok' => true,
  'php' => PHP_VERSION,
  'service_file' => $svc,
  'service_exists' => is_file($svc),
  'service_mtime' => is_file($svc) ? date('c', filemtime($svc)) : null,
  'service_size' => is_file($svc) ? filesize($svc) : null,
  'step' => 'before_require_service',
];

echo json_encode($out, JSON_UNESCAPED_UNICODE);

// 再往下測 require（若這一步 fatal，代表 MatIssueService/其 require 鏈有問題）
require_once $svc;

echo "\n";
echo json_encode([
  'step' => 'after_require_service',
], JSON_UNESCAPED_UNICODE);
