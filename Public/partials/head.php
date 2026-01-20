<?php

/**
 * Path: Public/partials/head.php
 * 說明: 全站 <head> 共用資源載入
 * - 提供 window.BASE_URL 給前端組 API URL（避免部署在 /jinghong_admin 時打到站台根 /api）
 */

declare(strict_types=1);

if (!isset($pageTitle)) $pageTitle = '境宏工程有限公司管理系統';
if (!isset($pageCss))   $pageCss   = [];
if (!isset($pageJs))    $pageJs    = [];

/**
 * 產生帶 cache busting 的資源 URL
 */
function asset(string $path): string
{
  $base = base_url();
  $path = ltrim($path, '/');

  $full = __DIR__ . '/../' . $path;
  $v = is_file($full) ? (string)filemtime($full) : (string)time();

  $prefix = ($base !== '') ? rtrim($base, '/') . '/' : '/';
  return $prefix . $path . '?v=' . $v;
}
?>

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title><?= htmlspecialchars((string)$pageTitle, ENT_QUOTES) ?></title>
    <?php
    $ogTitle = (string)$pageTitle;
    $ogDesc  = '境宏工程有限公司內部管理與作業系統';
    $ogUrl   = 'https://jinghong.pw' . (base_url() ?: '/');
    $ogImg   = 'https://jinghong.pw' . asset('assets/img/brand/JH_logo.png');
  ?>

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="境宏工程有限公司" />
  <meta property="og:title" content="<?= htmlspecialchars($ogTitle, ENT_QUOTES) ?>" />
  <meta property="og:description" content="<?= htmlspecialchars($ogDesc, ENT_QUOTES) ?>" />
  <meta property="og:url" content="<?= htmlspecialchars($ogUrl, ENT_QUOTES) ?>" />
  <meta property="og:image" content="<?= htmlspecialchars($ogImg, ENT_QUOTES) ?>" />

  <!-- Twitter / X（LINE 通常不看，但建議一併補） -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="<?= htmlspecialchars($ogTitle, ENT_QUOTES) ?>" />
  <meta name="twitter:description" content="<?= htmlspecialchars($ogDesc, ENT_QUOTES) ?>" />
  <meta name="twitter:image" content="<?= htmlspecialchars($ogImg, ENT_QUOTES) ?>" />

  <!-- 提供前端使用：API / 連結 base（例：/jinghong_admin 或空字串） -->
  <script>
    window.BASE_URL = "<?= htmlspecialchars(base_url(), ENT_QUOTES) ?>";
  </script>

  <link rel="icon" type="image/png" href="<?= asset('assets/img/brand/JH_logo.png') ?>" />

  <link rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
    referrerpolicy="no-referrer" />

  <link rel="stylesheet" href="<?= asset('assets/css/app.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/nav.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/motion.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/ui_toast.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/ui_modal.css') ?>" />

  <?php foreach ($pageCss as $css): ?>
    <?php $href = (string)$css; ?>
    <?php if (preg_match('#^https?://#i', $href)): ?>
      <link rel="stylesheet" href="<?= htmlspecialchars($href, ENT_QUOTES) ?>" />
    <?php else: ?>
      <link rel="stylesheet" href="<?= asset($href) ?>" />
    <?php endif; ?>
  <?php endforeach; ?>

</head>