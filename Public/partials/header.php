<?php
/**
 * Path: Public/partials/header.php
 * 說明: 全站固定 Top 導覽列（系統名、目前登入者、登出/改密碼）
 * - 上方不放選單（選單只在側邊）
 * - 不寫死 /jinghong_admin：用 base_url() + asset()
 */

declare(strict_types=1);

$base = base_url();
$currentUserName = $currentUserName ?? '未登入';
?>
<header class="topbar" role="banner">
  <div class="topbar__left">
    <a class="topbar__brand" href="<?= htmlspecialchars($base . '/dashboard', ENT_QUOTES) ?>" aria-label="回到儀錶板">
      <img class="brand__logo"
           src="<?= asset('assets/img/brand/JH_logo.png') ?>"
           alt="境宏工程有限公司"
           width="28" height="28" />
      <span class="brand__text">境宏工程有限公司管理系統</span>
    </a>
  </div>

  <div class="topbar__center" aria-hidden="true"></div>

  <div class="topbar__right">
    <div class="topbar__user" title="目前登入者">
      <span class="user__dot" aria-hidden="true"></span>
      <span class="user__name" id="navCurrentUser"><?= htmlspecialchars((string)$currentUserName, ENT_QUOTES) ?></span>
    </div>

    <div class="topbar__actions">
      <a class="btn btn--ghost" href="<?= htmlspecialchars($base . '/me/password', ENT_QUOTES) ?>">改密碼</a>
      <a class="btn btn--primary" href="<?= htmlspecialchars($base . '/logout', ENT_QUOTES) ?>">登出</a>
    </div>
  </div>
</header>
