<?php
/**
 * Path: Public/login.php
 * 說明: 登入頁（公開頁，不載入 sidebar）
 * - 已登入直接導向 /dashboard
 * - 提供公開電桿地圖入口
 * - 支援 return 導回原頁
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_once __DIR__ . '/../app/auth.php';

$base = base_url(); // ✅ 統一用 base_url()

// 已登入 → 導到 dashboard
if (current_user_id()) {
  header('Location: ' . $base . '/dashboard');
  exit;
}

// 版本號（與 footer.php 同來源）
$versionFile = dirname(__DIR__) . '/version.txt';

$version = 'v0.0.0';
if (is_file($versionFile)) {
  $v = trim((string)@file_get_contents($versionFile));
  if ($v !== '') {
    $version = $v;
  }
}

$pageTitle = '登入｜境宏工程有限公司';
$pageCss   = ['assets/css/login.css'];
$pageJs    = ['assets/js/login.js'];

/** return：只允許站內 path */
$return = '';
if (isset($_GET['return'])) {
  $rt = (string)$_GET['return'];
  if ($rt !== '' && $rt[0] === '/' && strpos($rt, '//') !== 0) {
    $return = $rt;
  }
}
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>
<body class="login-page">

<main class="auth-shell">
  <section class="auth-card">
    <div class="auth-brand">
      <img class="auth-logo-img"
           src="<?= asset('assets/img/brand/JH_logo.png') ?>"
           alt="境宏工程有限公司"
           width="64" height="64" />
      <div class="auth-title">境宏工程有限公司</div>
      <div class="auth-sub">管理系統登入</div>
    </div>

    <form id="loginForm" class="auth-form" method="post" action="javascript:void(0)">
      <input type="hidden" name="return" value="<?= htmlspecialchars($return, ENT_QUOTES, 'UTF-8') ?>" />

      <div class="auth-field">
        <input id="loginUsername" type="text" name="username" autocomplete="username" placeholder=" " required />
        <label for="loginUsername">帳號</label>
      </div>
      <div class="auth-field auth-field--password">
        <input id="loginPassword" type="password" name="password" autocomplete="current-password" placeholder=" " required />
        <label for="loginPassword">密碼</label>
        <button id="passwordToggle" class="auth-password-toggle" type="button" aria-label="顯示密碼" aria-pressed="false">顯示</button>
      </div>

      <div id="loginMessage" class="auth-msg" role="status" aria-live="polite"></div>

      <button type="submit" class="btn btn--primary">登入</button>
    </form>

    <!-- 公開入口：不登入也可用 -->
    <div class="auth-public">
      <a class="btn btn--secondary" href="<?= htmlspecialchars($base . '/pole-map', ENT_QUOTES) ?>">
        免登入查看電桿地圖
      </a>
    </div>

    <div class="auth-foot"><?= htmlspecialchars($version, ENT_QUOTES) ?></div>
  </section>
</main>

<?php require __DIR__ . '/partials/scripts.php'; ?>
</body>
</html>
