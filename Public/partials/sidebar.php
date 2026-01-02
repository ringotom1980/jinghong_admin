<?php
/**
 * Path: Public/partials/sidebar.php
 * 說明: 左側動態側導覽（抽屜）
 * - 收合狀態：只顯示「頁籤列」（icon + 縮寫）
 * - Hover：抽屜滑出顯示完整選單
 * - Pin：可釘選固定展開（預留、先可用）
 * - DOM 只負責結構；互動由 assets/js/nav.js 控制；樣式由 assets/css/nav.css 控制
 */

declare(strict_types=1);

$baseUrl = '/jinghong_admin';
?>
<aside class="sidenav" id="sidenav" aria-label="側邊導覽">
  <div class="sidenav__rail" aria-hidden="false">
    <button class="sidenav__pin" id="sidenavPin" type="button" aria-label="釘選側邊導覽" title="釘選 / 取消釘選">
      <span class="pin__icon" aria-hidden="true">📌</span>
    </button>

    <a class="rail__tab" data-nav="dashboard" href="<?= $baseUrl ?>/dashboard" title="儀表板">
      <span class="tab__icon" aria-hidden="true">▦</span>
      <span class="tab__abbr">D</span>
    </a>

    <a class="rail__tab" data-nav="mat" href="<?= $baseUrl ?>/mat/issue" title="材料">
      <span class="tab__icon" aria-hidden="true">▣</span>
      <span class="tab__abbr">MAT</span>
    </a>

    <a class="rail__tab" data-nav="car" href="<?= $baseUrl ?>/car/base" title="車輛">
      <span class="tab__icon" aria-hidden="true">🚗</span>
      <span class="tab__abbr">CAR</span>
    </a>

    <a class="rail__tab" data-nav="equ" href="<?= $baseUrl ?>/equ/repairs" title="工具">
      <span class="tab__icon" aria-hidden="true">🛠</span>
      <span class="tab__abbr">EQU</span>
    </a>

    <a class="rail__tab" data-nav="pole" href="<?= $baseUrl ?>/pole-map" title="電桿地圖（公開）" target="_blank" rel="noopener">
      <span class="tab__icon" aria-hidden="true">📍</span>
      <span class="tab__abbr">MAP</span>
    </a>
  </div>

  <div class="sidenav__drawer" id="sidenavDrawer" aria-hidden="true">
    <div class="drawer__head">
      <div class="drawer__title">選單</div>
      <div class="drawer__hint">移開滑鼠可自動收合</div>
    </div>

    <nav class="drawer__nav" aria-label="完整導覽">
      <div class="nav__group">
        <div class="group__title">共用</div>
        <a class="nav__item" data-nav="dashboard" href="<?= $baseUrl ?>/dashboard">儀表板</a>
        <a class="nav__item" data-nav="me_password" href="<?= $baseUrl ?>/me/password">更換密碼</a>
      </div>

      <div class="nav__group">
        <div class="group__title">材料管理</div>
        <a class="nav__item" data-nav="mat_issue" href="<?= $baseUrl ?>/mat/issue">提領作業</a>
        <a class="nav__item" data-nav="mat_edit" href="<?= $baseUrl ?>/mat/edit">資料編輯</a>
        <a class="nav__item" data-nav="mat_materials" href="<?= $baseUrl ?>/mat/materials">材料管理</a>
        <a class="nav__item" data-nav="mat_stats" href="<?= $baseUrl ?>/mat/stats">領退統計</a>
      </div>

      <div class="nav__group">
        <div class="group__title">車輛管理</div>
        <a class="nav__item" data-nav="car_base" href="<?= $baseUrl ?>/car/base">基本資料</a>
        <a class="nav__item" data-nav="car_repairs" href="<?= $baseUrl ?>/car/repairs">維修紀錄</a>
        <a class="nav__item" data-nav="car_stats" href="<?= $baseUrl ?>/car/stats">維修統計</a>
      </div>

      <div class="nav__group">
        <div class="group__title">工具管理</div>
        <a class="nav__item" data-nav="equ_repairs" href="<?= $baseUrl ?>/equ/repairs">維修紀錄</a>
        <a class="nav__item" data-nav="equ_stats" href="<?= $baseUrl ?>/equ/stats">維修統計</a>
      </div>

      <div class="nav__group">
        <div class="group__title">公開</div>
        <a class="nav__item" data-nav="pole_map" href="<?= $baseUrl ?>/pole-map" target="_blank" rel="noopener">電桿地圖</a>
      </div>
    </nav>
  </div>
</aside>
