/* Path: Public/assets/js/mat_edit_ui.js
 * 說明: /mat/edit UI 共用（不重複 api/nav/ui_*）
 * - DOM helper / escape
 * - 拖曳排序（≡ 把手）
 * - 本頁 modal 表單：新增分類、材料複選清單
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  var UI = {
    app: null,

    init: function (opts) {
      opts = opts || {};
      this.app = opts.app || null;
    },

    htmlButton: function (text, cls, id) {
      return '<button type="button" class="btn ' + esc(cls || 'btn--ghost') + '"' + (id ? (' id="' + esc(id) + '"') : '') + '>' + esc(text || '') + '</button>';
    },

    // ===== Modal: 新增分類（只輸入名稱）=====
    openCreateCategoryModal: function (onSubmit) {
      var html = ''
        + '<div class="me-modal-grid">'
        + '  <div class="me-field">'
        + '    <div class="me-label">分類名稱</div>'
        + '    <input type="text" id="meNewCatName" class="me-name-input" placeholder="輸入分類名稱" />'
        + '    <div class="me-modal-hint">名稱不可重複</div>'
        + '  </div>'
        + '</div>';

      return global.Modal.confirm('新增分類', '', function () {
        var el = qs('#meNewCatName');
        var name = el ? String(el.value || '').trim() : '';
        if (!name) {
          if (global.Toast) global.Toast.show({ type: 'warning', title: '缺少名稱', message: '請輸入分類名稱' });
          return false;
        }
        if (typeof onSubmit === 'function') return onSubmit(name);
        return true;
      }).querySelector('.modal__body').innerHTML = html;
    },

    // ===== drag sort（HTML5 drag & drop）=====
    enableDragSort: function (listEl, itemSelector, handleSelector, onSorted) {
      if (!listEl) return;
      var dragging = null;

      function setDraggableItems(enabled) {
        qsa(itemSelector, listEl).forEach(function (it) {
          it.setAttribute('draggable', enabled ? 'true' : 'false');
        });
      }

      setDraggableItems(true);

      listEl.addEventListener('dragstart', function (e) {
        var t = e.target;
        if (!t) return;

        var item = t.matches(itemSelector) ? t : (t.closest ? t.closest(itemSelector) : null);
        if (!item) return;

        // 必須從把手開始拖
        var h = e.target;
        var handle = h && handleSelector ? (h.matches(handleSelector) ? h : (h.closest ? h.closest(handleSelector) : null)) : null;
        if (!handle) {
          e.preventDefault();
          return;
        }

        dragging = item;
        item.classList.add('is-dragging');
        try { e.dataTransfer.effectAllowed = 'move'; } catch (err) {}
      });

      listEl.addEventListener('dragend', function () {
        if (!dragging) return;
        dragging.classList.remove('is-dragging');
        dragging = null;

        if (typeof onSorted === 'function') {
          var ids = qsa(itemSelector, listEl).map(function (it) { return it.getAttribute('data-id'); }).filter(Boolean);
          onSorted(ids);
        }
      });

      listEl.addEventListener('dragover', function (e) {
        if (!dragging) return;
        e.preventDefault();

        var t = e.target;
        var over = t && (t.matches(itemSelector) ? t : (t.closest ? t.closest(itemSelector) : null));
        if (!over || over === dragging) return;

        var rect = over.getBoundingClientRect();
        var after = (e.clientY - rect.top) > (rect.height / 2);
        if (after) {
          if (over.nextSibling !== dragging) over.parentNode.insertBefore(dragging, over.nextSibling);
        } else {
          if (over !== dragging.nextSibling) over.parentNode.insertBefore(dragging, over);
        }
      });
    },

    // ===== Modal: 材料複選（含禁選提示）=====
    openMaterialsPicker: function (opts) {
      opts = opts || {};
      var title = opts.title || '變更材料組合';
      var items = opts.items || []; // [{material_no, material_name, checked, disabled, disabled_reason}]
      var onConfirm = (typeof opts.onConfirm === 'function') ? opts.onConfirm : null;

      var rows = items.map(function (it) {
        var dis = !!it.disabled;
        var cls = dis ? ' me-modal-row is-disabled' : ' me-modal-row';
        var reason = it.disabled_reason ? ('<div class="me-modal-badge">' + esc(it.disabled_reason) + '</div>') : '<div></div>';

        return ''
          + '<div class="' + cls + '">'
          + '  <div><input type="checkbox" class="meMatChk" data-code="' + esc(it.material_no) + '" ' + (it.checked ? 'checked' : '') + ' ' + (dis ? 'disabled' : '') + '></div>'
          + '  <div class="me-modal-code">' + esc(it.material_no) + '</div>'
          + '  <div class="me-modal-name">' + esc(it.material_name || '') + '</div>'
          + '  ' + reason
          + '</div>';
      }).join('');

      var html = ''
        + '<div class="me-modal-grid">'
        + '  <div class="me-modal-hint">可複選；同一材料編號不可重複歸屬多個分類（已被其他分類使用者會顯示禁選）</div>'
        + '  <div class="me-modal-list" id="meMatPickList">' + rows + '</div>'
        + '</div>';

      global.Modal.open({
        title: title,
        html: html,
        confirmText: '儲存組合',
        cancelText: '取消',
        allowCloseBtn: true,
        closeOnBackdrop: true,
        closeOnEsc: true,
        onConfirm: function () {
          var picks = qsa('.meMatChk').filter(function (c) { return c && c.checked && !c.disabled; })
            .map(function (c) { return c.getAttribute('data-code'); })
            .filter(Boolean);

          if (onConfirm) return onConfirm(picks);
          return true;
        }
      });
    }
  };

  global.MatEditUI = UI;

})(window);
