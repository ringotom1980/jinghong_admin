<?php
declare(strict_types=1);

// 專案根目錄
define('BASE_PATH', dirname(__DIR__));

// 基本路徑解析（去掉 /jinghong_admin）
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = str_replace('/jinghong_admin', '', $uri);
$uri = rtrim($uri, '/');
$uri = $uri === '' ? '/' : $uri;

// 路由對應表（先放最小集合）
$routes = [
    '/'              => 'login.php',
    '/login'         => 'login.php',
    '/dashboard'     => 'dashboard.php',
    '/me/password'   => 'me_password.php',
    '/pole-map'      => 'pole_map.php',
];

// 找對應頁面
if (isset($routes[$uri])) {
    require __DIR__ . '/' . $routes[$uri];
    exit;
}

// 404（暫時簡單處理）
http_response_code(404);
echo '404 Not Found';
