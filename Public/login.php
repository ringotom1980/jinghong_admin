<?php
/**
 * Path: Public/login.php
 * 說明: 登入頁（公開頁，不載入 sidebar）
 * - CSS/JS 外掛（不內嵌）
 * - Logo/資源 URL 不寫死 /jinghong_admin（用 asset()）
 */

declare(strict_types=1);

$pageTitle = '登入｜境宏';
$pageCss   = ['assets/css/login.css'];

// ✅ 只放本頁專屬；共用 JS 由 scripts.php 載入
$pageJs    = ['assets/js/login.js'];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>
<body>

<main class="auth-shell">
  <section class="auth-card">
    <div class="auth-brand">
      <img class="auth-logo-img"
           src="<?= asset('assets/img/brand/JH_logo.png') ?>"
           alt="境宏工程有限公司"
           width="64" height="64" />
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

<?php require __DIR__ . '/partials/scripts.php'; ?>
</body>
</html>
