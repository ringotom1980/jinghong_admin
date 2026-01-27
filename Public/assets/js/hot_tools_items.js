/* Path: Public/assets/js/hot_tools_items.js
 * 說明: 左表 hot_items 渲染器 + row events
 * - VIEW：顯示文字 + 刪除按鈕
 * - EDIT：分類名稱改成 input；刪除按鈕隱藏；點擊列不切換
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

        var delBtn = '';
        if (mode === 'VIEW') {
          delBtn = '<button class="btn btn--danger btn--xs" type="button" data-act="delete" title="刪除">刪除</button>';
        } else {
          delBtn = '<span class="hot-muted">—</span>';
        }

        html += ''
          + '<tr class="' + trCls + '" data-item-id="' + esc(id) + '">'
          + '  <td><span class="hot-badge">' + esc(it.code) + '</span></td>'
          + '  <td>' + nameCell + '</td>'
          + '  <td style="text-align:right;">' + fmtInt(it.tool_total) + '</td>'
          + '  <td style="text-align:right;">' + fmtInt(it.assigned_cnt) + '</td>'
          + '  <td style="text-align:right;">' + fmtInt(it.available_cnt) + '</td>'
          + '  <td>' + delBtn + '</td>'
          + '</tr>';
      });

      tbody.innerHTML = html;

      // 綁 row click / delete
      var app = global.HotToolsApp;

      Array.prototype.slice.call(tbody.querySelectorAll('tr[data-item-id]')).forEach(function (tr) {
        tr.addEventListener('click', function () {
          if (!app || !app.selectItem) return;
          if (mode === 'EDIT') return;
          var id = parseInt(tr.getAttribute('data-item-id'), 10) || 0;
          if (id) app.selectItem(id);
        });

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
