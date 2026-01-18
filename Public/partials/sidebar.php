<?php

/**
 * Path: Public/partials/sidebar.php
 * 說明: 左側動態側導覽（獨立抽屜版本｜定版）
 * - 收合狀態：只顯示 rail（icon + 中文縮寫）
 * - Hover：滑到 rail tab → 顯示對應 drawerPanel
 * - ✅ 不提供釘選 pin（依你定版）
 * - Icon：Font Awesome（CDN）
 */

declare(strict_types=1);

$base = base_url();

/**
 * 組站內路徑（避免 $base 為空或含尾斜線時出現 //）
 * - $path 需以 / 開頭
 */
$u = function (string $path) use ($base): string {
    $b = rtrim((string)$base, '/');
    $p = '/' . ltrim($path, '/');
    return ($b !== '' ? $b : '') . $p;
};
?>
<aside class="sidenav" id="sidenav" aria-label="側邊導覽">
    <div class="sidenav__rail" aria-hidden="false">
        <a class="rail__tab" data-nav="dashboard" data-drawer="drawer-dashboard"
            href="<?= htmlspecialchars($u('/dashboard'), ENT_QUOTES) ?>">
            <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-gauge-high"></i></span>
            <span class="tab__abbr">導覽板</span>
        </a>

        <a class="rail__tab" data-nav="mat" data-drawer="drawer-mat"
            href="<?= htmlspecialchars($u('/mat/issue'), ENT_QUOTES) ?>">
            <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-boxes-stacked"></i></span>
            <span class="tab__abbr">領退管理</span>
        </a>

        <a class="rail__tab" data-nav="car" data-drawer="drawer-car"
            href="<?= htmlspecialchars($u('/car/base'), ENT_QUOTES) ?>">
            <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-car"></i></span>
            <span class="tab__abbr">車輛管理</span>
        </a>

        <a class="rail__tab" data-nav="equ" data-drawer="drawer-equ"
            href="<?= htmlspecialchars($u('/equ/repairs'), ENT_QUOTES) ?>">
            <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-screwdriver-wrench"></i></span>
            <span class="tab__abbr">工具管理</span>
        </a>

        <!-- 公開 URL，但登入狀態下仍走同一個 layout；不需要新分頁 -->
        <a class="rail__tab"
            data-nav="pole_map"
            data-no-drawer="1"
            aria-haspopup="false"
            href="<?= htmlspecialchars($u('/pole-map'), ENT_QUOTES) ?>">
            <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-location-dot"></i></span>
            <span class="tab__abbr">電桿地圖</span>
        </a>

    </div>

    <div class="sidenav__drawerHost" id="sidenavDrawerHost" aria-hidden="true">
        <section class="drawerPanel" id="drawer-dashboard" aria-label="儀錶板選單">
            <div class="drawer__head">
                <div class="drawer__title"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> 儀錶板</div>
            </div>
            <nav class="drawer__nav" aria-label="儀錶板導覽">
                <a class="nav__item" data-nav="dashboard" href="<?= htmlspecialchars($u('/dashboard'), ENT_QUOTES) ?>">儀錶板</a>
                <a class="nav__item" data-nav="me_password" href="<?= htmlspecialchars($u('/me/password'), ENT_QUOTES) ?>">更換密碼</a>
            </nav>
        </section>

        <section class="drawerPanel" id="drawer-mat" aria-label="領退管理選單">
            <div class="drawer__head">
                <div class="drawer__title"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> 領退管理</div>
            </div>
            <nav class="drawer__nav" aria-label="領退管理導覽">
                <a class="nav__item" data-nav="mat_issue" href="<?= htmlspecialchars($u('/mat/issue'), ENT_QUOTES) ?>">提領作業</a>
                <a class="nav__item" data-nav="mat_personnel" href="<?= htmlspecialchars($u('/mat/personnel'), ENT_QUOTES) ?>">資料編輯</a>
                <a class="nav__item" data-nav="mat_edit_B" href="<?= htmlspecialchars($u('/mat/edit_B'), ENT_QUOTES) ?>">B班管理</a>
                <a class="nav__item" data-nav="mat_edit" href="<?= htmlspecialchars($u('/mat/edit'), ENT_QUOTES) ?>">D班管理</a>                
                <a class="nav__item" data-nav="mat_stats" href="<?= htmlspecialchars($u('/mat/stats'), ENT_QUOTES) ?>">領退統計</a>
            </nav>
        </section>

        <section class="drawerPanel" id="drawer-car" aria-label="車輛管理選單">
            <div class="drawer__head">
                <div class="drawer__title"><i class="fa-solid fa-car" aria-hidden="true"></i> 車輛管理</div>
            </div>
            <nav class="drawer__nav" aria-label="車輛管理導覽">
                <a class="nav__item" data-nav="car_base" href="<?= htmlspecialchars($u('/car/base'), ENT_QUOTES) ?>">基本資料</a>
                <a class="nav__item" data-nav="car_repairs" href="<?= htmlspecialchars($u('/car/repairs'), ENT_QUOTES) ?>">維修紀錄</a>
                <a class="nav__item" data-nav="car_stats" href="<?= htmlspecialchars($u('/car/stats'), ENT_QUOTES) ?>">維修統計</a>
            </nav>
        </section>

        <section class="drawerPanel" id="drawer-equ" aria-label="工具管理選單">
            <div class="drawer__head">
                <div class="drawer__title"><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i> 工具管理</div>
            </div>
            <nav class="drawer__nav" aria-label="工具管理導覽">
                <a class="nav__item" data-nav="equ_repairs" href="<?= htmlspecialchars($u('/equ/repairs'), ENT_QUOTES) ?>">維修紀錄</a>
                <a class="nav__item" data-nav="equ_stats" href="<?= htmlspecialchars($u('/equ/stats'), ENT_QUOTES) ?>">維修統計</a>
            </nav>
        </section>
    </div>
</aside>