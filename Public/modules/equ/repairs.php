<?php

/**
 * Path: Public/modules/equ/repairs.php
 * 說明: 工具管理｜維修/保養/購買/租賃（列表 + 新增/編輯 modal）
 * 版型：比照 Public/modules/car/repairs.php
 * 注意：本頁不放「期間/類型/關鍵字/查詢」那排篩選列（車輛維修沒有）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '工具管理｜維修/保養/購買/租賃';

$pageCss = [
    'assets/css/equ_repairs.css',
    // 若你有共用回頂部，保留；沒有就刪掉這行
    'assets/css/ui_back_to_top.css',
];

$pageJs = [
    'assets/js/equ_repairs.js',
    'assets/js/equ_repairs_list.js',
    'assets/js/equ_repairs_modal.js',
    // 若你有共用回頂部，保留；沒有就刪掉這行
    'assets/js/ui_back_to_top.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body data-backtop-target="#equCapsules" class="page-enter">

    <?php require __DIR__ . '/../../partials/header.php'; ?>
    <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

    <main class="page equ-repairs" role="main">
        <section class="page-head">
            <h1>工具管理｜維修/保養/購買/租賃</h1>
            <p class="page-sub">本頁僅提供：工具維修/保養/購買/租賃列表檢視、新增/編輯。</p>
        </section>

        <section class="equ-shell card">
            <header class="equ-head">
                <div class="equ-head__left">
                    <div class="equ-kpi">
                        <div class="equ-kpi__label">共</div>
                        <div class="equ-kpi__value" id="equTotalCount">0</div>
                        <div class="equ-kpi__label">筆</div>
                    </div>
                </div>

                <div class="equ-head__right">
                    <button type="button" class="btn btn--primary" id="equAddBtn">
                        <i class="fa-solid fa-plus"></i>
                        <span>新增紀錄</span>
                    </button>
                </div>
            </header>

            <!-- 比照車輛維修：capsules -->
            <div class="equ-caps" aria-label="時間篩選">
                <div class="equ-caps__list" id="equCapsules"></div>
                <div class="equ-caps__hint" id="equCapsulesHint" hidden>載入中…</div>
            </div>

            <div class="equ-body">
                <div class="equ-tableWrap">
                    <table class="table equ-table" aria-label="工具紀錄列表">
                        <!-- ✅ 欄寬由 colgroup 控制（不要在 th 寫 width） -->
                        <colgroup>
                            <col class="equ-col equ-col--date">     <!-- 日期 -->
                            <col class="equ-col equ-col--type">     <!-- 類型 -->
                            <col class="equ-col equ-col--tool">     <!-- 機具名稱 -->
                            <col class="equ-col equ-col--vendor">   <!-- 廠商 -->
                            <col class="equ-col equ-col--summary">  <!-- 內容摘要 -->
                            <col class="equ-col equ-col--company">  <!-- 公司負擔 -->
                            <col class="equ-col equ-col--team">     <!-- 工班負擔 -->
                            <col class="equ-col equ-col--total">    <!-- 總金額 -->
                            <col class="equ-col equ-col--actions">  <!-- 操作 -->
                        </colgroup>

                        <thead>
                            <tr>
                                <th>日期</th>
                                <th>類型</th>
                                <th>機具名稱</th>
                                <th>廠商</th>
                                <th>內容摘要</th>
                                <th class="num">公司負擔</th>
                                <th class="num">工班負擔</th>
                                <th class="num">總金額</th>
                                <th class="actions">操作</th>
                            </tr>
                        </thead>

                        <tbody id="equTbody"></tbody>
                    </table>

                    <div class="equ-empty" id="equEmpty" hidden>目前沒有紀錄</div>
                    <div class="equ-loading" id="equLoading" hidden>載入中…</div>
                </div>
            </div>
        </section>
    </main>

    <!-- Modal -->
    <div class="equ-modal" id="equModal" aria-hidden="true">
        <div class="equ-modal__backdrop" data-close="1"></div>
        <div class="equ-modal__panel" role="dialog" aria-modal="true" aria-labelledby="equModalTitle">
            <header class="equ-modal__head">
                <h2 id="equModalTitle">新增紀錄</h2>
                <button type="button" class="equ-iconbtn" data-close="1" aria-label="關閉">×</button>
            </header>

            <div class="equ-modal__body">
                <div class="equ-form">
                    <input type="hidden" id="equId" value="0" />

                    <div class="equ-grid">
                        <label class="equ-field">
                            <span>日期</span>
                            <input type="date" id="equDate" />
                        </label>

                        <label class="equ-field">
                            <span>類型</span>
                            <select id="equRepairType">
                                <option value="維修">維修</option>
                                <option value="保養">保養</option>
                                <option value="購買">購買</option>
                                <option value="租賃">租賃</option>
                            </select>
                        </label>

                        <label class="equ-field">
                            <span>機具名稱</span>
                            <input type="text" id="equToolName" placeholder="可直接輸入" list="equToolDatalist" />
                            <datalist id="equToolDatalist"></datalist>
                        </label>

                        <label class="equ-field">
                            <span>廠商</span>
                            <input type="text" id="equVendorName" placeholder="可直接輸入" list="equVendorDatalist" />
                            <datalist id="equVendorDatalist"></datalist>
                        </label>

                        <label class="equ-field equ-field--full">
                            <span>備註</span>
                            <input type="text" id="equNote" maxlength="255" />
                        </label>
                    </div>

                    <div class="equ-items">
                        <div class="equ-items__head">
                            <div class="equ-items__title">明細</div>
                            <button type="button" class="btn btn--secondary" id="equAddItemBtn">新增明細</button>
                        </div>

                        <div class="equ-items__tablewrap">
                            <table class="table equ-items__table">
                                <thead>
                                    <tr>
                                        <th style="width:56px;">序</th>
                                        <th>項目內容</th>
                                        <th class="ta-r" style="width:140px;">公司負擔</th>
                                        <th class="ta-r" style="width:140px;">工班負擔</th>
                                        <th style="width:80px;">刪除</th>
                                    </tr>
                                </thead>
                                <tbody id="equItemsTbody"></tbody>
                            </table>
                        </div>

                        <div class="equ-items__foot">
                            <div class="equ-sum">
                                <div>公司負擔：<b id="equSumCompany">0</b></div>
                                <div>工班負擔：<b id="equSumTeam">0</b></div>
                                <div>總金額：<b id="equSumGrand">0</b></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <footer class="equ-modal__foot">
                <button type="button" class="btn btn--secondary" data-close="1">取消</button>
                <button type="button" class="btn btn--primary" id="equSaveBtn">
                    <span class="btn__text">儲存</span>
                    <span class="btn__spinner" aria-hidden="true"></span>
                </button>
            </footer>
        </div>
    </div>

    <?php require __DIR__ . '/../../partials/footer.php'; ?>
    <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>
