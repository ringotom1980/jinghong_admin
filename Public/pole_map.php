<?php
/**
 * Path: Public/pole_map.php
 * 說明: 電桿地圖（公開 URL）
 * - 未登入：不顯示上導覽列（public_header 不用），改用「頁內搜尋列」：左品牌+登入／中搜尋／右導航
 * - 已登入：管理殼（header + sidebar + footer 都在）
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$pageTitle = '電桿地圖｜境宏工程有限公司';

// 注意：head.php 會對 $pageCss/$pageJs 用 asset() 做版本號
$pageCss   = [
  'assets/css/pole_map.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

$pageJs    = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'assets/js/pole_map.js',
];

$isAuthed = function_exists('current_user_id') && current_user_id();

// URL（不要寫死 /jinghong_admin）
$base = base_url();
$base = is_string($base) ? rtrim($base, '/') : '';
$loginUrl = ($base !== '' ? $base : '') . '/login';
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>
<body class="<?= $isAuthed ? 'app-page pole-map-page' : 'public-page pole-map-page' ?>">

<?php if ($isAuthed): ?>
  <?php require __DIR__ . '/partials/header.php'; ?>
  <?php require __DIR__ . '/partials/sidebar.php'; ?>
  <div class="page">
<?php else: ?>
  <?php /* 公開電桿地圖：不顯示上導覽列，改用頁內搜尋列 */ ?>
<?php endif; ?>

<main class="pole-map">
  <section class="pole-map__panel">

    <!-- ✅ 公開地圖：一條搜尋列（左品牌/登入、中搜尋、右導航） -->
    <?php if (!$isAuthed): ?>
      <div class="pole-top card card--flat">
        <div class="pole-top__left">
          <div class="pole-brand">
            <img class="pole-brand__logo"
                 src="<?= asset('assets/img/brand/JH_logo.png') ?>"
                 alt="境宏工程有限公司"
                 width="28" height="28" />
            <span class="pole-brand__text">境宏工程有限公司</span>
          </div>

          <a class="btn btn--secondary pole-top__login"
             href="<?= htmlspecialchars($loginUrl, ENT_QUOTES) ?>">
            <i class="fa-solid fa-right-to-bracket"></i>
            登入管理系統
          </a>
        </div>

        <div class="pole-top__center">
          <div class="pole-search card card--flat">
            <div class="pole-search__left" aria-hidden="true">
              <i class="fa-solid fa-magnifying-glass"></i>
            </div>

            <input
              id="poleSearchInput"
              type="search"
              placeholder="輸入圖號座標 / 桿號（例：K7694）"
              autocomplete="off"
              spellcheck="false"
            />

            <button id="poleSearchClear" class="btn btn--ghost pole-search__clear" type="button" aria-label="清除">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div id="poleSuggestWrap" class="pole-suggest card" hidden>
            <ul id="poleSuggestList" class="pole-suggest__list" role="listbox" aria-label="搜尋建議"></ul>
          </div>
        </div>

        <div class="pole-top__right">
          <button id="poleNavBtn" class="btn btn--info" type="button" disabled>
            <i class="fa-solid fa-location-arrow"></i>
            用Google導航
          </button>
        </div>
      </div>

      <div id="polePickedInfo" class="pole-picked" aria-live="polite"></div>

    <?php else: ?>
      <!-- ✅ 已登入（管理殼）：沿用原本版型（搜尋＋建議＋導航） -->
      <div class="pole-search card card--flat">
        <div class="pole-search__left" aria-hidden="true">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>

        <input
          id="poleSearchInput"
          type="search"
          placeholder="輸入圖號座標 / 桿號（例：K7694）"
          autocomplete="off"
          spellcheck="false"
        />

        <button id="poleSearchClear" class="btn btn--ghost pole-search__clear" type="button" aria-label="清除">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div id="poleSuggestWrap" class="pole-suggest card" hidden>
        <ul id="poleSuggestList" class="pole-suggest__list" role="listbox" aria-label="搜尋建議"></ul>
      </div>

      <div class="pole-actions">
        <button id="poleNavBtn" class="btn btn--info" type="button" disabled>
          <i class="fa-solid fa-location-arrow"></i>
          導航
        </button>

        <div id="polePickedInfo" class="pole-picked" aria-live="polite"></div>
      </div>
    <?php endif; ?>

  </section>

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
