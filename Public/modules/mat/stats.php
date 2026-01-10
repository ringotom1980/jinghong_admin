<?php
/**
 * Path: Public/modules/mat/stats.php
 * 說明: 統計頁（/mat/stats）
 * - 純統計、純顯示
 * - 不新增 / 不刪除 / 不編輯
 * - 日期僅代表「查詢統計資料的時間點」
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '統計查詢｜領退管理';

// CSS（外掛）
$pageCss = [
  'assets/css/mat_stats.css',
  'assets/css/mat_stats_print.css',
];

// JS（外掛）
$pageJs = [
  'assets/js/mat_stats.js',            // 總控
  'assets/js/mat_stats_capsules.js',   // 日期膠囊
  'assets/js/mat_stats_filter.js',     // 班別切換
  'assets/js/mat_stats_render.js',     // 表格渲染
  'assets/js/mat_stats_print.js',      // 列印
];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body>

  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page mat-stats page-enter" role="main">
    <div class="content">

      <header class="page-head">
        <h1>統計查詢</h1>
        <div class="page-sub">僅顯示統計結果，不提供任何資料異動功能</div>
      </header>

      <!-- 工具列 -->
      <section class="ms-toolbar card">
        <div class="card__head">
          <div class="ms-toolbar__head">
            <h2 class="ms-toolbar__title">
              查詢日期：
              <span class="ms-toolbar__date" id="msSelectedDate">--</span>
            </h2>

            <div class="ms-toolbar__actions">
              <button class="btn" type="button" id="msBtnPrint">
                列印
              </button>
            </div>
          </div>
        </div>

        <div class="card__body">

          <!-- 日期膠囊（近三個月，由 JS 決定資料來源與意義） -->
          <div class="ms-capsules-wrap">
            <div class="ms-capsules" id="msCapsules"></div>
          </div>

          <!-- 班別篩選 -->
          <div class="ms-filter" id="msShiftFilter" role="group" aria-label="班別篩選">
            <button type="button" class="ms-filter__btn is-active" data-shift="all">全部</button>
            <button type="button" class="ms-filter__btn" data-shift="A">A</button>
            <button type="button" class="ms-filter__btn" data-shift="B">B</button>
            <button type="button" class="ms-filter__btn" data-shift="C">C</button>
            <button type="button" class="ms-filter__btn" data-shift="D">D</button>
            <button type="button" class="ms-filter__btn" data-shift="E">E</button>
            <button type="button" class="ms-filter__btn" data-shift="F">F</button>
          </div>

          <!-- 狀態提示 -->
          <div class="ms-status">
            <div class="ms-status__loading" id="msLoading" hidden>載入中…</div>
            <div class="ms-status__error" id="msError" hidden></div>
          </div>

        </div>
      </section>

      <!-- 統計內容（AC / B / D / EF，由 render.js 產生） -->
      <section class="ms-content" id="msContent"></section>

    </div>
  </main>

  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>
</html>
