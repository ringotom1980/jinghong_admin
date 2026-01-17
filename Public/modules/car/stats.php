<?php

/**
 * Path: Public/modules/car/stats.php
 * 說明: 車輛管理｜維修統計（左彙總 + 右明細 + Capsules + 列印入口）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '車輛管理｜維修統計';

$pageCss = [
    'assets/css/car_stats.css',
];

$pageJs = [
    'assets/js/car_stats.js',
    'assets/js/car_stats_capsules.js',
    'assets/js/car_stats_summary.js',
    'assets/js/car_stats_details.js',
    'assets/js/car_stats_print.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body class="page-enter">

    <?php require __DIR__ . '/../../partials/header.php'; ?>
    <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

    <main class="page car-stats" role="main">
        <section class="page-head">
            <h1>車輛管理｜維修統計</h1>
            <p class="page-desc">左側彙總、右側明細；列印輸出與頁面呈現分離。</p>
        </section>

        <section class="cs-toolbar" aria-label="統計條件區">
            <div class="cs-capsules" id="csCapsules" aria-label="期間選擇"></div>

            <div class="cs-toolbar__right">
                <button type="button" class="btn cs-printBtn" id="csPrintBtn">
                    <i class="fa-solid fa-print" aria-hidden="true"></i>
                    <span>列印</span>
                </button>
            </div>
        </section>

        <section class="cs-grid" aria-label="維修統計內容">
            <div class="cs-panel">
                <div class="cs-panel__head">
                    <h2>車輛彙總</h2>
                    <div class="cs-panel__meta" id="csSummaryMeta"></div>
                </div>
                <div class="cs-tableWrap">
                    <table class="cs-table cs-table--summary" id="csSummaryTable" aria-label="車輛彙總表">
                        <!-- ✅ 百分比欄寬：由 colgroup 控制（比照 repairs） -->
                        <colgroup>
                            <col class="cs-col cs-col--code"> <!-- 車輛編號 -->
                            <col class="cs-col cs-col--plate"> <!-- 車牌 -->
                            <col class="cs-col cs-col--count"> <!-- 次數 -->
                            <col class="cs-col cs-col--company"> <!-- 公司負擔 -->
                            <col class="cs-col cs-col--team"> <!-- 工班負擔 -->
                            <col class="cs-col cs-col--grand"> <!-- 總金額 -->
                            <col class="cs-col cs-col--top3"> <!-- Top3 -->
                        </colgroup>

                        <thead>
                            <tr>
                                <th>車輛編號</th>
                                <th>車牌</th>
                                <th class="num">次數</th>
                                <th class="num">公司負擔</th>
                                <th class="num">工班負擔</th>
                                <th class="num">總金額</th>
                                <th>維修最多(Top3)</th>
                            </tr>
                        </thead>
                        <tbody id="csSummaryBody">
                            <tr>
                                <td colspan="7" class="cs-empty">載入中…</td>
                            </tr>
                        </tbody>
                    </table>

                </div>
            </div>

            <div class="cs-panel">
                <div class="cs-panel__head">
                    <h2>維修明細</h2>
                    <div class="cs-panel__meta" id="csDetailsMeta"></div>
                </div>
                <div class="cs-tableWrap">
                    <table class="cs-table cs-table--details" id="csDetailsTable" aria-label="維修明細表">
                        <!-- ✅ 百分比欄寬：由 colgroup 控制（比照 repairs） -->
                        <colgroup>
                            <col class="cs-col cs-col--code"> <!-- 車輛編號 -->
                            <col class="cs-col cs-col--date"> <!-- 維修日期 -->
                            <col class="cs-col cs-col--content"> <!-- 維修內容 -->
                            <col class="cs-col cs-col--company"> <!-- 公司負擔 -->
                            <col class="cs-col cs-col--team"> <!-- 工班負擔 -->
                            <col class="cs-col cs-col--grand"> <!-- 總金額 -->
                        </colgroup>

                        <thead>
                            <tr>
                                <th>車輛編號</th>
                                <th>維修日期</th>
                                <th>維修內容</th>
                                <th class="num">公司負擔</th>
                                <th class="num">工班負擔</th>
                                <th class="num">總金額</th>
                            </tr>
                        </thead>
                        <tbody id="csDetailsBody">
                            <tr>
                                <td colspan="6" class="cs-empty">請先選擇車輛…</td>
                            </tr>
                        </tbody>
                    </table>

                </div>
            </div>
        </section>

        <!-- Print Modal（簡單版，避免依賴 ui_modal 的內部 API） -->
        <div class="cs-modal" id="csPrintModal" aria-hidden="true" role="dialog" aria-modal="true" aria-label="列印選項">
            <div class="cs-modal__backdrop" data-close="1"></div>
            <div class="cs-modal__panel">
                <div class="cs-modal__head">
                    <div class="cs-modal__title">列印</div>
                    <button type="button" class="cs-modal__close" data-close="1" aria-label="關閉">
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="cs-modal__body">
                    <div class="cs-radio">
                        <label><input type="radio" name="csPrintType" value="summary" checked> 列印維修統計表</label>
                        <label><input type="radio" name="csPrintType" value="all_details"> 列印各車維修明細表</label>
                        <label><input type="radio" name="csPrintType" value="vehicle_details"> 僅列印目前車輛維修明細</label>
                    </div>
                    <p class="cs-hint">
                        提醒：列印版面由 print.css / 專用 print CSS 控制；本頁只負責資料與流程。
                    </p>
                </div>

                <div class="cs-modal__foot">
                    <button type="button" class="btn btn-ghost" data-close="1">取消</button>
                    <button type="button" class="btn btn-primary" id="csPrintConfirm">確認列印</button>
                </div>
            </div>
        </div>

    </main>

    <?php require __DIR__ . '/../../partials/footer.php'; ?>
    <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>