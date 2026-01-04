<?php

/**
 * Path: Public/pole_map.php
 * 說明: 電桿地圖（公開 URL）
 * - 未登入：純地圖 + 頂部浮動工具列（無 topbar/sidebar/footer）
 * - 已登入：沿用管理殼（header + sidebar + footer），頁面主體仍是地圖
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$pageTitle = '電桿地圖｜境宏工程有限公司';

$pageCss = [
    'assets/css/pole_map.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

$pageJs = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'assets/js/pole_map.js',
];

$isAuthed = function_exists('current_user_id') && current_user_id();
$base = function_exists('base_url') ? (string)base_url() : '';
$u = function (string $path) use ($base): string {
    $b = rtrim($base, '/');
    $p = '/' . ltrim($path, '/');
    return ($b !== '' ? $b : '') . $p;
};
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>

<body class="<?= $isAuthed ? 'app-page pole-map-page' : 'public-page pole-map-page' ?>">

    <?php if ($isAuthed): ?>
        <?php require __DIR__ . '/partials/header.php'; ?>
        <?php require __DIR__ . '/partials/sidebar.php'; ?>
        <div class="page">
        <?php endif; ?>

        <!-- 公開版：頂部浮動工具列（不要白底大面板、不要 topbar/footer） -->
        <!-- 工具列：登入/未登入都要（差別只在左下品牌/登入是否顯示） -->
        <div class="pole-top" role="banner" aria-label="電桿地圖工具列">
            <!-- Left: 底部 Dock（未登入才顯示品牌+登入；導覽鍵兩種狀態都保留） -->
            <div class="pole-top__left">
                <?php if (!$isAuthed): ?>
                    <div class="pole-brand" aria-label="境宏工程有限公司">
                        <img class="pole-brand__logo" src="<?= asset('assets/img/brand/JH_logo.png') ?>" alt="境宏" width="28" height="28" />
                        <span class="pole-brand__text">境宏工程有限公司</span>
                    </div>

                    <a class="pole-login btn btn--secondary" href="<?= htmlspecialchars($u('/login'), ENT_QUOTES) ?>">
                        <i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>
                        登入管理系統
                    </a>
                <?php endif; ?>

                <button id="poleNavBtn" class="btn btn--info pole-nav" type="button" hidden>
                    <i class="fa-solid fa-location-arrow" aria-hidden="true"></i>
                    用 Google 導航
                </button>
            </div>

            <!-- Center: Search（登入/未登入都要） -->
            <div class="pole-top__center" aria-label="搜尋">
                <div class="pole-search" role="search">
                    <div class="pole-search__icon" aria-hidden="true">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </div>

                    <input
                        id="poleSearchInput"
                        class="pole-search__input"
                        type="search"
                        placeholder="輸入圖號座標 / 桿號（例：K7694）"
                        autocomplete="off"
                        spellcheck="false" />

                    <button id="poleSearchClear" class="pole-search__clear" type="button" aria-label="清除">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div id="polePickedMeta" class="pole-picked" hidden>
                    <div class="pole-picked__row">
                        <span class="pole-picked__k">桿號</span>
                        <span id="polePickedPoleNo" class="pole-picked__v"></span>
                    </div>
                    <div class="pole-picked__row">
                        <span class="pole-picked__k">地址</span>
                        <span id="polePickedAddr" class="pole-picked__v"></span>
                    </div>
                </div>

                <div id="poleSuggestWrap" class="pole-suggest" hidden>
                    <ul id="poleSuggestList" class="pole-suggest__list" role="listbox" aria-label="搜尋建議"></ul>
                </div>
            </div>
        </div>

        <!-- Map（滿版） -->
        <div class="pole-map">
            <div id="map" class="map-canvas" role="application" aria-label="電桿地圖"></div>
        </div>

        <?php if ($isAuthed): ?>
            <?php require __DIR__ . '/partials/footer.php'; ?>
        </div><!-- /.page -->
    <?php endif; ?>

    <?php require __DIR__ . '/partials/scripts.php'; ?>
</body>

</html>