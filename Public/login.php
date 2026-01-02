<?php

declare(strict_types=1);

$pageTitle = '登入｜境宏';
$pageCss = ['assets/css/login.css'];
$pageJs  = ['assets/js/login.js'];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>

<body>
    <main class="auth-shell">
        <section class="auth-card">
            <div class="auth-brand">
                <img class="auth-logo-img"
                    src="<?= '/jinghong_admin/assets/img/brand/JH_logo.png' ?>"
                    alt="境宏工程有限公司"
                    width="64"
                    height="64" />
                <div class="auth-title">境宏工程有限公司管理系統</div>
                <div class="auth-sub">請使用帳號密碼登入</div>
            </div>

            <form id="loginForm" class="auth-form" method="post" action="javascript:void(0)">
                <label class="auth-label">
                    <span>帳號</span>
                    <input type="text" name="username" autocomplete="username" required />
                </label>

                <label class="auth-label">
                    <span>密碼</span>
                    <input type="password" name="password" autocomplete="current-password" required />
                </label>

                <div id="loginMessage" class="auth-msg"></div>

                <button type="submit" class="btn-primary">登入</button>
            </form>

            <div class="auth-foot">v0.1.0</div>
        </section>
    </main>

    <?php $baseUrl = '/jinghong_admin'; ?>
    <script src="<?= $baseUrl ?>/assets/js/api.js"></script>
    <script src="<?= $baseUrl ?>/assets/js/ui_toast.js"></script>
    <?php foreach ($pageJs as $js): ?>
        <script src="<?= $baseUrl . '/' . ltrim($js, '/') ?>"></script>
    <?php endforeach; ?>
</body>

</html>