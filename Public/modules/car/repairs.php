<?php

/**
 * Path: Public/modules/car/repairs.php
 * 說明: 車輛管理｜維修紀錄（列表 + 新增/編輯 modal + 刪除）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '車輛管理｜維修紀錄';

$pageCss = [
    'assets/css/car_repairs.css',
    'assets/css/car_repair_modal.css',
];

$pageJs = [
    'assets/js/car_repairs.js',
    'assets/js/car_repairs_list.js',
    'assets/js/car_repair_modal.js',
    'assets/js/car_repair_items.js',
    'assets/js/car_repair_vendors.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body class="page-enter">

    <?php require __DIR__ . '/../../partials/header.php'; ?>
    <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

    <main class="page car-repairs" role="main">
        <section class="page-head">
            <h1>維修紀錄</h1>
            <p class="page-sub">本頁僅提供：列表檢視、新增/編輯（同一視窗）、刪除。</p>
        </section>

        <section class="cr-shell card">
            <header class="cr-head">
                <div class="cr-head__left">
                    <div class="cr-kpi">
                        <div class="cr-kpi__label">共</div>
                        <div class="cr-kpi__value" id="crTotalCount">0</div>
                        <div class="cr-kpi__label">筆</div>
                    </div>
                </div>

                <div class="cr-head__right">
                    <button type="button" class="btn btn--primary" id="crAddBtn">
                        <i class="fa-solid fa-plus"></i>
                        <span>新增維修紀錄</span>
                    </button>
                </div>
            </header>

            <div class="cr-caps" aria-label="時間篩選">
                <div class="cr-caps__list" id="crCapsules"></div>
                <div class="cr-caps__hint" id="crCapsulesHint" hidden>載入中…</div>
            </div>

            <div class="cr-body">
                <div class="cr-tableWrap">
                    <table class="table cr-table" aria-label="維修紀錄列表">
                        <!-- ✅ 百分比欄寬：由 colgroup 控制（不要在 th 寫 width） -->
                        <colgroup>
                            <col class="cr-col cr-col--no"> <!-- 項次 -->
                            <col class="cr-col cr-col--code"> <!-- 車輛編號 -->
                            <col class="cr-col cr-col--plate"> <!-- 車牌 -->
                            <col class="cr-col cr-col--date"> <!-- 維修日期 -->
                            <col class="cr-col cr-col--vendor"> <!-- 維修廠商 -->
                            <col class="cr-col cr-col--type"> <!-- 類別 -->
                            <col class="cr-col cr-col--mileage"> <!-- 里程 -->
                            <col class="cr-col cr-col--user"> <!-- 使用人 -->
                            <col class="cr-col cr-col--summary"> <!-- 維修項目摘要 -->
                            <col class="cr-col cr-col--total"> <!-- 維修金額 -->
                            <col class="cr-col cr-col--team"> <!-- 工班負擔 -->
                            <col class="cr-col cr-col--company"> <!-- 公司負擔 -->
                            <col class="cr-col cr-col--note"> <!-- 備註 -->
                            <col class="cr-col cr-col--actions"> <!-- 操作 -->
                        </colgroup>

                        <thead>
                            <tr>
                                <th>項次</th>
                                <th>車輛編號</th>
                                <th>車牌</th>
                                <th>維修日期</th>
                                <th>維修廠商</th>
                                <th>類別</th>
                                <th>里程</th>
                                <th>使用人</th>
                                <th>維修項目摘要</th>
                                <th class="num">維修金額</th>
                                <th class="num">工班負擔</th>
                                <th class="num">公司負擔</th>
                                <th>備註</th>
                                <th class="actions">操作</th>
                            </tr>
                        </thead>
                        <tbody id="crTbody"></tbody>
                    </table>

                    <div class="cr-empty" id="crEmpty" hidden>目前沒有維修紀錄</div>
                    <div class="cr-loading" id="crLoading" hidden>載入中…</div>
                </div>
            </div>
        </section>
    </main>

    <?php require __DIR__ . '/../../partials/footer.php'; ?>
    <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>