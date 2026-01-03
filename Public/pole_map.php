<?php
/**
 * Path: Public/pole_map.php
 * 說明: 電桿地圖（公開 URL）
 * - 未登入：不要上導覽列/側導覽；改用頁內「浮動搜尋列」
 * - 已登入：維持管理殼（header + sidebar + footer）
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$pageTitle = '電桿地圖｜境宏工程有限公司';

// 注意：head.php 會對本機資源做版本號；外部 URL 不做
$pageCss = [
  'assets/css/pole_map.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

$pageJs = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'assets/js/pole_map.js',
];

$isAuthed = function_exists('current_user_id') && current_user_id();

// base url
$base = base_url();
$base = is_string($base) ? rtrim($base, '/') : '';
$loginUrl = ($base !== '' ? $base : '') . '/login';
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>
<body class="<?= $isAuthed ? 'app-page pole-map-page' : 'public-page pole-map-page pole-map--public' ?>">

<?php if ($isAuthed): ?>
  <?php require __DIR__ . '/partials/header.php'; ?>
  <?php require __DIR__ . '/partials/sidebar.php'; ?>
  <div class="page">
<?php endif; ?>

<!-- 公開模式：不要 topbar；用浮動工具列 -->
<?php if (!$isAuthed): ?>
  <div class="polebar" role="banner" aria-label="電桿地圖工具列">
    <div class="polebar__left">
      <div class="polebar__brand" aria-label="境宏工程有限公司">
        <img class="polebar__logo" src="<?= asset('assets/img/brand/JH_logo.png') ?>" alt="境宏" width="28" height="28" />
        <span class="polebar__name">境宏工程有限公司</span>
      </div>

      <a class="btn btn--secondary polebar__login" href="<?= htmlspecialchars($loginUrl, ENT_QUOTES) ?>">
        <i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>
        登入管理系統
      </a>
    </div>

    <div class="polebar__center">
      <div class="pole-search">
        <div class="pole-search__left" aria-hidden="true">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>

        <input
          id="poleSearchInput"
          class="pole-search__input"
          type="search"
          placeholder="輸入圖號座標 / 桿號（例：K7694）"
          autocomplete="off"
          spellcheck="false"
        />

        <button id="poleSearchClear" class="btn btn--ghost pole-search__clear" type="button" aria-label="清除">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- 建議清單：overlay（不擠壓地圖） -->
        <div id="poleSuggestWrap" class="pole-suggest" hidden>
          <ul id="poleSuggestList" class="pole-suggest__list" role="listbox" aria-label="搜尋建議"></ul>
        </div>
      </div>

      <div id="polePickedInfo" class="pole-picked" aria-live="polite"></div>
    </div>

    <div class="polebar__right">
      <button id="poleNavBtn" class="btn btn--info polebar__nav" type="button" hidden>
        <i class="fa-solid fa-location-arrow" aria-hidden="true"></i>
        用 Google 導航
      </button>
    </div>
  </div>
<?php endif; ?>

<main class="pole-map">
  <section class="pole-map__map">
    <div id="map" class="map-canvas" role="application" aria-label="電桿地圖"></div>
  </section>
</main>

<?php require __DIR__ . '/partials/footer.php'; ?>

<?php if ($isAuthed): ?>
  </div><!-- /.page -->
<?php endif; ?>

<?php require __DIR__ . '/partials/scripts.php'; ?>
</body>
</html>
