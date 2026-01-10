/* Path: Public/assets/js/mat_edit_ui.js
 * 說明: /mat/edit UI 共用（不重複 api/nav/ui_*）
 * - DOM helper / escape
 * - 拖曳排序（≡ 把手）
 * - 本頁 modal 表單：新增分類、材料複選清單
 *
 * 注意：
 * - 支援 onSubmit/onConfirm 回傳 Promise：會等成功後才關閉 modal
 * - materials picker 兼容後端欄位：material_number/is_selected/is_disabled/assigned_category_id
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

  function isPromise(x) {
    return x && (typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function';
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

    /* ===== Modal: 新增分類（只輸入名稱）=====
     * - 回傳：無（由 Modal 管控）
     * - onSubmit(name) 可回傳：
     *   - true：關閉
     *   - false：不關閉（例如前端驗證不過）
     *   - Promise：成功後才關閉；失敗則不關閉
     */
    openCreateCategoryModal: function (onSubmit) {
      if (!global.Modal) return;

      var html = ''
        + '<div class="me-modal-grid">'
        + '  <div class="me-field">'
        + '    <div class="me-label">分類名稱</div>'
        + '    <input type="text" id="meNewCatName" class="me-name-input" placeholder="輸入分類名稱" />'
        + '    <div class="me-modal-hint">名稱不可重複</div>'
        + '  </div>'
        + '</div>';

      global.Modal.open({
        title: '新增分類',
        html: html,
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
            return false; // 不關
          }

          if (typeof onSubmit !== 'function') return true;

          try {
            var r = onSubmit(name);

            // 同步布林：true 關 / false 不關
            if (!isPromise(r)) return (r !== false);

            // Promise：先不關，等成功再關
            r.then(function (ok) {
              if (ok === false) return; // 明確拒絕關閉
              global.Modal.close();
            }).catch(function () {
              // 失敗不關，讓外層用 Toast 顯示錯誤即可
            });

            return false; // 先不要關
          } catch (e) {
            return false;
          }
        }
      });

      // focus
      setTimeout(function () {
        var i = qs('#meNewCatName');
        if (i) i.focus();
      }, 20);
    },

    /* ===== drag sort（HTML5 drag & drop）=====
     * - 僅允許從 handleSelector 開始拖曳
     * - dragend 會回傳排序後 ids（依 data-id）
     */
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
          var ids = qsa(itemSelector, listEl)
            .map(function (it) { return it.getAttribute('data-id'); })
            .filter(Boolean);
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

    /* ===== Modal: 材料複選（含禁選提示）=====
     * opts.items 兼容兩種格式：
     * A) 你 UI 原本格式：
     *    { material_no, material_name, checked, disabled, disabled_reason }
     * B) 你後端 pick_list 格式：
     *    { material_number, material_name, is_selected, is_disabled, assigned_category_id }
     */
    openMaterialsPicker: function (opts) {
      if (!global.Modal) return;

      opts = opts || {};
      var title = opts.title || '變更材料組合';
      var items = Array.isArray(opts.items) ? opts.items : [];
      var onConfirm = (typeof opts.onConfirm === 'function') ? opts.onConfirm : null;

      var rows = items.map(function (it) {
        it = it || {};

        var code = (it.material_no !== undefined && it.material_no !== null)
          ? String(it.material_no)
          : String(it.material_number || '');

        var name = (it.material_name !== undefined && it.material_name !== null)
          ? String(it.material_name)
          : '';

        var checked = !!(it.checked || it.is_selected);

        var disabled = !!(it.disabled || it.is_disabled);

        var reason = '';
        if (it.disabled_reason) reason = String(it.disabled_reason);
        else if (disabled && it.assigned_category_id) reason = '已被其他分類使用';

        var cls = disabled ? 'me-modal-row is-disabled' : 'me-modal-row';

        return ''
          + '<div class="' + cls + '">'
          + '  <div><input type="checkbox" class="meMatChk" data-code="' + esc(code) + '" ' + (checked ? 'checked' : '') + ' ' + (disabled ? 'disabled' : '') + '></div>'
          + '  <div class="me-modal-code">' + esc(code) + '</div>'
          + '  <div class="me-modal-name">' + esc(name) + '</div>'
          + '  <div class="me-modal-badge">' + (reason ? esc(reason) : '') + '</div>'
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
          var picks = qsa('.meMatChk')
            .filter(function (c) { return c && c.checked && !c.disabled; })
            .map(function (c) { return c.getAttribute('data-code'); })
            .filter(Boolean);

          if (!onConfirm) return true;

          try {
            var r = onConfirm(picks);

            if (!isPromise(r)) return (r !== false);

            r.then(function (ok) {
              if (ok === false) return;
              global.Modal.close();
            }).catch(function () {
              // 失敗不關，讓外層 Toast 顯示即可
            });

            return false; // Promise 情況先不關
          } catch (e) {
            return false;
          }
        }
      });
    }
  };

  global.MatEditUI = UI;

})(window);
