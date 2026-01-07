<?php

/**
 * Path: Public/modules/mat/issue.php
 * 說明: 提領作業（/mat/issue）
 * - 掛載本頁 CSS/JS（外掛）
 * - 放容器 DOM（上傳區/日期膠囊/批次列表/缺 shift）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '提領作業｜領退管理';
$pageCss = ['assets/css/mat_issue.css'];

$pageJs = [
  'assets/js/mat_issue.js',
  'assets/js/mat_issue_import.js',
  'assets/js/mat_issue_dates.js',
  'assets/js/mat_issue_batches.js',
  'assets/js/mat_issue_shift.js',
];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body>

  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page mat-issue page-enter" role="main">
    <div class="content">

      <header class="page-head">
        <h1>提領作業</h1>
        <div class="page-sub">上傳 Excel 匯入 → 自動比對班別 → 缺漏人工補齊</div>
      </header>

      <section class="mi-grid">

        <!-- 匯入 -->
        <div class="card mi-card">
          <div class="card__head">
            <h2>匯入檔案</h2>
          </div>
          <div class="card__body">
            <div class="mi-form">
              <div class="mi-row mi-row--2">
                <div class="mi-field">
                  <label class="mi-label" for="miWithdrawDate">領退日期（withdraw_date）</label>
                  <input class="mi-date" type="date" id="miWithdrawDate" />
                </div>

                <div class="mi-field">
                  <label class="mi-label" for="miFiles">選擇 Excel（檔名請依類型使用 L、K、S、T、W 開頭命名）</label>
                  <input class="mi-file" type="file" id="miFiles" multiple accept=".xlsx,.xls" />
                </div>
              </div>

              <div class="mi-actions">
                <button class="btn btn--primary" type="button" id="miBtnImport">
                  <span class="btn__text">匯入領退資料</span>
                  <span class="btn__spinner" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 日期膠囊 -->
        <div class="card mi-card">
          <div class="card__head">
            <h2>領退日期</h2>
          </div>
          <div class="card__body">
            <div class="mi-dates" id="miDates"></div>
          </div>
        </div>

        <!-- 批次/檔名 -->
        <div class="card mi-card mi-card--wide">
          <div class="card__head">
            <h2>批次／檔名清單</h2>
          </div>
          <div class="card__body">
            <div class="mi-batches" id="miBatches"></div>
          </div>
        </div>

        <!-- 缺 shift -->
        <div class="card mi-card mi-card--wide">
          <div class="card__head mi-head-row">
            <h2>缺班別（shift）補齊</h2>
            <div class="mi-head-actions">
              <button class="btn btn--info" type="button" id="miBtnOpenShift">補齊班別</button>
            </div>
          </div>
          <div class="card__body">
            <div class="mi-missing" id="miMissing"></div>
          </div>
        </div>

      </section>
    </div>
  </main>

  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>