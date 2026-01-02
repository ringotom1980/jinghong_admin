<?php
/**
 * Path: Public/index.php
 * 說明: Router（漂亮網址入口）
 * - 不寫死 /jinghong_admin
 * - 由 SCRIPT_NAME 推導 base（/xxx/Public/index.php -> /xxx）
 * - 將 REQUEST_URI 去掉 base 後，做路由表對應
 */

declare(strict_types=1);

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

/** 路由對應表（先最小集合） */
$routes = [
  '/'            => 'login.php',
  '/login'       => 'login.php',
  '/dashboard'   => 'dashboard.php',
  '/me/password' => 'me_password.php',
  '/pole-map'    => 'pole_map.php',
];

/** 命中頁面 */
if (isset($routes[$uri])) {
  require PUBLIC_PATH . '/' . $routes[$uri];
  exit;
}

http_response_code(404);
echo '404 Not Found';
