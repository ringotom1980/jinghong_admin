<?php
declare(strict_types=1);

require_once __DIR__ . '/../../app/bootstrap.php';

json_ok([
  'ok' => true,
  'where' => 'after_bootstrap',
  'php' => PHP_VERSION,
  'user_id' => current_user_id(),
]);
