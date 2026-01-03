<?php
/**
 * Path: Public/partials/scripts.php
 * 說明: 全站 JS 統一載入（定版：集中管理、避免散落/寫死 base）
 * - 請放在 </body> 前
 * - 載入順序：
 *   1) 全站共用：api / ui_toast / ui_modal / nav
 *   2) 各頁 $pageJs（只放該頁專屬，例如 dashboard.js、login.js）
 * - 使用 asset() 做 cache busting
 */

declare(strict_types=1);

if (!isset($pageJs)) $pageJs = [];

// 全站共用 JS（固定）
$globalJs = [
  'assets/js/api.js',
  'assets/js/ui_toast.js',
  'assets/js/ui_modal.js',
  'assets/js/nav.js',
  'assets/js/auth_me.js',
];

// 合併去重（避免頁面又塞一次 nav.js）
$all = array_values(array_unique(array_merge($globalJs, array_map('strval', $pageJs))));

foreach ($all as $js) {
  $src = (string)$js;

  // 外部 CDN：不走 asset()
  if (preg_match('#^https?://#i', $src)) {
    echo '<script src="' . htmlspecialchars($src, ENT_QUOTES) . '" defer></script>' . PHP_EOL;
    continue;
  }

  echo '<script src="' . htmlspecialchars(asset($src), ENT_QUOTES) . '" defer></script>' . PHP_EOL;
}
