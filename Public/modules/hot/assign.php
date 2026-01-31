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
  'assets/css/hot_assign.css',
  'assets/css/ui_modal.css',
  'assets/css/ui_toast.css',
  'assets/css/motion.css',
];
$pageJs = [
  // 先定義子模組（會掛 window.HotAssignLeft/Right/Modals）
  'assets/js/hot_assign_left.js',
  'assets/js/hot_assign_right.js',
  'assets/js/hot_assign_modals.js',

  // 最後才跑主控（DOMContentLoaded 時 init）
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
      <p class="page-sub">左表僅顯示「hot_tools 曾被配賦過」的車輛；停用車仍顯示並註記。左表刪除＝解除該車全部配賦（需二次確認）。</p>
    </section>

    <section class="hot-split">
      <!-- LEFT: vehicles -->
      <aside class="hot-pane hot-pane--left card card--flat">
        <div class="hot-pane__head">
          <div class="hot-pane__title">
            <h2>車輛清單</h2>
            <div class="hot-pane__hint">來源：hot_tools vehicle_id DISTINCT</div>
          </div>

          <div class="hot-actions" id="hotAssignLeftActions" data-mode="VIEW">
            <button class="btn btn--primary" type="button" id="btnVehAdd">新增</button>
            <button class="btn btn--secondary" type="button" id="btnVehEdit">編輯</button>

            <button class="btn btn--primary" type="button" id="btnVehSave" hidden>儲存</button>
            <button class="btn btn--ghost" type="button" id="btnVehCancel" hidden>取消</button>
          </div>
        </div>

        <div class="hot-pane__body">
          <div class="hot-tableWrap" id="hotVehWrap">
            <table class="table hot-table hot-table--veh" aria-label="車輛配賦清單">
              <thead>
                <tr>
                  <th>車輛編號</th>
                  <th>車牌</th>
                  <th>狀態</th>
                  <th>已配賦件數</th>
                  <th>功能</th>
                </tr>
              </thead>
              <tbody id="tbHotVeh">
                <tr class="hot-empty">
                  <td colspan="5">尚無配賦車輛</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="hot-footNote">
            <span class="hot-dot hot-dot--info"></span>
            點擊車輛列 → 右表顯示該車配賦工具。
          </div>
        </div>
      </aside>

      <!-- RIGHT: assigned tools for vehicle -->
      <section class="hot-pane hot-pane--right card card--flat">
        <div class="hot-pane__head">
          <div class="hot-pane__title">
            <h2>配賦工具</h2>
            <div class="hot-pane__hint">
              <span id="hotActiveVehLabel">未選取車輛</span>
            </div>
          </div>

          <div class="hot-actions hot-actions--right" id="hotAssignRightActions" data-mode="VIEW">
            <button class="btn btn--primary" type="button" id="btnAssignAdd">新增配賦</button>
            <button class="btn btn--info" type="button" id="btnAssignMove">移轉進來</button>
          </div>
        </div>

        <div class="hot-pane__body">
          <div class="hot-tableWrap" id="hotAssignWrap">
            <table class="table hot-table hot-table--assign" aria-label="該車配賦工具清單">
              <thead>
                <tr>
                  <th>分類</th>
                  <th>工具編號</th>
                  <th>檢驗日期</th>
                  <th>備註</th>
                  <th>功能</th>
                </tr>
              </thead>
              <tbody id="tbHotAssign">
                <tr class="hot-empty">
                  <td colspan="5">請先選取左側車輛</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="hot-footNote">
            <span class="hot-dot hot-dot--warn"></span>
            解除歸屬＝將工具 vehicle_id 設為 NULL；移轉＝從其他車改配到本車。
          </div>
        </div>
      </section>
    </section>

    <!-- ============== Modals ============== -->

    <!-- (1) 新增車輛（必須至少一筆工具配賦） -->
    <div class="modal-backdrop" id="modalVehAdd" hidden>
      <div class="modal-panel modal-panel--wide" role="dialog" aria-modal="true" aria-labelledby="mVehAddTitle">
        <div class="modal__head">
          <div class="modal__title" id="mVehAddTitle">新增車輛配賦</div>
          <button class="btn btn--ghost" type="button" data-close-modal="modalVehAdd">關閉</button>
        </div>

        <div class="modal__body">
          <div class="hot-form">
            <div class="hot-field">
              <label class="form-label" for="mVehPick">車輛<span class="hot-req">*</span></label>
              <select id="mVehPick" class="input">
                <option value="">請選擇車輛</option>
                <!-- JS inject：排除已存在於 hot_tools.vehicle_id 的車；停用車可選並註記 -->
              </select>
              <div class="hot-helpText2">停用車可選，將顯示「停用中」註記。</div>
            </div>

            <div class="hot-assignGrid">
              <div class="hot-assignGrid__head">
                <div class="hot-assignGrid__title">工具明細（至少 1 列）</div>
                <button class="btn btn--secondary" type="button" id="btnAddRow">新增一列</button>
              </div>

              <div class="hot-rows" id="mVehRows">
                <!-- JS render rows -->
                <div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>
              </div>

              <div class="hot-dynHint" id="mVehDynHint">
                <span class="hot-dot hot-dot--info"></span>
                <span id="mVehDynHintText">提示：選擇分類後顯示「總數 / 已配賦 / 可配賦」</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalVehAdd">取消</button>
          <button class="btn btn--primary" type="button" id="btnVehAddSubmit">儲存</button>
        </div>
      </div>
    </div>

    <!-- (2) 左表刪除（二次確認：解除該車全部配賦） -->
    <div class="modal-backdrop" id="modalVehDelete" hidden>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="mVehDelTitle">
        <div class="modal__head">
          <div class="modal__title" id="mVehDelTitle">解除該車全部配賦確認</div>
        </div>
        <div class="modal__body">
          <div class="hot-confirm">
            <div class="hot-confirm__row">
              <div class="hot-confirm__k">車輛</div>
              <div class="hot-confirm__v" id="mVehDelMeta">-</div>
            </div>
            <div class="hot-confirm__row">
              <div class="hot-confirm__k">將解除件數</div>
              <div class="hot-confirm__v" id="mVehDelCount">-</div>
            </div>
            <div class="hot-confirm__row">
              <div class="hot-confirm__k">工具摘要</div>
              <div class="hot-confirm__v" id="mVehDelTools">-</div>
            </div>
            <div class="hot-dangerNote">
              確認後將執行：UPDATE hot_tools SET vehicle_id = NULL WHERE vehicle_id = ?
            </div>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalVehDelete">取消</button>
          <button class="btn btn--danger" type="button" id="btnVehDeleteSubmit">確認解除</button>
        </div>
      </div>
    </div>
    <!-- (3) 右表：新增配賦（只能選未配賦工具） -->
    <div class="modal-backdrop" id="modalAssignAdd" hidden>
      <div class="modal-panel modal-panel--wide" role="dialog" aria-modal="true" aria-labelledby="mAssignAddTitle">
        <div class="modal__head">
          <div class="modal__title" id="mAssignAddTitle">新增配賦（加入未配賦工具）</div>
          <button class="btn btn--ghost" type="button" data-close-modal="modalAssignAdd">關閉</button>
        </div>

        <div class="modal__body">
          <div class="hot-form">
            <div class="hot-helpText2">
              目前車輛：<b id="mAssignAddVehLabel">-</b>（只能加入「未配賦」工具）
            </div>

            <div class="hot-assignGrid">
              <div class="hot-assignGrid__head">
                <div class="hot-assignGrid__title">工具明細（至少 1 列）</div>
                <button class="btn btn--secondary" type="button" id="btnAssignAddRow">新增一列</button>
              </div>

              <div class="hot-rows" id="mAssignAddRows">
                <div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>
              </div>

              <div class="hot-dynHint">
                <span class="hot-dot hot-dot--info"></span>
                <span id="mAssignAddHint">提示：選擇分類後顯示可選工具</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalAssignAdd">取消</button>
          <button class="btn btn--primary" type="button" id="btnAssignAddSubmit">儲存</button>
        </div>
      </div>
    </div>
    <!-- (4) 右表：移轉進來（從其他車移轉） -->
    <div class="modal-backdrop" id="modalAssignMove" hidden>
      <div class="modal-panel modal-panel--wide" role="dialog" aria-modal="true" aria-labelledby="mAssignMoveTitle">
        <div class="modal__head">
          <div class="modal__title" id="mAssignMoveTitle">移轉進來（從其他車改配到本車）</div>
          <button class="btn btn--ghost" type="button" data-close-modal="modalAssignMove">關閉</button>
        </div>

        <div class="modal__body">
          <div class="hot-form">
            <div class="hot-helpText2">
              目前車輛：<b id="mAssignMoveVehLabel">-</b>（可移轉「其他車」已配賦工具）
            </div>

            <div class="hot-assignGrid">
              <div class="hot-assignGrid__head">
                <div class="hot-assignGrid__title">工具明細（至少 1 列）</div>
                <button class="btn btn--secondary" type="button" id="btnAssignMoveRow">新增一列</button>
              </div>

              <div class="hot-rows" id="mAssignMoveRows">
                <div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>
              </div>

              <div class="hot-dynHint">
                <span class="hot-dot hot-dot--warn"></span>
                <span id="mAssignMoveHint">提示：清單只列出「非本車」且「已配賦」工具</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalAssignMove">取消</button>
          <button class="btn btn--info" type="button" id="btnAssignMoveSubmit">確認移轉</button>
        </div>
      </div>
    </div>
    <!-- (5) 右表：解除單筆工具配賦確認 -->
    <div class="modal-backdrop" id="modalToolUnassign" hidden>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="mToolUnTitle">
        <div class="modal__head">
          <div class="modal__title" id="mToolUnTitle">解除歸屬確認</div>
        </div>
        <div class="modal__body">
          <div class="hot-confirm">
            <div class="hot-confirm__row">
              <div class="hot-confirm__k">工具</div>
              <div class="hot-confirm__v" id="mToolUnMeta">-</div>
            </div>
            <div class="hot-dangerNote">
              確認後將執行：UPDATE hot_tools SET vehicle_id = NULL WHERE id = ?
            </div>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalToolUnassign">取消</button>
          <button class="btn btn--danger" type="button" id="btnToolUnSubmit">確認解除</button>
        </div>
      </div>
    </div>

  </main>

  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>