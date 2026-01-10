/* Path: Public/assets/js/mat_edit_reconciliation.js
 * 說明: 對帳資料（日期選擇器 + 儲存對帳資料）
 * - 初始日期=今天
 * - 儲存時判斷 mat_issue_items.withdraw_date 是否有匯入資料
 *   - 無 → 提示確認
 *   - 有 → 直接儲存
 * - 編輯分類模式時：日期/對帳 input/儲存按鈕都鎖起來
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,

    init: function (app) { this.app = app; },

    renderTop: function () {
      var app = this.app;
      if (!app || !app.els || !app.els.reconTop) return;

      var d = app.state.date || '';

      app.els.reconTop.innerHTML = ''
        + '<div class="me-recon-row">'
        + '  <div class="me-field">'
        + '    <div class="me-label">提領日期</div>'
        + '    <input type="date" class="me-date" id="meReconDate" value="' + d + '">'
        + '  </div>'
        + '  <div class="me-actions">'
        + '    <button type="button" class="btn btn--primary" id="meBtnSaveRecon">儲存對帳資料</button>'
        + '  </div>'
        + '</div>';

      var dateEl = qs('#meReconDate');
      var btnSave = qs('#meBtnSaveRecon');

      if (dateEl) {
        dateEl.addEventListener('change', function () {
          var v = String(dateEl.value || '').trim();
          if (!v) return;
          app.state.date = v;
          app.loadReconciliation(v).then(function () {
            if (global.MatEditCategories && global.MatEditCategories.render) global.MatEditCategories.render();
          });
        });
      }

      if (btnSave) {
        btnSave.addEventListener('click', function () {
          Mod.saveRecon(false);
        });
      }

      this.applyLockState();
    },

    applyLockState: function () {
      var app = this.app;
      var lock = !!(app && app.state && app.state.editModeCats); // 編輯分類模式
      var dateEl = qs('#meReconDate');
      var btnSave = qs('#meBtnSaveRecon');

      if (dateEl) dateEl.disabled = lock;
      if (btnSave) btnSave.disabled = lock;

      // ✅ A-2：鎖住對帳 input
      (app.state.categories || []).forEach(function (c) {
        var id = String(c.id || '');
        var input = qs('#meQty-' + id);
        if (input) input.disabled = lock;
      });
    },

    // force=true 表示使用者已確認日期沒匯入也要存
    saveRecon: function (force) {
      var app = this.app;
      if (!app || !global.apiPost) return;

      var dateEl = qs('#meReconDate');
      var d = dateEl ? String(dateEl.value || '').trim() : (app.state.date || '');
      if (!d) {
        if (global.Toast) global.Toast.show({ type: 'warning', title: '缺少日期', message: '請選擇提領日期' });
        return;
      }

      // 收集：分類 × qty（空值視為 0）
      var items = [];
      (app.state.categories || []).forEach(function (c) {
        var id = String(c.id || '');
        var input = qs('#meQty-' + id);
        var v = input ? String(input.value || '').trim() : '';
        var n = (v === '') ? 0 : Number(v);
        if (!isFinite(n)) n = 0;
        items.push({ category_id: Number(id), qty: n });
      });

      // 轉成 values map：{ "category_id": qty }
      var values = {};
      items.forEach(function (it) {
        values[String(it.category_id)] = it.qty;
      });

      return global.apiPost('/api/mat/edit_reconciliation?action=save', {
        // ✅ 兼容你的後端（你貼的 API 是吃 payload.action / withdraw_date / values / confirm）
        action: 'save',
        withdraw_date: d,
        values: values,
        confirm: !!force

        // 若你後端 service 其實是吃 items，也可同時帶著不影響：
        // items: items,
      }).then(function (j) {
        if (!j || !j.success) {
          if (global.Toast) global.Toast.show({ type: 'error', title: '儲存失敗', message: (j && j.error) ? j.error : 'save error' });
          return;
        }

        // ✅ 你的後端回 need_confirm（不是 confirm_required）
        if (j.data && j.data.need_confirm) {
          if (global.Modal && global.Modal.confirmChoice) {
            global.Modal.confirmChoice(
              '日期確認',
              j.data.message || ('提領時間為' + d + '當日尚未匯入提領資料，要儲存的提領日期是否正確'),
              function () { Mod.saveRecon(true); },  // 仍要儲存 → confirm=true
              function () { },                      // 取消
              { confirmText: '仍要儲存', cancelText: '取消' }
            );
          } else {
            // 保底（避免完全沒反應）
            if (confirm(j.data.message || '當日尚未匯入提領資料，仍要儲存嗎？')) Mod.saveRecon(true);
          }
          return;
        }

        if (global.Toast) global.Toast.show({ type: 'success', title: '已儲存', message: '對帳資料已更新' });

        // reload recon to normalize
        app.loadReconciliation(d).then(function () {
          if (global.MatEditCategories && global.MatEditCategories.render) global.MatEditCategories.render();
        });
      });
    }
  };

  global.MatEditReconciliation = Mod;

})(window);
