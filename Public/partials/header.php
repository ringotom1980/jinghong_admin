<?php
/**
 * Path: Public/partials/header.php
 * 說明: 全站固定 Top 導覽列（系統名、目前登入者、登出/改密碼）
 * - 依你的需求：上方不要選單（選單只留在側邊）
 * - 視覺由 assets/css/nav.css 控制
 * - 不在此放業務邏輯；登入者資訊後續由 auth/me API 或 session 注入
 */

declare(strict_types=1);

$baseUrl = '/jinghong_admin';
$currentUserName = $currentUserName ?? '未登入';
?>
<header class="topbar" role="banner">
  <div class="topbar__left">
    <a class="topbar__brand" href="<?= $baseUrl ?>/dashboard" aria-label="回到儀表板">
      <img class="brand__logo"
           src="<?= $baseUrl ?>/assets/img/brand/JH_logo.png"
           alt="境宏工程有限公司"
           width="28" height="28" />
      <span class="brand__text">境宏工程有限公司管理系統</span>
    </a>
  </div>

  <!-- 依規格：上方不放選單，留空做視覺平衡即可 -->
  <div class="topbar__center" aria-hidden="true"></div>

  <div class="topbar__right">
    <div class="topbar__user" title="目前登入者">
      <span class="user__dot" aria-hidden="true"></span>
      <span class="user__name" id="navCurrentUser"><?= htmlspecialchars((string)$currentUserName, ENT_QUOTES) ?></span>
    </div>

    <div class="topbar__actions">
      <a class="btn btn--ghost" href="<?= $baseUrl ?>/me/password">改密碼</a>
      <a class="btn btn--primary" href="<?= $baseUrl ?>/logout">登出</a>
    </div>
  </div>
</header>
