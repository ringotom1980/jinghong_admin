<?php
/**
 * Path: Public/partials/head.php
 * 說明: 全站 <head> 共用資源載入（定版：可維護、不寫死 BASE）
 * - 統一載入全站 CSS（app/nav/motion/ui_toast/ui_modal）+ 各頁 $pageCss
 * - 統一載入 Font Awesome（CDN）
 * - Base URL：不寫死 /jinghong_admin，優先取常數/環境變數，否則由 SCRIPT_NAME 推導
 * - 提供 asset()：自動 cache busting（filemtime）
 */

declare(strict_types=1);

if (!isset($pageTitle)) $pageTitle = '境宏公司管理系統';
if (!isset($pageCss))   $pageCss   = [];
if (!isset($pageJs))    $pageJs    = [];

/**
 * 取得 BASE_URL（結尾不含 /）
 * 優先順序：
 * 1) 常數 BASE_URL（若你在 app/bootstrap.php 定義）
 * 2) 環境變數 BASE_URL（Apache/Nginx env 或 .env 注入）
 * 3) 由 SCRIPT_NAME 推導：/xxx/Public/index.php -> /xxx
 */
function base_url(): string
{
  // 1) constant
  if (defined('BASE_URL')) {
    $u = (string)constant('BASE_URL');
    return rtrim(trim($u), '/');
  }

  // 2) env
  $env = getenv('BASE_URL');
  if (is_string($env) && trim($env) !== '') {
    return rtrim(trim($env), '/');
  }

  // 3) infer from script name
  $script = $_SERVER['SCRIPT_NAME'] ?? '';
  if (!is_string($script)) $script = '';

  $pos = stripos($script, '/Public/');
  if ($pos !== false) {
    return rtrim(substr($script, 0, $pos), '/');
  }

  return '';
}

/**
 * 產生帶 cache busting 的資源 URL
 * $path：以 Public/ 為根的相對路徑（例：assets/css/app.css）
 */
function asset(string $path): string
{
  $base = base_url();
  $path = ltrim($path, '/');

  $full = __DIR__ . '/../' . $path;
  $v = is_file($full) ? (string)filemtime($full) : (string)time();

  $prefix = ($base !== '') ? $base . '/' : '/';
  $prefix = rtrim($prefix, '/') . '/';

  return $prefix . $path . '?v=' . $v;
}
?>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= htmlspecialchars((string)$pageTitle, ENT_QUOTES) ?></title>

  <!-- favicon（先用品牌圖，未來換 favicon.ico 只改這行） -->
  <link rel="icon" type="image/png" href="<?= asset('assets/img/brand/JH_logo.png') ?>" />

  <!-- Font Awesome（CDN） -->
  <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        referrerpolicy="no-referrer" />

  <!-- global css（全站） -->
  <link rel="stylesheet" href="<?= asset('assets/css/app.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/nav.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/motion.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/ui_toast.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/ui_modal.css') ?>" />

  <!-- per-page css（各頁） -->
  <?php foreach ($pageCss as $css): ?>
    <link rel="stylesheet" href="<?= asset((string)$css) ?>" />
  <?php endforeach; ?>
</head>
