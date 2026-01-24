<?php

/**
 * Path: Public/modules/mat/edit.php
 * 說明: D 班管理（/mat/edit）
 * - 僅提供頁面結構與容器
 * - 掛載本頁專屬 CSS / JS（外掛）
 * - 不處理任何資料、不寫業務邏輯
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
          本頁做對帳資料輸入 · 分類與材料歸屬
        </div>
      </header>

      <section class="me-grid me-grid--2">

        <!-- 左：對帳資料（分類 × 日期） -->
        <div class="card me-card">
          <div class="card__head me-head">
            <h2>對帳資料（若有新分類材料需輸入對帳資料，需新增分類）</h2>

            <div class="me-head__actions" id="meReconActions">
              <!-- JS render：新增分類 / 編輯(儲存更新) -->
            </div>
          </div>

          <div class="card__body">
            <div class="me-recon-top" id="meReconTop">
              <!-- JS render：日期選擇器 + 儲存對帳資料 -->
            </div>

            <div id="meReconciliation">
              <!-- JS render：分類名稱 + 對帳數量 input（編輯模式鎖起來） -->
            </div>
          </div>
        </div>

        <!-- 右：分類與材料歸屬 -->
        <div class="card me-card">
          <div class="card__head me-head">
            <h2>分類與材料歸屬(左表新增分類後在本表編輯材料組合)</h2>

            <div class="me-head__actions" id="meCMAction">
              <!-- JS render：編輯(儲存更新=完成) -->
            </div>
          </div>

          <div class="card__body">
            <div id="meCategoryMaterials">
              <!-- JS render：分類名稱 + 材料編號組合（編輯模式顯示「變更材料組合」按鈕） -->
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
