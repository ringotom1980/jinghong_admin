<?php

/**
 * Path: Public/modules/mat/edit.php
 * 說明: D 班管理（/mat/edit）
 * - 僅提供頁面結構與容器
 * - 掛載本頁專屬 CSS / JS（外掛）
 * - 不處理任何資料、不寫業務邏輯
 * - ✅ 定版：本頁只保留 2 張卡片（對帳資料、分類與材料歸屬）
 * - ✅ 承辦人員移至獨立頁（本頁移除）
 * - ✅ 分類排序不獨立卡：改由「對帳資料」卡片內提供拖曳排序（由 JS 實作）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = 'D 班管理｜領退管理';
$pageCss = ['assets/css/mat_edit.css'];

$pageJs = [
  'assets/js/mat_edit.js',
  'assets/js/mat_edit_categories.js',
  'assets/js/mat_edit_category_materials.js',
  'assets/js/mat_edit_reconciliation.js',
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
        <h1>D 班管理</h1>
        <div class="page-sub">
          對帳資料輸入 · 分類與材料歸屬
        </div>
      </header>

      <section class="me-grid me-grid--2">

        <!-- 1️⃣ 對帳資料（含拖曳排序） -->
        <div class="card me-card me-card--left">
          <div class="card__head">
            <h2>對帳資料（分類 × 日期）</h2>
          </div>
          <div class="card__body">
            <div id="meReconciliation">
              <!-- JS render：
                   - 日期選擇
                   - 分類輸入列（含分類顯示順序拖曳/調整）
              -->
            </div>
          </div>
        </div>

        <!-- 2️⃣ 分類與材料歸屬 -->
        <div class="card me-card me-card--right">
          <div class="card__head">
            <h2>分類與材料歸屬</h2>
          </div>
          <div class="card__body">
            <div id="meCategories">
              <!-- JS render：分類清單 + 材料歸屬 -->
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
