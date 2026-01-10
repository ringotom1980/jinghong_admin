/* Path: Public/assets/js/mat_edit_categories.js
 * 說明: 左卡「對帳資料（分類×日期）」的分類列表/新增/編輯模式
 * - 右上：新增分類、編輯
 * - 編輯模式：
 *   - 新增分類 disabled
 *   - 對帳 qty input 鎖
 *   - 每列前：□刪除
 *   - 名稱改 input
 *   - 每列後：≡ 可拖曳排序
 *   - 右上編輯 → 儲存更新（一次送出 rename + delete + sort）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,
    _pendingOrder: null,

    init: function (app) { this.app = app; },

    render: function () {
      var app = this.app;
      if (!app || !app.els) return;

      this.renderActions();

      // list
      if (!app.els.recon) return;

      var cats = app.state.categories || [];
      var edit = !!app.state.editModeCats;
      var reconMap = app.state.reconMap || {};

      if (!cats.length) {
        app.els.recon.innerHTML = '<div class="me-note">尚無分類，請先新增分類。</div>';
        return;
      }

      var html = '';
      if (!edit) {
        html += '<div class="me-list">';
        cats.forEach(function (c) {
          var id = String(c.id || '');
          var qty = reconMap[id] !== undefined ? reconMap[id] : 0;
          html += ''
            + '<div class="me-item me-item--noedit" data-id="' + id + '">'
            + '  <div class="me-name">' + escapeHtml(c.name || '') + '</div>'
            + '  <input class="me-qty" id="meQty-' + id + '" type="number" step="0.001" value="' + escapeHtml(String(qty)) + '">'
            + '</div>';
        });
        html += '</div>';
      } else {
        html += '<div class="me-list" id="meCatEditList">';
        cats.forEach(function (c) {
          var id = String(c.id || '');
          var qty = reconMap[id] !== undefined ? reconMap[id] : 0;
          html += ''
            + '<div class="me-item" data-id="' + id + '" draggable="true">'
            + '  <div class="me-del-wrap">'
            + '    <input type="checkbox" class="me-del" id="meDel-' + id + '">'
            + '    <span class="me-del-text">刪除</span>'
            + '  </div>'
            + '  <input class="me-name-input" id="meName-' + id + '" type="text" value="' + escapeHtml(c.name || '') + '">'
            + '  <input class="me-qty" id="meQty-' + id + '" type="number" step="0.001" value="' + escapeHtml(String(qty)) + '" disabled>'
            + '  <div class="me-drag" title="拖曳排序">≡</div>'
            + '</div>';
        });
        html += '</div>';
      }

      app.els.recon.innerHTML = html;

      // drag sort
      if (edit) {
        var listEl = qs('#meCatEditList');
        if (global.MatEditUI && global.MatEditUI.enableDragSort) {
          global.MatEditUI.enableDragSort(listEl, '.me-item', '.me-drag', function (ids) {
            Mod._pendingOrder = ids;
          });
        }
      }

      // lock top controls
      if (global.MatEditReconciliation && global.MatEditReconciliation.applyLockState) {
        global.MatEditReconciliation.applyLockState();
      }
    },

    renderActions: function () {
      var app = this.app;
      if (!app || !app.els || !app.els.reconActions) return;

      var edit = !!app.state.editModeCats;

      // buttons
      app.els.reconActions.innerHTML = ''
        + '<button type="button" class="btn btn--primary" id="meBtnAddCat">新增分類</button>'
        + '<button type="button" class="btn btn--ghost" id="meBtnEditCat">' + (edit ? '儲存更新' : '編輯') + '</button>';

      var btnAdd = qs('#meBtnAddCat');
      var btnEdit = qs('#meBtnEditCat');

      if (btnAdd) {
        btnAdd.disabled = edit; // ✅ 進入編輯模式禁用
        btnAdd.addEventListener('click', function () {
          Mod.createCategory();
        });
      }

      if (btnEdit) {
        btnEdit.addEventListener('click', function () {
          if (!app.state.editModeCats) Mod.enterEditMode();
          else Mod.saveEditMode();
        });
      }
    },

    enterEditMode: function () {
      var app = this.app;
      app.state.editModeCats = true;
      this._pendingOrder = null;
      this.render();
    },

    saveEditMode: function () {
      var app = this.app;
      if (!global.apiPost) return;

      var cats = app.state.categories || [];
      var updates = [];
      var deletes = [];

      cats.forEach(function (c) {
        var id = String(c.id || '');
        var nameEl = qs('#meName-' + id);
        var delEl = qs('#meDel-' + id);

        var newName = nameEl ? String(nameEl.value || '').trim() : (c.name || '');
        if (!newName) newName = (c.name || '').trim();

        if (delEl && delEl.checked) deletes.push(Number(id));
        if (newName !== String(c.name || '').trim()) updates.push({ id: Number(id), name: newName });
      });

      // order
      var order = null;
      if (this._pendingOrder && this._pendingOrder.length) {
        order = this._pendingOrder.map(function (x) { return Number(x); }).filter(function (n) { return isFinite(n); });
      } else {
        // 未拖曳 → 以現有排序送也可以（不送也可）
        order = null;
      }

      return global.apiPost('/api/mat/edit_categories?action=bulk_update', {
        updates: updates,
        deletes: deletes,
        order: order
      }).then(function (j) {
        if (!j || !j.success) {
          if (global.Toast) global.Toast.show({ type: 'error', title: '儲存失敗', message: (j && j.error) ? j.error : 'bulk_update error' });
          return;
        }

        if (global.Toast) global.Toast.show({ type: 'success', title: '已更新', message: '分類已更新' });

        app.state.editModeCats = false;
        Mod._pendingOrder = null;

        // reload all (categories + recon + cm)
        app.reloadAll();
      });
    },

    createCategory: function () {
      var app = this.app;
      if (!global.apiPost || !global.MatEditUI) return;

      global.Modal.open({
        title: '新增分類',
        html: ''
          + '<div class="me-modal-grid">'
          + '  <div class="me-field">'
          + '    <div class="me-label">分類名稱</div>'
          + '    <input type="text" id="meNewCatName" class="me-name-input" placeholder="輸入分類名稱" />'
          + '    <div class="me-modal-hint">名稱不可重複</div>'
          + '  </div>'
          + '</div>',
        confirmText: '新增',
        cancelText: '取消',
        allowCloseBtn: true,
        closeOnBackdrop: true,
        closeOnEsc: true,
        onConfirm: function () {
          var el = qs('#meNewCatName');
          var name = el ? String(el.value || '').trim() : '';
          if (!name) {
            if (global.Toast) global.Toast.show({ type: 'warning', title: '缺少名稱', message: '請輸入分類名稱' });
            return false;
          }

          return global.apiPost('/api/mat/edit_categories?action=create', { name: name }).then(function (j) {
            if (!j || !j.success) {
              if (global.Toast) global.Toast.show({ type: 'error', title: '新增失敗', message: (j && j.error) ? j.error : 'create error' });
              return false;
            }
            if (global.Toast) global.Toast.show({ type: 'success', title: '已新增', message: '分類已新增' });

            // reload all (new category affects recon/cm)
            app.reloadAll();
            return true;
          });
        }
      });

      // focus
      setTimeout(function () {
        var el = qs('#meNewCatName');
        if (el) el.focus();
      }, 50);
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

  global.MatEditCategories = Mod;

})(window);
