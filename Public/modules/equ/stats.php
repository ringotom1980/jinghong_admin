<?php
/**
 * Path: Public/modules/equ/stats.php
 * 說明: 工具管理｜維修統計（左彙總=廠商 / 右明細=廠商明細 + Capsules + 列印入口）
 * - 欄位定版：
 *   左表：廠商 / 維修次數 / 公司負擔 / 工班負擔 / 總金額 / 維修最多(Top3=工具名稱)
 *   右表：維修日期 / 類型 / 項目內容 / 公司負擔 / 工班負擔 / 總金額
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '工具管理｜維修統計';

$pageCss = [
  'assets/css/equ_stats.css',
  'assets/css/ui_back_to_top.css',
];

$pageJs = [
  'assets/js/equ_stats.js',
  'assets/js/equ_stats_capsules.js',
  'assets/js/equ_stats_summary.js',
  'assets/js/equ_stats_details.js',
  'assets/js/equ_stats_print.js',
  'assets/js/ui_back_to_top.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body class="page-enter">

  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page equ-stats" role="main">
    <section class="page-head">
      <h1>工具管理｜維修統計</h1>
      <p class="page-desc">左側廠商彙總、右側廠商明細；列印輸出與頁面呈現分離。</p>
    </section>

    <section class="es-toolbar" aria-label="統計條件區">
      <div class="es-capsules" id="esCapsules" aria-label="期間選擇"></div>

      <div class="es-toolbar__right">
        <button type="button" class="btn es-printBtn" id="esPrintBtn">
          <i class="fa-solid fa-print" aria-hidden="true"></i>
          <span>列印</span>
        </button>
      </div>
    </section>

    <section class="es-grid" aria-label="工具維修統計內容">

      <!-- 左：廠商彙總 -->
      <div class="es-panel">
        <div class="es-panel__head">
          <h2>廠商彙總</h2>
          <div class="es-panel__meta" id="esSummaryMeta"></div>
        </div>

        <div class="es-tableWrap">
          <table class="es-table es-table--summary" id="esSummaryTable" aria-label="廠商彙總表">
            <colgroup>
              <col class="es-col es-col--vendor">  <!-- 廠商 -->
              <col class="es-col es-col--count">   <!-- 次數 -->
              <col class="es-col es-col--company"> <!-- 公司負擔 -->
              <col class="es-col es-col--team">    <!-- 工班負擔 -->
              <col class="es-col es-col--grand">   <!-- 總金額 -->
              <col class="es-col es-col--top3">    <!-- Top3(工具名稱) -->
            </colgroup>

            <thead>
              <tr>
                <th>廠商</th>
                <th class="num">次數</th>
                <th class="num">公司負擔</th>
                <th class="num">工班負擔</th>
                <th class="num">總金額</th>
                <th>維修最多(Top3)</th>
              </tr>
            </thead>

            <tbody id="esSummaryBody">
              <tr>
                <td colspan="6" class="es-empty">載入中…</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 右：廠商明細 -->
      <div class="es-panel">
        <div class="es-panel__head">
          <h2>維修明細</h2>
          <div class="es-panel__meta" id="esDetailsMeta"></div>
        </div>

        <div class="es-tableWrap">
          <table class="es-table es-table--details" id="esDetailsTable" aria-label="廠商維修明細表">
            <colgroup>
              <col class="es-col es-col--date">    <!-- 維修日期 -->
              <col class="es-col es-col--type">    <!-- 類型 -->
              <col class="es-col es-col--content"> <!-- 項目內容 -->
              <col class="es-col es-col--company"> <!-- 公司負擔 -->
              <col class="es-col es-col--team">    <!-- 工班負擔 -->
              <col class="es-col es-col--grand">   <!-- 總金額 -->
            </colgroup>

            <thead>
              <tr>
                <th>維修日期</th>
                <th>類型</th>
                <th>項目內容</th>
                <th class="num">公司負擔</th>
                <th class="num">工班負擔</th>
                <th class="num">總金額</th>
              </tr>
            </thead>

            <tbody id="esDetailsBody">
              <tr>
                <td colspan="6" class="es-empty">請先選擇廠商…</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>

    <!-- Print Modal（保留殼；目前列印採「直接列印 summary」） -->
    <div class="es-modal" id="esPrintModal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="列印選項">
      <div class="es-modal__backdrop" data-close="1"></div>

      <div class="es-modal__panel">
        <div class="es-modal__head">
          <div class="es-modal__title">列印</div>
          <button type="button" class="es-modal__close" data-close="1" aria-label="關閉">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div class="es-modal__body">
          <div class="es-radio">
            <label class="es-radio__item">
              <input type="radio" name="esPrintType" value="summary" checked>
              <span class="es-radio__text">列印維修統計表</span>
              <span class="es-radio__meta" id="esPrintMetaSummary"></span>
            </label>
          </div>

          <p class="es-hint">提醒：列印內容為「廠商 × 月份」統計矩陣。</p>
        </div>

        <div class="es-modal__foot">
          <button type="button" class="btn btn-ghost" data-close="1">取消</button>
          <button type="button" class="btn btn-primary" id="esPrintConfirm">確認列印</button>
        </div>
      </div>
    </div>

  </main>

  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>
