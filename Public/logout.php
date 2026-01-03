<?php
/**
 * Path: Public/logout.php
 * 說明: 登出頁（公開頁、不載入 sidebar）
 * - 目的：讓 /logout 有「頁面落點」，避免把登出邏輯塞在 nav.js
 * - 行為：載入 logout.js → 呼叫 /api/auth/logout → 導回 /login
 */

declare(strict_types=1);

$pageTitle = '登出中...｜境宏工程有限公司';
$pageCss   = ['assets/css/login.css'];     // 沿用登入頁的乾淨版面
$pageJs    = ['assets/js/logout.js'];      // ✅ 本頁專屬

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
      <div class="auth-title">登出中...</div>
      <div class="auth-sub">請稍候，系統正在登出。</div>
    </div>

    <div id="logoutMessage" class="auth-msg"></div>

    <div class="auth-foot">v<?= htmlspecialchars((string)(getenv('APP_VERSION') ?: '0.1.0'), ENT_QUOTES) ?></div>
  </section>
</main>

<?php require __DIR__ . '/partials/scripts.php'; ?>
</body>
</html>
