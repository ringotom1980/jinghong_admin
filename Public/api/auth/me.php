<?php
require_once __DIR__ . '/../../../app/bootstrap.php';
require_once __DIR__ . '/../../../app/auth.php';
require_once __DIR__ . '/../../../app/response.php';

$user = current_user();
if (!$user) {
  json_error('未登入', 401);
}

json_ok($user);
