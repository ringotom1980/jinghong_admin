<?php
/**
 * Path: Public/admin/index.php
 * 說明: 管理中心（ADMIN）
 * - 我的帳號：改密碼（透過 /api/auth/change_password）
 * - 使用者管理：建立/更新使用者、重設密碼、啟用/停用
 */

declare(strict_types=1);

require_once __DIR__ . '/../../app/bootstrap.php';
require_login();

// role gate
$uid = current_user_id();
$stmt = db()->prepare('SELECT role FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$uid]);
$me = $stmt->fetch();
if (!$me || ($me['role'] ?? '') !== 'ADMIN') {
  header('Location: ' . rtrim(base_url(), '/') . '/me/account');
  exit;
}

$pageTitle = '管理中心';
$pageCss = [
  'assets/css/admin_center.css',
];
$pageJs = [
  'assets/js/admin_center.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../partials/head.php'; ?>
<body class="page-enter">

<?php require __DIR__ . '/../partials/header.php'; ?>
<?php require __DIR__ . '/../partials/sidebar.php'; ?>

<main class="page admin-center" role="main">
  <section class="page-head">
    <h1>管理中心</h1>
    <p class="page-sub">你可以管理一般使用者帳號，並可在此更新系統管理者密碼。</p>
  </section>

  <section class="ac-card">
    <div class="ac-tabs" role="tablist" aria-label="管理中心分頁">
      <button type="button" class="ac-tab is-active" data-tab="my" role="tab">我的帳號</button>
      <button type="button" class="ac-tab" data-tab="users" role="tab">使用者管理</button>
    </div>

    <div class="ac-pane is-active" data-pane="my" role="tabpanel">
      <form id="acPwdForm" class="ac-form">
        <div class="ac-grid">
          <label class="ac-field">
            <span class="ac-label">目前密碼</span>
            <input type="password" name="old_password" required autocomplete="current-password" />
          </label>
          <label class="ac-field">
            <span class="ac-label">新密碼</span>
            <input type="password" name="new_password" required minlength="8" autocomplete="new-password" />
          </label>
          <label class="ac-field">
            <span class="ac-label">確認新密碼</span>
            <input type="password" name="new_password2" required minlength="8" autocomplete="new-password" />
          </label>
        </div>
        <div class="ac-actions">
          <button type="submit" class="btn btn--primary">更新我的密碼</button>
        </div>
      </form>
    </div>

    <div class="ac-pane" data-pane="users" role="tabpanel">
      <div class="ac-toolbar">
        <button type="button" class="btn btn--secondary" id="acBtnNewUser">新增使用者</button>
      </div>

      <div class="ac-tablewrap">
        <table class="ac-table" aria-label="使用者清單">
          <thead>
            <tr>
              <th style="width:90px;">ID</th>
              <th>姓名</th>
              <th>帳號</th>
              <th style="width:120px;">角色</th>
              <th style="width:110px;">狀態</th>
              <th style="width:240px;">操作</th>
            </tr>
          </thead>
          <tbody id="acUsersTbody">
            <tr><td colspan="6" class="ac-muted">載入中…</td></tr>
          </tbody>
        </table>
      </div>

      <div class="ac-modal" id="acUserModal" hidden>
        <div class="ac-modal__mask" data-close="1"></div>
        <div class="ac-modal__panel" role="dialog" aria-modal="true" aria-label="編輯使用者">
          <div class="ac-modal__head">
            <h3 class="ac-modal__title" id="acModalTitle">新增使用者</h3>
            <button type="button" class="ac-x" data-close="1" aria-label="關閉">×</button>
          </div>

          <form id="acUserForm" class="ac-form">
            <input type="hidden" name="id" value="0" />
            <div class="ac-grid">
              <label class="ac-field">
                <span class="ac-label">姓名</span>
                <input type="text" name="name" required maxlength="100" />
              </label>
              <label class="ac-field">
                <span class="ac-label">帳號</span>
                <input type="text" name="username" required maxlength="100" autocomplete="username" />
              </label>
              <label class="ac-field">
                <span class="ac-label">角色</span>
                <select name="role">
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <label class="ac-field">
                <span class="ac-label">啟用</span>
                <select name="is_active">
                  <option value="1">啟用</option>
                  <option value="0">停用</option>
                </select>
              </label>

              <label class="ac-field ac-field--full">
                <span class="ac-label">新密碼（只在新增或需要重設時填）</span>
                <input type="password" name="new_password" minlength="8" autocomplete="new-password" />
              </label>
            </div>

            <div class="ac-actions">
              <button type="button" class="btn btn--secondary" data-close="1">取消</button>
              <button type="submit" class="btn btn--primary">儲存</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  </section>
</main>

<?php require __DIR__ . '/../partials/scripts.php'; ?>
</body>
</html>
