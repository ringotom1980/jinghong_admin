<?php
/**
 * Path: Public/modules/hot/helmets.php
 * 說明: 安全帽管理（掛在 hot 模組底下）
 * - 以「員工」為主視角：顯示配賦狀態、到期狀態（只算 ASSIGNED）
 * - 庫存區：只列 IN_STOCK 的帽號（不顯示檢驗日）
 * - 批次新增：建議印製號碼 + 確認新增（wrap-around 需檢查 ASSIGNED，存在則禁止）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '活電工具管理｜安全帽';
$pageCss = [
  'assets/css/hot_helmets.css',
  'assets/css/ui_modal.css',
  'assets/css/ui_toast.css',
  'assets/css/motion.css',
];
$pageJs = [
  'assets/js/hot_helmets.js',
];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body class="page-enter">
  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page hot-helmets" role="main">
    <section class="page-head">
      <h1>活電工具管理｜安全帽</h1>
      <p class="page-sub">
        安全帽採人員配賦管理；到期判斷僅針對「已配賦」且有檢驗日期者（半年）。
        庫存帽不要求檢驗日期，也不顯示檢驗日期。
      </p>
    </section>

    <section class="hot-split">

      <!-- LEFT: assignees -->
      <aside class="hot-pane hot-pane--left card card--flat">
        <div class="hot-pane__head">
          <div class="hot-pane__title">
            <h2>員工（配賦狀態）</h2>
            <div class="hot-pane__hint">helmet_assignees + helmets</div>
          </div>
          <div class="hot-actions">
            <button class="btn btn--primary" type="button" id="btnAssigneeAdd">新增員工</button>
            <button class="btn btn--secondary" type="button" id="btnRefreshAll">重新整理</button>
          </div>
        </div>

        <div class="hot-pane__body">
          <div class="hot-toolbar">
            <input id="qAssignees" class="input" type="text" placeholder="搜尋：ID 或 姓名">
          </div>

          <div class="hot-tableWrap">
            <table class="table hot-table hot-table--assignees" aria-label="員工配賦表">
              <thead>
                <tr>
                  <th style="width:22%">員工</th>
                  <th style="width:18%">目前帽號</th>
                  <th style="width:20%">檢驗日期</th>
                  <th style="width:20%">到期狀態</th>
                  <th style="width:20%">操作</th>
                </tr>
              </thead>
              <tbody id="tbAssignees">
                <tr class="hot-empty"><td colspan="5">載入中...</td></tr>
              </tbody>
            </table>
          </div>

          <div class="hot-footNote">
            <span class="hot-dot hot-dot--info"></span>
            到期狀態僅針對已配賦（ASSIGNED）且有檢驗日期者計算（半年）。
          </div>
        </div>
      </aside>

      <!-- RIGHT: stock + batch -->
      <section class="hot-pane hot-pane--right card card--flat">
        <div class="hot-pane__head">
          <div class="hot-pane__title">
            <h2>庫存與批次新增</h2>
            <div class="hot-pane__hint">helmets / helmet_batches</div>
          </div>
          <div class="hot-actions">
            <button class="btn btn--primary" type="button" id="btnSuggestPrint">建議印製號碼</button>
            <button class="btn btn--secondary" type="button" id="btnBatchAdd">確定新增號碼</button>
          </div>
        </div>

        <div class="hot-pane__body">
          <div class="hot-batch card card--soft">
            <div class="hot-batch__row">
              <div class="hot-field">
                <label class="form-label" for="batchQty">新增數量 qty</label>
                <input id="batchQty" class="input" type="number" min="1" max="999" step="1" value="200">
              </div>
              <div class="hot-field hot-field--grow">
                <div class="hot-batch__hint">
                  先按「建議印製號碼」預覽；確認後按「確定新增號碼」寫入庫存。
                  若建議區間內存在「使用中(ASSIGNED)」，系統會禁止新增並提示先更換。
                </div>
              </div>
            </div>

            <div class="hot-batch__preview" id="batchPreview">
              <div class="hot-preview__line">尚未預覽</div>
            </div>
          </div>

          <div class="hot-toolbar">
            <input id="qStock" class="input" type="text" placeholder="搜尋庫存帽號：例如 16E123（或輸入 123）">
            <span class="hot-kpi" id="stockKpi">庫存：-</span>
          </div>

          <div class="hot-tableWrap hot-tableWrap--fixed">
            <table class="table hot-table hot-table--stock hot-table--head" aria-label="庫存表頭">
              <colgroup>
                <col style="width:30%">
                <col style="width:40%">
                <col style="width:30%">
              </colgroup>
              <thead>
                <tr>
                  <th>帽號</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
            </table>

            <div class="hot-tableScroll" aria-label="庫存捲動區">
              <table class="table hot-table hot-table--stock hot-table--body" aria-label="庫存表身">
                <colgroup>
                  <col style="width:30%">
                  <col style="width:40%">
                  <col style="width:30%">
                </colgroup>
                <tbody id="tbStock">
                  <tr class="hot-empty"><td colspan="3">載入中...</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="hot-footNote">
            <span class="hot-dot hot-dot--warn"></span>
            庫存清單只顯示可配賦（IN_STOCK），不顯示檢驗日期（庫存不管到期）。
          </div>
        </div>
      </section>

    </section>

    <!-- Modal: 新增員工 -->
    <div class="modal-backdrop" id="modalAssigneeAdd" hidden>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="mAssigneeAddTitle">
        <div class="modal__head">
          <div class="modal__title" id="mAssigneeAddTitle">新增員工</div>
          <button class="btn btn--ghost" type="button" data-close-modal="modalAssigneeAdd">關閉</button>
        </div>
        <div class="modal__body">
          <div class="hot-form">
            <div class="hot-field">
              <label class="form-label" for="mAssigneeName">姓名<span class="hot-req">*</span></label>
              <input id="mAssigneeName" type="text" class="input" autocomplete="off" placeholder="例：王小明">
            </div>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalAssigneeAdd">取消</button>
          <button class="btn btn--primary" type="button" id="btnAssigneeAddSubmit">建立</button>
        </div>
      </div>
    </div>

    <!-- Modal: 配賦/更換 -->
    <div class="modal-backdrop" id="modalAssign" hidden>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="mAssignTitle">
        <div class="modal__head">
          <div class="modal__title" id="mAssignTitle">配賦安全帽</div>
          <button class="btn btn--ghost" type="button" data-close-modal="modalAssign">關閉</button>
        </div>
        <div class="modal__body">
          <div class="hot-form">
            <div class="hot-field">
              <div class="hot-meta" id="mAssignWho">-</div>
            </div>

            <div class="hot-field hot-field--row">
              <div>
                <label class="form-label" for="mAssignSerial">選擇庫存帽號<span class="hot-req">*</span></label>
                <select id="mAssignSerial" class="input">
                  <option value="">載入中...</option>
                </select>
              </div>
              <div>
                <label class="form-label" for="mAssignInspectDate">檢驗日期<span class="hot-req">*</span></label>
                <input id="mAssignInspectDate" type="date" class="input">
              </div>
            </div>

            <div class="hot-dangerNote">
              檢驗日期為必填（已配賦才需要判斷半年到期）。
            </div>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalAssign">取消</button>
          <button class="btn btn--primary" type="button" id="btnAssignSubmit">確定</button>
        </div>
      </div>
    </div>

  </main>

  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>
</html>
