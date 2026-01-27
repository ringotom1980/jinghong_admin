<?php

/**
 * Path: Public/modules/hot/tools.php
 * 說明: 活電工具管理（工具為主 Tool-centric）
 * - 左：分類（hot_items）
 * - 右：工具明細（hot_tools）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '活電工具管理｜工具';
$pageCss = [
  'assets/css/hot_tools.css',
  'assets/css/ui_modal.css',
  'assets/css/ui_toast.css',
  'assets/css/motion.css',
];
$pageJs = [
  // 先掛好（你下一步再貼 JS）
  'assets/js/hot_tools.js',
  'assets/js/hot_tools_items.js',
  'assets/js/hot_tools_list.js',
];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body class="page-enter">

  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page hot-tools" role="main">
    <section class="page-head">
      <h1>活電工具管理｜工具</h1>
      <p class="page-sub">工具分類可新增/編輯/刪除（刪除會連同工具明細一起移除）；工具明細不可刪除，只能新增/編輯/配賦/解除。</p>
    </section>

    <section class="hot-split">
      <!-- LEFT: hot_items -->
      <aside class="hot-pane hot-pane--left card card--flat">
        <div class="hot-pane__head">
          <div class="hot-pane__title">
            <h2>工具分類</h2>
            <div class="hot-pane__hint">hot_items</div>
          </div>

          <div class="hot-actions" id="hotItemsActions" data-mode="VIEW">
            <button class="btn btn--primary" type="button" id="btnItemAdd">新增</button>
            <button class="btn btn--secondary" type="button" id="btnItemEdit">編輯</button>

            <button class="btn btn--primary" type="button" id="btnItemSave" hidden>儲存</button>
            <button class="btn btn--ghost" type="button" id="btnItemCancel" hidden>取消</button>
          </div>
        </div>

        <div class="hot-pane__body">
          <div class="hot-tableWrap" id="hotItemsWrap">
            <table class="table hot-table hot-table--items" aria-label="工具分類表">
              <thead>
                <tr>
                  <th>分類代碼</th>
                  <th>分類名稱</th>
                  <th>工具總數</th>
                  <th>已配賦</th>
                  <th>可配賦</th>
                  <th>功能</th>
                </tr>
              </thead>
              <tbody id="tbHotItems">
                <!-- JS render -->
                <tr class="hot-empty">
                  <td colspan="6">尚無分類資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="hot-footNote">
            <span class="hot-dot hot-dot--info"></span>
            點擊分類列會載入右側工具明細表；刪除會連同明細一起移除，須審慎確認。
          </div>
        </div>
      </aside>

      <!-- RIGHT: hot_tools -->
      <section class="hot-pane hot-pane--right card card--flat">
        <div class="hot-pane__head">
          <div class="hot-pane__title">
            <h2>工具明細</h2>
            <div class="hot-pane__hint">
              <span id="hotActiveItemLabel">未選取分類</span>
            </div>
          </div>

          <div class="hot-actions" id="hotToolsActions" data-mode="VIEW">
            <button class="btn btn--primary" type="button" id="btnToolAdd">新增</button>
            <button class="btn btn--secondary" type="button" id="btnToolEdit">編輯</button>

            <button class="btn btn--primary" type="button" id="btnToolSave" hidden>儲存</button>
            <button class="btn btn--ghost" type="button" id="btnToolCancel" hidden>取消</button>
          </div>
        </div>

        <div class="hot-pane__body">
          <div class="hot-tableWrap hot-tableWrap--fixedHead">

            <!-- 固定表頭（不捲） -->
            <div class="hot-tableHead">
              <table class="table hot-table hot-table--tools">
                <thead>
                  <tr>
                    <th>工具編號</th>
                    <th>檢驗日期</th>
                    <th>已配賦車輛</th>
                    <th>備註</th>
                  </tr>
                </thead>
              </table>
            </div>

            <!-- 只捲這裡 -->
            <div class="hot-tableBody" id="hotToolsScroll">
              <table class="table hot-table hot-table--tools">
                <tbody id="tbHotTools">
                  <tr class="hot-empty">
                    <td colspan="4">請先選取左側分類</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <div class="hot-footNote">
            <span class="hot-dot hot-dot--warn"></span>
            工具不可刪除；工具編號永遠鎖定。新增/編輯僅調整檢驗日期、配賦車輛與備註。
          </div>
        </div>
      </section>
    </section>

    <!-- ============== Modals ============== -->

    <!-- (1) 新增分類 -->
    <div class="modal-backdrop" id="modalItemAdd" hidden>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="mItemAddTitle">
        <div class="modal__head">
          <div class="modal__title" id="mItemAddTitle">新增分類</div>
          <button class="btn btn--ghost" type="button" data-close-modal="modalItemAdd">關閉</button>
        </div>
        <div class="modal__body">
          <div class="hot-form">
            <div class="hot-field">
              <label class="form-label" for="mItemName">分類名稱<span class="hot-req">*</span></label>
              <input id="mItemName" type="text" class="input" autocomplete="off" placeholder="例：絕緣毯">
            </div>
            <div class="hot-field hot-field--row">
              <div>
                <label class="form-label" for="mItemQty">初始數量 qty<span class="hot-req">*</span></label>
                <input id="mItemQty" type="number" class="input" min="1" step="1" value="1">
              </div>
              <div class="hot-helpBox">
                <div class="hot-helpTitle">系統行為</div>
                <div class="hot-helpText">分類代碼由系統自動取得（A→B→…）；並依 qty 自動產生工具編號。</div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalItemAdd">取消</button>
          <button class="btn btn--primary" type="button" id="btnItemAddSubmit">建立</button>
        </div>
      </div>
    </div>

    <!-- (2) 刪除分類（二次確認：硬刪 + 連帶刪工具） -->
    <div class="modal-backdrop" id="modalItemDelete" hidden>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="mItemDelTitle">
        <div class="modal__head">
          <div class="modal__title" id="mItemDelTitle">刪除分類確認</div>
        </div>
        <div class="modal__body">
          <div class="hot-confirm">
            <div class="hot-confirm__row">
              <div class="hot-confirm__k">分類</div>
              <div class="hot-confirm__v" id="mItemDelMeta">-</div>
            </div>
            <div class="hot-confirm__row">
              <div class="hot-confirm__k">工具總數</div>
              <div class="hot-confirm__v" id="mItemDelTotal">-</div>
            </div>
            <div class="hot-confirm__row">
              <div class="hot-confirm__k">已配賦</div>
              <div class="hot-confirm__v" id="mItemDelAssigned">-</div>
            </div>
            <div class="hot-confirm__row">
              <div class="hot-confirm__k">配賦摘要</div>
              <div class="hot-confirm__v" id="mItemDelVehicles">-</div>
            </div>

            <div class="hot-dangerNote">
              此操作為硬刪，將連帶刪除該分類全部工具（不可復原）。
            </div>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalItemDelete">取消</button>
          <button class="btn btn--danger" type="button" id="btnItemDeleteSubmit">確認刪除</button>
        </div>
      </div>
    </div>

    <!-- (3) 新增工具（顯示試算編號範圍） -->
    <div class="modal-backdrop" id="modalToolAdd" hidden>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="mToolAddTitle">
        <div class="modal__head">
          <div class="modal__title" id="mToolAddTitle">新增工具</div>
          <button class="btn btn--ghost" type="button" data-close-modal="modalToolAdd">關閉</button>
        </div>
        <div class="modal__body">
          <div class="hot-form">
            <div class="hot-field">
              <label class="form-label" for="mToolQty">新增數量 qty<span class="hot-req">*</span></label>
              <input id="mToolQty" type="number" class="input" min="1" step="1" value="1">
            </div>

            <div class="hot-field hot-field--row">
              <div>
                <label class="form-label" for="mToolInspectDate">檢驗日期（可空）</label>
                <input id="mToolInspectDate" type="date" class="input">
              </div>
              <div>
                <label class="form-label" for="mToolVehicle">已配賦車輛（可空）</label>
                <select id="mToolVehicle" class="input">
                  <option value="">（不配賦）</option>
                  <!-- JS inject vehicles -->
                </select>
              </div>
            </div>

            <div class="hot-field">
              <label class="form-label" for="mToolNote">備註（可空）</label>
              <input id="mToolNote" type="text" class="input" placeholder="本次新增套用同一備註">
            </div>

            <div class="hot-rangeHint" id="mToolRangeHint">
              本次將新增編號範圍：<strong id="mToolRangeText">-</strong>
              <div class="hot-rangeSub">（由後端試算，不實際寫入）</div>
            </div>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" type="button" data-close-modal="modalToolAdd">取消</button>
          <button class="btn btn--primary" type="button" id="btnToolAddSubmit">建立</button>
        </div>
      </div>
    </div>

  </main>
  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>