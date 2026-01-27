/* Path: Public/assets/js/hot_tools_items.js
 * 說明: 左表 hot_items 渲染器 + row events
 * - VIEW：顯示文字；可點列切換；不顯示刪除
 * - EDIT：分類名稱 input；每列顯示刪除（走二次確認 modal）；點列不切換
 */

(function (global) {
  'use strict';

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function fmtInt(v) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) n = 0;
    return String(n);
  }

  function stop(e) { try { e.preventDefault(); e.stopPropagation(); } catch (_) {} }

  var Mod = {
    render: function (tbody, items, activeId, mode) {
      if (!tbody) return;
      items = items || [];
      activeId = parseInt(activeId, 10) || 0;
      mode = (mode === 'EDIT') ? 'EDIT' : 'VIEW';

      if (!items.length) {
        tbody.innerHTML = '<tr class="hot-empty"><td colspan="6">尚無分類資料</td></tr>';
        return;
      }

      var html = '';
      items.forEach(function (it) {
        var id = parseInt(it.id, 10) || 0;
        var isActive = (id && id === activeId);
        var trCls = 'hot-row' + (isActive ? ' is-active' : '');
        var nameCell = '';

        if (mode === 'EDIT') {
          nameCell = '<input class="input input--sm" data-field="name" type="text" value="' + esc(it.name) + '" />';
        } else {
          nameCell = esc(it.name);
        }

        // ✅ 依你定版：EDIT 才出現刪除
        var actCell = '';
        if (mode === 'EDIT') {
          actCell = '<button class="btn btn--danger btn--xs" type="button" data-act="delete" title="刪除">刪除</button>';
        } else {
          actCell = '<span class="hot-muted">—</span>';
        }

        html += ''
          + '<tr class="' + trCls + '" data-item-id="' + esc(id) + '">'
          + '  <td><span class="hot-badge">' + esc(it.code) + '</span></td>'
          + '  <td>' + nameCell + '</td>'
          + '  <td>' + fmtInt(it.tool_total) + '</td>'
          + '  <td>' + fmtInt(it.assigned_cnt) + '</td>'
          + '  <td>' + fmtInt(it.available_cnt) + '</td>'
          + '  <td>' + actCell + '</td>'
          + '</tr>';
      });

      tbody.innerHTML = html;

      var app = global.HotToolsApp;

      Array.prototype.slice.call(tbody.querySelectorAll('tr[data-item-id]')).forEach(function (tr) {
        // 列點擊：VIEW 才能切換分類
        tr.addEventListener('click', function () {
          if (!app || !app.selectItem) return;
          if (mode === 'EDIT') return;
          var id = parseInt(tr.getAttribute('data-item-id'), 10) || 0;
          if (id) app.selectItem(id);
        });

        // 刪除：EDIT 才有按鈕；走你既有二次確認 modal
        var del = tr.querySelector('[data-act="delete"]');
        if (del) {
          del.addEventListener('click', function (e) {
            stop(e);
            if (!app || !app.openItemDeleteModal) return;
            var id = parseInt(tr.getAttribute('data-item-id'), 10) || 0;
            if (id) app.openItemDeleteModal(id);
          });
        }
      });
    }
  };

  global.HotToolsItems = Mod;

})(window);
