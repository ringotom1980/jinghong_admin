<?php
declare(strict_types=1);

if (!isset($pageTitle)) $pageTitle = '境宏公司管理系統';
if (!isset($pageCss)) $pageCss = [];
if (!isset($pageJs))  $pageJs  = [];

// cache busting（用檔案時間戳）
$assetVer = (string)time();
function asset(string $path): string {
  $v = (string)time();
  $full = __DIR__ . '/../' . ltrim($path, '/');
  if (is_file($full)) $v = (string)filemtime($full);
  return '/jinghong_admin/' . ltrim($path, '/') . '?v=' . $v;
}
?>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= htmlspecialchars((string)$pageTitle, ENT_QUOTES) ?></title>

  <link rel="icon" href="<?= asset('assets/img/brand/.gitkeep') ?>" />

  <!-- global -->
  <link rel="stylesheet" href="<?= asset('assets/css/app.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/nav.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/motion.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/ui_toast.css') ?>" />
  <link rel="stylesheet" href="<?= asset('assets/css/ui_modal.css') ?>" />

  <?php foreach ($pageCss as $css): ?>
    <link rel="stylesheet" href="<?= asset((string)$css) ?>" />
  <?php endforeach; ?>
</head>
