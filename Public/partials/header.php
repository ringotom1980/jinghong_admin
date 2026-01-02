<?php

/**
 * Path: Public/partials/header.php
 * 說明: 全站固定 Top 導覽列（系統名、目前登入者、快速入口、登出）
 * - 視覺與互動由 assets/css/nav.css 與 assets/js/nav.js 控制
 * - 不在此放業務邏輯；登入者資訊後續由 auth/me API 或 session 注入
 */

declare(strict_types=1);

$baseUrl = '/jinghong_admin'; // 目前部署在子資料夾，先定死（後續可改用 config/base_url）
$currentUserName = $currentUserName ?? '未登入'; // 後續接 auth
?>
<header class="topbar" role="banner">
    <div class="topbar__left">
        <a class="topbar__brand" href="<?= $baseUrl ?>/dashboard" aria-label="回到儀表板">
            <img class="brand__logo"
                src="<?= $baseUrl ?>/assets/img/brand/JH_logo.png"
                alt="境宏工程有限公司"
                width="28"
                height="28" />
            <span class="brand__text">境宏工程有限公司管理系統</span>
        </a>
    </div>

    <div class="topbar__center">
        <nav class="topbar__quick" aria-label="快速入口">
            <a class="quick__link" href="<?= $baseUrl ?>/dashboard">Dashboard</a>
            <a class="quick__link" href="<?= $baseUrl ?>/mat/issue">材料</a>
            <a class="quick__link" href="<?= $baseUrl ?>/car/base">車輛</a>
            <a class="quick__link" href="<?= $baseUrl ?>/equ/repairs">工具</a>
            <a class="quick__link" href="<?= $baseUrl ?>/pole-map" target="_blank" rel="noopener">電桿地圖</a>
        </nav>
    </div>

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