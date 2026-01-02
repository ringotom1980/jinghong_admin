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
?>
<aside class="sidenav" id="sidenav" aria-label="側邊導覽">
  <div class="sidenav__rail" aria-hidden="false">
    <a class="rail__tab" data-nav="dashboard" data-drawer="drawer-dashboard" href="<?= htmlspecialchars($base . '/dashboard', ENT_QUOTES) ?>" title="儀錶板">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-gauge-high"></i></span>
      <span class="tab__abbr">儀錶板</span>
    </a>

    <a class="rail__tab" data-nav="mat" data-drawer="drawer-mat" href="<?= htmlspecialchars($base . '/mat/issue', ENT_QUOTES) ?>" title="領退管理">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-boxes-stacked"></i></span>
      <span class="tab__abbr">領退管理</span>
    </a>

    <a class="rail__tab" data-nav="car" data-drawer="drawer-car" href="<?= htmlspecialchars($base . '/car/base', ENT_QUOTES) ?>" title="車輛管理">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-car"></i></span>
      <span class="tab__abbr">車輛管理</span>
    </a>

    <a class="rail__tab" data-nav="equ" data-drawer="drawer-equ" href="<?= htmlspecialchars($base . '/equ/repairs', ENT_QUOTES) ?>" title="工具管理">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-screwdriver-wrench"></i></span>
      <span class="tab__abbr">工具管理</span>
    </a>

    <a class="rail__tab" data-nav="pole" data-drawer="drawer-pole" href="<?= htmlspecialchars($base . '/pole-map', ENT_QUOTES) ?>" title="電桿地圖（公開）" target="_blank" rel="noopener">
      <span class="tab__icon" aria-hidden="true"><i class="fa-solid fa-location-dot"></i></span>
      <span class="tab__abbr">電桿地圖</span>
    </a>
  </div>

  <div class="sidenav__drawerHost" id="sidenavDrawerHost" aria-hidden="true">
    <section class="drawerPanel" id="drawer-dashboard" aria-label="儀錶板選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i> 儀錶板</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="儀錶板導覽">
        <a class="nav__item" data-nav="dashboard" href="<?= htmlspecialchars($base . '/dashboard', ENT_QUOTES) ?>">儀錶板</a>
        <a class="nav__item" data-nav="me_password" href="<?= htmlspecialchars($base . '/me/password', ENT_QUOTES) ?>">更換密碼</a>
      </nav>
    </section>

    <section class="drawerPanel" id="drawer-mat" aria-label="領退管理選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-boxes-stacked" aria-hidden="true"></i> 領退管理</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="領退管理導覽">
        <a class="nav__item" data-nav="mat_issue" href="<?= htmlspecialchars($base . '/mat/issue', ENT_QUOTES) ?>">提領作業</a>
        <a class="nav__item" data-nav="mat_edit" href="<?= htmlspecialchars($base . '/mat/edit', ENT_QUOTES) ?>">資料編輯</a>
        <a class="nav__item" data-nav="mat_materials" href="<?= htmlspecialchars($base . '/mat/materials', ENT_QUOTES) ?>">材料管理</a>
        <a class="nav__item" data-nav="mat_stats" href="<?= htmlspecialchars($base . '/mat/stats', ENT_QUOTES) ?>">領退統計</a>
      </nav>
    </section>

    <section class="drawerPanel" id="drawer-car" aria-label="車輛管理選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-car" aria-hidden="true"></i> 車輛管理</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="車輛管理導覽">
        <a class="nav__item" data-nav="car_base" href="<?= htmlspecialchars($base . '/car/base', ENT_QUOTES) ?>">基本資料</a>
        <a class="nav__item" data-nav="car_repairs" href="<?= htmlspecialchars($base . '/car/repairs', ENT_QUOTES) ?>">維修紀錄</a>
        <a class="nav__item" data-nav="car_stats" href="<?= htmlspecialchars($base . '/car/stats', ENT_QUOTES) ?>">維修統計</a>
      </nav>
    </section>

    <section class="drawerPanel" id="drawer-equ" aria-label="工具管理選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i> 工具管理</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="工具管理導覽">
        <a class="nav__item" data-nav="equ_repairs" href="<?= htmlspecialchars($base . '/equ/repairs', ENT_QUOTES) ?>">維修紀錄</a>
        <a class="nav__item" data-nav="equ_stats" href="<?= htmlspecialchars($base . '/equ/stats', ENT_QUOTES) ?>">維修統計</a>
      </nav>
    </section>

    <section class="drawerPanel" id="drawer-pole" aria-label="電桿地圖選單">
      <div class="drawer__head">
        <div class="drawer__title"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> 電桿地圖</div>
        <div class="drawer__hint">移開滑鼠可自動收合</div>
      </div>
      <nav class="drawer__nav" aria-label="電桿地圖導覽">
        <a class="nav__item" data-nav="pole_map" href="<?= htmlspecialchars($base . '/pole-map', ENT_QUOTES) ?>" target="_blank" rel="noopener">開啟電桿地圖（公開）</a>
      </nav>
    </section>
  </div>
</aside>
