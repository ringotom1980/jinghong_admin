<?php

/**
 * Path: Public/modules/mat/edit.php
 * 說明: D 班資料編輯（/mat/edit）
 * - 僅提供頁面結構與容器
 * - 掛載本頁專屬 CSS / JS（外掛）
 * - 不處理任何資料、不寫業務邏輯
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = 'D 班資料編輯｜領退管理';
$pageCss = ['assets/css/mat_edit.css'];

$pageJs = [
  'assets/js/mat_edit.js',
  'assets/js/mat_edit_categories.js',
  'assets/js/mat_edit_category_materials.js',
  'assets/js/mat_edit_reconciliation.js',
  'assets/js/mat_edit_personnel.js',
  'assets/js/mat_edit_ui.js',
];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body>

  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page mat-edit page-enter" role="main">
    <div class="content">

      <header class="page-head">
        <h1>D 班資料編輯</h1>
        <div class="page-sub">
          分類對帳輸入 · 分類與材料歸屬 · 顯示排序 · 承辦人員
        </div>
      </header>

      <section class="me-grid">

        <!-- 1️⃣ 手動對帳資料 -->
        <div class="card me-card">
          <div class="card__head">
            <h2>對帳資料（分類 × 日期）</h2>
          </div>
          <div class="card__body">
            <div id="meReconciliation">
              <!-- JS render：日期選擇 + 分類輸入列 -->
            </div>
          </div>
        </div>

        <!-- 2️⃣ 分類與材料歸屬 -->
        <div class="card me-card">
          <div class="card__head">
            <h2>分類與材料歸屬</h2>
          </div>
          <div class="card__body">
            <div id="meCategories">
              <!-- JS render：分類清單 + 編輯按鈕 -->
            </div>
          </div>
        </div>

        <!-- 3️⃣ 分類排序 -->
        <div class="card me-card">
          <div class="card__head">
            <h2>分類顯示順序</h2>
          </div>
          <div class="card__body">
            <div id="meSort">
              <!-- JS render：拖曳排序 -->
            </div>
          </div>
        </div>

        <!-- 4️⃣ 承辦人員 -->
        <div class="card me-card">
          <div class="card__head">
            <h2>承辦人員</h2>
          </div>
          <div class="card__body">
            <div id="mePersonnel">
              <!-- JS render：A–F 班姓名 -->
            </div>
          </div>
        </div>

      </section>
    </div>
  </main>

  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>
</html>
