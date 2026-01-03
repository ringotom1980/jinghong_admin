<?php
/**
 * Path: Public/pole_map.php
 * 說明: 公開電桿地圖（不需登入）
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
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>
<body class="public-page pole-map-page">

<?php require __DIR__ . '/partials/public_header.php'; ?>

<main class="pole-map">
  <section class="pole-map__panel">
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
  </section>

  <section class="pole-map__map">
    <div id="map" class="map-canvas" role="application" aria-label="電桿地圖"></div>
  </section>
</main>

<?php require __DIR__ . '/partials/footer.php'; ?>
<?php require __DIR__ . '/partials/scripts.php'; ?>
</body>
</html>
