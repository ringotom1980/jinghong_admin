<?php
/**
 * Path: Public/index.php
 * 說明: Router（漂亮網址入口）
 * - 不寫死 /jinghong_admin
 * - 由 SCRIPT_NAME 推導 base（/xxx/Public/index.php -> /xxx）
 * - Router 只做「路徑 → 檔案」，不做登入判斷
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

// 專案 Public 根
define('PUBLIC_PATH', __DIR__);

/** 推導 base（/jinghong_admin/Public/index.php -> /jinghong_admin） */
$script = $_SERVER['SCRIPT_NAME'] ?? '';
$base = '';
if (is_string($script)) {
  $pos = stripos($script, '/Public/');
  if ($pos !== false) $base = rtrim(substr($script, 0, $pos), '/');
}

/** 取得 URI path */
$uri = parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$uri = is_string($uri) ? $uri : '/';

/** 去掉 base 前綴 */
if ($base !== '' && strpos($uri, $base) === 0) {
  $uri = substr($uri, strlen($base));
}
$uri = rtrim($uri, '/');
$uri = ($uri === '') ? '/' : $uri;

/** 明確頁面路由（最小集合） */
$routes = [
  '/'            => 'login.php',
  '/login'       => 'login.php',
  '/logout'      => 'logout.php',
  '/dashboard'   => 'dashboard.php',
  '/me/password' => 'me_password.php',
  '/pole-map'    => 'pole_map.php', // 公開頁
];

/** 命中明確頁面 */
if (isset($routes[$uri])) {
  require PUBLIC_PATH . '/' . $routes[$uri];
  exit;
}

/**
 * 動態映射：/api/* -> Public/api/*
 * 例：/api/auth/login -> Public/api/auth/login.php
 */
if (strpos($uri, '/api/') === 0) {
  $sub = substr($uri, 5); // remove "/api/"
  $target = PUBLIC_PATH . '/api/' . $sub . '.php';
  if (is_file($target)) {
    require $target;
    exit;
  }
}

/**
 * 動態映射：/mat/* /car/* /equ/* -> Public/modules/*
 * 例：/mat/issue -> Public/modules/mat/issue.php
 */
if (preg_match('#^/(mat|car|equ)/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
  $mod = $m[1];
  $page = $m[2];
  $target = PUBLIC_PATH . '/modules/' . $mod . '/' . $page . '.php';
  if (is_file($target)) {
    require $target;
    exit;
  }
}

/** admin */
if (preg_match('#^/admin(?:/([a-zA-Z0-9_-]+))?$#', $uri, $m)) {
  $page = isset($m[1]) && $m[1] !== '' ? $m[1] : 'index';
  $target = PUBLIC_PATH . '/admin/' . $page . '.php';
  if (is_file($target)) {
    require $target;
    exit;
  }
}

http_response_code(404);
echo '404 Not Found';
