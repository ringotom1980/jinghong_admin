<?php
/**
 * Path: Public/me_account.php
 * 說明: 管理帳號（一般使用者：改姓名/帳號/密碼）
 * - STAFF：正常使用
 * - ADMIN：可用，但主要入口在「管理中心」
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';
require_login();

$pageTitle = '管理帳號';
$pageCss = [
  'assets/css/me_account.css',
];
$pageJs = [
  'assets/js/me_account.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>
<body class="page-enter">

<?php require __DIR__ . '/partials/header.php'; ?>
<?php require __DIR__ . '/partials/sidebar.php'; ?>

<main class="page me-account" role="main">
  <section class="page-head">
    <h1>管理帳號</h1>
    <p class="page-sub">你可以更新姓名、登入帳號與密碼。</p>
  </section>

  <section class="ma-card" aria-label="帳號設定">
    <div class="ma-tabs" role="tablist" aria-label="帳號設定分頁">
      <button type="button" class="ma-tab is-active" data-tab="profile" role="tab">基本資料</button>
      <button type="button" class="ma-tab" data-tab="password" role="tab">改密碼</button>
    </div>

    <div class="ma-pane is-active" data-pane="profile" role="tabpanel">
      <form id="maProfileForm" class="ma-form">
        <div class="ma-grid">
          <label class="ma-field">
            <span class="ma-label">顯示名稱</span>
            <input type="text" name="name" id="maName" required maxlength="100" />
          </label>

          <label class="ma-field">
            <span class="ma-label">登入帳號</span>
            <input type="text" name="username" id="maUsername" required maxlength="100" autocomplete="username" />
          </label>
        </div>

        <div class="ma-actions">
          <button type="submit" class="btn btn--primary">儲存</button>
        </div>
      </form>
    </div>

    <div class="ma-pane" data-pane="password" role="tabpanel">
      <form id="maPwdForm" class="ma-form">
        <div class="ma-grid">
          <label class="ma-field">
            <span class="ma-label">目前密碼</span>
            <input type="password" name="old_password" required autocomplete="current-password" />
          </label>

          <label class="ma-field">
            <span class="ma-label">新密碼</span>
            <input type="password" name="new_password" required minlength="8" autocomplete="new-password" />
          </label>

          <label class="ma-field">
            <span class="ma-label">確認新密碼</span>
            <input type="password" name="new_password2" required minlength="8" autocomplete="new-password" />
          </label>
        </div>

        <div class="ma-actions">
          <button type="submit" class="btn btn--primary">更新密碼</button>
        </div>
      </form>
    </div>
  </section>
</main>

<?php require __DIR__ . '/partials/scripts.php'; ?>
</body>
</html>
