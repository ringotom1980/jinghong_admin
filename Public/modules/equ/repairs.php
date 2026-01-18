<?php

/**
 * Path: Public/modules/equ/repairs.php
 * 說明: 工具管理｜維修/保養/購買/租賃（列表 + 新增/編輯 modal）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '工具管理｜維修/保養/購買/租賃';

$pageCss = [
    'assets/css/equ_repairs.css',
];

$pageJs = [
    'assets/js/equ_repairs.js',
    'assets/js/equ_repairs_list.js',
    'assets/js/equ_repairs_modal.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body class="page-enter">

    <?php require __DIR__ . '/../../partials/header.php'; ?>
    <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

    <main class="page equ-repairs" role="main">
        <section class="page-head">
            <h1>工具管理｜維修/保養/購買/租賃</h1>
            <div class="page-head__actions">
                <button type="button" class="btn btn--primary" id="equAddBtn">新增紀錄</button>
            </div>
        </section>

        <section class="panel equ-panel">
            <div class="equ-toolbar">
                <div class="equ-toolbar__left">
                    <label class="equ-field">
                        <span>期間</span>
                        <input type="month" id="equMonth" />
                    </label>

                    <label class="equ-field">
                        <span>類型</span>
                        <select id="equType">
                            <option value="">全部</option>
                            <option value="維修">維修</option>
                            <option value="保養">保養</option>
                            <option value="購買">購買</option>
                            <option value="租賃">租賃</option>
                        </select>
                    </label>

                    <label class="equ-field equ-field--grow">
                        <span>關鍵字</span>
                        <input type="text" id="equQ" placeholder="工具/廠商/內容" />
                    </label>

                    <button type="button" class="btn btn--info" id="equSearchBtn">查詢</button>
                </div>
            </div>

            <div class="table-wrap">
                <table class="table equ-table">
                    <thead>
                        <tr>
                            <th style="width:120px;">日期</th>
                            <th style="width:120px;">類型</th>
                            <th style="width:180px;">工具</th>
                            <th style="width:180px;">廠商</th>
                            <th>內容摘要</th>
                            <th class="ta-r" style="width:140px;">公司</th>
                            <th class="ta-r" style="width:140px;">工班</th>
                            <th class="ta-r" style="width:140px;">總額</th>
                            <th style="width:140px;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="equTbody">
                        <tr>
                            <td colspan="9" class="cs-empty">載入中…</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </main>

    <!-- Modal（外殼若你有 ui_modal.css/js 可改成共用） -->
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
                            <span>工具</span>
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
                                        <th class="ta-r" style="width:140px;">公司</th>
                                        <th class="ta-r" style="width:140px;">工班</th>
                                        <th style="width:80px;">刪除</th>
                                    </tr>
                                </thead>
                                <tbody id="equItemsTbody"></tbody>
                            </table>
                        </div>

                        <div class="equ-items__foot">
                            <div class="equ-sum">
                                <div>公司：<b id="equSumCompany">0</b></div>
                                <div>工班：<b id="equSumTeam">0</b></div>
                                <div>總額：<b id="equSumGrand">0</b></div>
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