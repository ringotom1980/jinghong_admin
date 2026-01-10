/* Path: Public/assets/js/mat_edit_category_materials.js
 * 說明: 右卡「分類與材料歸屬」
 * - 初始：只有「編輯」
 * - 編輯模式：每列顯示「變更材料組合」按鈕，右上「編輯」變「儲存更新」（此按鈕=完成，因為每次 modal 儲存會直接更新 DB）
 * - 點「變更材料組合」：
 *   - 打 API 取材料清單 + 已選 + 禁選狀態
 *   - modal 複選 → 點「儲存組合」直接更新資料表
 *   - 更新成功 → 關 modal、退出編輯模式、重載右卡資料
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,

    init: function (app) { this.app = app; },

    render: function () {
      var app = this.app;
      if (!app || !app.els) return;

      this.renderAction();

      var cats = app.state.categories || [];
      var cmMap = app.state.cmMap || {};
      var edit = !!app.state.editModeCM;

      if (!app.els.cm) return;

      if (!cats.length) {
        app.els.cm.innerHTML = '<div class="me-note">尚無分類。</div>';
        return;
      }

      var html = '<div class="me-mat">';
      cats.forEach(function (c) {
        var id = String(c.id || '');
        var cm = cmMap[id] || {};
        var text = cm.text || '';
        if (!text && cm.codes && cm.codes.length) text = cm.codes.join(', ');

        html += ''
          + '<div class="me-mat-item" data-id="' + id + '">'
          + '  <div class="me-name">' + escapeHtml(c.name || '') + '</div>'
          + '  <div class="me-mat-codes">' + escapeHtml(text || '—') + '</div>'
          + '  ' + (edit ? ('<button type="button" class="btn btn--ghost" data-act="pick" data-id="' + id + '">變更材料組合</button>') : '')
          + '</div>';
      });
      html += '</div>';

      app.els.cm.innerHTML = html;

      if (edit) {
        app.els.cm.querySelectorAll('[data-act="pick"]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-id');
            if (!id) return;
            Mod.openPicker(Number(id));
          });
        });
      }
    },

    renderAction: function () {
      var app = this.app;
      if (!app || !app.els || !app.els.cmAction) return;

      var edit = !!app.state.editModeCM;

      app.els.cmAction.innerHTML = ''
        + '<button type="button" class="btn btn--ghost" id="meBtnEditCM">' + (edit ? '儲存更新' : '編輯') + '</button>';

      var btn = qs('#meBtnEditCM');
      if (!btn) return;

      btn.addEventListener('click', function () {
        if (!app.state.editModeCM) {
          app.state.editModeCM = true;
          Mod.render();
        } else {
          // 這裡「儲存更新」= 完成（因為每次 modal 儲存已直接更新 DB）
          app.state.editModeCM = false;
          Mod.render();
        }
      });
    },

    openPicker: function (categoryId) {
      var app = this.app;
      if (!global.apiGet || !global.apiPost || !global.MatEditUI) return;

      // 取分類名稱
      var cat = (app.state.categories || []).find(function (x) { return Number(x.id) === Number(categoryId); });
      var title = '變更材料組合：' + (cat ? (cat.name || '') : '');

      global.apiGet('/api/mat/edit_category_materials?action=pick_list&category_id=' + encodeURIComponent(String(categoryId)))
        .then(function (j) {
          if (!j || !j.success) {
            if (global.Toast) global.Toast.show({ type: 'error', title: '載入失敗', message: (j && j.error) ? j.error : 'pick_list error' });
            return;
          }

          var items = (j.data && j.data.items) ? j.data.items : [];

          global.MatEditUI.openMaterialsPicker({
            title: title,
            items: items,
            onConfirm: function (codes) {
              return global.apiPost('/api/mat/edit_category_materials?action=update', {
                category_id: categoryId,
                material_nos: codes
              }).then(function (r) {
                if (!r || !r.success) {
                  if (global.Toast) global.Toast.show({ type: 'error', title: '儲存失敗', message: (r && r.error) ? r.error : 'update error' });
                  return false;
                }

                if (global.Toast) global.Toast.show({ type: 'success', title: '已更新', message: '材料組合已更新' });

                // ✅ 存完即退出編輯模式
                app.state.editModeCM = false;

                // reload cm then render
                return app.loadCategoryMaterials().then(function () {
                  Mod.render();
                  return true;
                });
              });
            }
          });

          return;
        });
    }
  };

  function escapeHtml(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.MatEditCategoryMaterials = Mod;

})(window);
