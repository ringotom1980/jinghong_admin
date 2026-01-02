<?php
/**
 * Path: Public/partials/sidebar.php
 * 說明: 左側動態側導覽（多抽屜版本）
 * - 收合狀態：只顯示 rail（icon + 縮寫）
 * - Hover：滑到某個 rail tab → 開啟該 tab 對應的 drawer（每個選單獨立抽屜）
 * - Pin：釘選後固定展開（固定最後一個被開啟的 drawer）
 * - Icon：全部使用 Font Awesome（走 CDN），不使用 emoji
 * - DOM 只負責結構；互動由 assets/js/nav.js 控制；樣式由 assets/css/nav.css 控制
 */

declare(strict_types=1);

$baseUrl = '/jinghong_admin';
?>
<aside class="sidenav" id="sidenav" aria-label="側邊導覽">
  <!-- Rail -->
  <div class="sidenav__rail" aria-hidden="false">
    <button class="sidenav__pin" id="sidenavPin" type="button" aria-label="釘選側邊導覽" title="釘選 / 取消釘選">
      <i class="fa-solid fa-thumbtack" aria-hidden="true"></i>
    </button>

    <a class="rail__tab" data-nav="dashboard" data-drawer="drawer-dashboard" href="<?= $baseUrl ?>/dashboard" title="儀表板">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-gauge-high"></i></span>
      <span class="tab__abbr">D</span>
    </a>

    <a class="rail__tab" data-nav="mat" data-drawer="drawer-mat" href="<?= $baseUrl ?>/mat/issue" title="材料">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-boxes-stacked"></i></span>
      <span class="tab__abbr">MAT</span>
    </a>

    <a class="rail__tab" data-nav="car" data-drawer="drawer-car" href="<?= $baseUrl ?>/car/base" title="車輛">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-car"></i></span>
      <span class="tab__abbr">CAR</span>
    </a>

    <a class="rail__tab" data-nav="equ" data-drawer="drawer-equ" href="<?= $baseUrl ?>/equ/repairs" title="工具">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-screwdriver-wrench"></i></span>
      <span class="tab__abbr">EQU</span>
    </a>

    <a class="rail__tab" data-nav="pole" data-drawer="drawer-pole" href="<?= $baseUrl ?>/pole-map" title="電桿地圖（公開）" target="_blank" rel="noopener">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-location-dot"></i></span>
      <span class="tab__abbr">MAP</span>
    </a>
  </div>

  <!-- Drawer host（多抽屜：同一層容器，內容用多個 panel 切換） -->
  <div class="sidenav__drawerHost" id="sidenavDrawerHost" aria-hidden="true">
    <!-- Dashboard drawer -->
    <section class="drawerPanel" id="drawer-dashboard" aria-label="儀表板選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> 儀表板</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="儀表板導覽">
        <a class="nav__item" data-nav="dashboard" href="<?= $baseUrl ?>/dashboard">儀表板</a>
        <a class="nav__item" data-nav="me_password" href="<?= $baseUrl ?>/me/password">更換密碼</a>
      </nav>
    </section>

    <!-- MAT drawer -->
    <section class="drawerPanel" id="drawer-mat" aria-label="材料管理選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> 材料管理</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="材料管理導覽">
        <a class="nav__item" data-nav="mat_issue" href="<?= $baseUrl ?>/mat/issue">提領作業</a>
        <a class="nav__item" data-nav="mat_edit" href="<?= $baseUrl ?>/mat/edit">資料編輯</a>
        <a class="nav__item" data-nav="mat_materials" href="<?= $baseUrl ?>/mat/materials">材料管理</a>
        <a class="nav__item" data-nav="mat_stats" href="<?= $baseUrl ?>/mat/stats">領退統計</a>
      </nav>
    </section>

    <!-- CAR drawer -->
    <section class="drawerPanel" id="drawer-car" aria-label="車輛管理選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-car" aria-hidden="true"></i> 車輛管理</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="車輛管理導覽">
        <a class="nav__item" data-nav="car_base" href="<?= $baseUrl ?>/car/base">基本資料</a>
        <a class="nav__item" data-nav="car_repairs" href="<?= $baseUrl ?>/car/repairs">維修紀錄</a>
        <a class="nav__item" data-nav="car_stats" href="<?= $baseUrl ?>/car/stats">維修統計</a>
      </nav>
    </section>

    <!-- EQU drawer -->
    <section class="drawerPanel" id="drawer-equ" aria-label="工具管理選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i> 工具管理</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="工具管理導覽">
        <a class="nav__item" data-nav="equ_repairs" href="<?= $baseUrl ?>/equ/repairs">維修紀錄</a>
        <a class="nav__item" data-nav="equ_stats" href="<?= $baseUrl ?>/equ/stats">維修統計</a>
      </nav>
    </section>

    <!-- Pole drawer -->
    <section class="drawerPanel" id="drawer-pole" aria-label="公開選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> 公開</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="公開導覽">
        <a class="nav__item" data-nav="pole_map" href="<?= $baseUrl ?>/pole-map" target="_blank" rel="noopener">電桿地圖</a>
      </nav>
    </section>
  </div>
</aside>
