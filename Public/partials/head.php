<?php
/**
 * Path: Public/partials/head.php
 * 說明: 全站 <head> 共用資源載入
 * - 統一載入全站 CSS（app/nav/motion/ui_toast/ui_modal）+ 各頁 $pageCss
 * - 統一載入 Font Awesome（CDN）
 * - favicon 先用品牌圖 JH_logo.png（後續你可改成 favicon.ico）
 */

declare(strict_types=1);

if (!isset($pageTitle)) $pageTitle = '境宏公司管理系統';
if (!isset($pageCss)) $pageCss = [];
if (!isset($pageJs))  $pageJs  = [];

/**
 * 說明：產生帶 cache busting 的資源 URL
 * 注意：你的站點 base 固定 /jinghong_admin（目前先定死）
 */
function asset(string $path): string {
  $base = '/jinghong_admin/';
  $full = __DIR__ . '/../' . ltrim($path, '/');
  $v = is_file($full) ? (string)filemtime($full) : (string)time();
  return $base . ltrim($path, '/') . '?v=' . $v;
}
?>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= htmlspecialchars((string)$pageTitle, ENT_QUOTES) ?></title>

  <!-- favicon：先用品牌圖（可用），你之後若做 favicon.ico 再改這行 -->
  <link rel="icon" type="image/png" href="<?= asset('assets/img/brand/JH_logo.png') ?>" />

  <!-- Font Awesome（CDN）-->
  <link rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        referrerpolicy="no-referrer" />

  <!-- global css -->
  <link rel="stylesheet" href="<?= asset('assets/css/app.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/nav.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/motion.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/ui_toast.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/ui_modal.css') ?>" />

  <!-- per-page css -->
  <?php foreach ($pageCss as $css): ?>
    <link rel="stylesheet" href="<?= asset((string)$css) ?>" />
  <?php endforeach; ?>
</head>
