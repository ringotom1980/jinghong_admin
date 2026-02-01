<?php

/**
 * Path: Public/modules/hot/assign.php
 * 說明: 活電工具配賦表（車輛 × 配賦工具）
 * - 左：車輛清單（來源：hot_tools 實際有配賦過的車）
 * - 右：該車配賦工具清單（含新增配賦/移轉/解除）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '活電工具管理｜配賦表';
$pageCss = [
  'assets/css/ui_modal.css',
  'assets/css/ui_toast.css',
  'assets/css/motion.css',
  'assets/css/hot_assign.css',
];
$pageJs = [
  // 子模組
  'assets/js/hot_assign_left.js',
  'assets/js/hot_assign_right.js',
  'assets/js/hot_assign_modals.js',

  // 主控
  'assets/js/hot_assign.js',
];

?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body class="page-enter">

  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page hot-assign" role="main">
    <section class="page-head">
      <h1>活電工具管理｜配賦表</h1>
      <p class="page-sub">左表僅顯示「有配賦活電工具」的車輛；若已停用車仍顯示並註記。左表刪除＝解除該車全部配賦。</p>
    </section>

    <section class="hot-split">
      <!-- LEFT: vehicles -->
      <aside class="hot-pane hot-pane--left card card--flat">
        <div class="hot-pane__head">
          <div class="hot-pane__title">
            <h2>車輛清單</h2>
            <div class="hot-pane__hint">已配賦活電工具車輛清單(可新增配賦)</div>
          </div>

          <div class="hot-actions" id="hotAssignLeftActions" data-mode="VIEW">
            <button class="btn btn--primary" type="button" id="btnVehAdd">新增</button>
            <button class="btn btn--secondary" type="button" id="btnVehEdit">編輯</button>

            <button class="btn btn--primary" type="button" id="btnVehSave" hidden>儲存</button>
            <button class="btn btn--ghost" type="button" id="btnVehCancel" hidden>取消</button>
          </div>
        </div>

        <div class="hot-pane__body">
          <div class="hot-tableWrap hot-tableWrap--fixed" id="hotVehWrap">

            <!-- head（不捲動） -->
            <table class="table hot-table hot-table--veh hot-table--head" aria-hidden="true">
              <colgroup>
                <col style="width:15%">
                <col style="width:20%">
                <col style="width:15%">
                <col style="width:20%">
                <col style="width:30%">
              </colgroup>
              <thead>
                <tr>
                  <th>車輛編號</th>
                  <th>車牌</th>
                  <th>狀態</th>
                  <th>已配賦件數</th>
                  <th>功能</th>
                </tr>
              </thead>
            </table>

            <!-- body（只有這裡捲動） -->
            <div class="hot-tableScroll">
              <table class="table hot-table hot-table--veh hot-table--body" aria-label="車輛配賦清單">
                <colgroup>
                  <col style="width:15%">
                  <col style="width:20%">
                  <col style="width:15%">
                  <col style="width:20%">
                  <col style="width:30%">
                </colgroup>
                <tbody id="tbHotVeh">
                  <tr class="hot-empty">
                    <td colspan="5">尚無配賦活電工具的車輛</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <div class="hot-footNote">
            <span class="hot-dot hot-dot--info"></span>
            點擊車輛列 → 右表就會顯示該車配賦的活電工具。
          </div>
        </div>
      </aside>

      <!-- RIGHT: assigned tools for vehicle -->
      <section class="hot-pane hot-pane--right card card--flat">
        <div class="hot-pane__head">
          <div class="hot-pane__title">
            <h2>配賦活電工具</h2>
            <div class="hot-pane__hint">
              <span id="hotActiveVehLabel">未選取車輛</span>
            </div>
          </div>

          <div class="hot-actions hot-actions--right" id="hotAssignRightActions" data-mode="VIEW">
            <!-- VIEW -->
            <button class="btn btn--secondary" type="button" id="btnAssignBatchDate">整批更新檢驗日期</button>
            <button class="btn btn--primary" type="button" id="btnAssignAdd">新增</button>
            <button class="btn btn--secondary" type="button" id="btnAssignEdit">編輯</button>

            <!-- EDIT -->
            <button class="btn btn--primary" type="button" id="btnAssignSave" hidden>儲存</button>
            <button class="btn btn--ghost" type="button" id="btnAssignCancel" hidden>取消</button>
          </div>
        </div>

        <div class="hot-pane__body">
          <div class="hot-tableWrap hot-tableWrap--fixed" id="hotAssignWrap">

            <!-- head（不捲動） -->
            <table class="table hot-table hot-table--assign hot-table--head" aria-hidden="true">
              <colgroup>
                <col style="width:20%">
                <col style="width:15%">
                <col style="width:20%">
                <col style="width:20%">
                <col style="width:25%">
              </colgroup>
              <thead>
                <tr>
                  <th>分類</th>
                  <th>工具編號</th>
                  <th>檢驗日期</th>
                  <th>更換日期</th>
                  <th>功能</th>
                </tr>
              </thead>
            </table>

            <!-- body（只有這裡捲動） -->
            <div class="hot-tableScroll">
              <table class="table hot-table hot-table--assign hot-table--body" aria-label="該車配賦工具清單">
                <colgroup>
                  <col style="width:20%">
                  <col style="width:15%">
                  <col style="width:20%">
                  <col style="width:20%">
                  <col style="width:25%">
                </colgroup>
                <tbody id="tbHotAssign">
                  <tr class="hot-empty">
                    <td colspan="5">請先選取左側車輛</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <div class="hot-footNote">
            <span class="hot-dot hot-dot--warn"></span>
            解除＝將該列活電工具取消配賦到該車輛；移轉＝將該列活電工具指定配賦到其它車輛。
          </div>
        </div>
      </section>
    </section>

  </main>

  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>