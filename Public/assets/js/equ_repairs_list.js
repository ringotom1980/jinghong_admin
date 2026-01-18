/* Path: Public/assets/js/equ_repairs_list.js
 * 說明: 列表渲染（唯讀）
 */

(function (global) {
  'use strict';

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fmtMoney(v) {
    var n = Number(v || 0);
    if (!isFinite(n)) n = 0;
    // 你這邊多數都用整數顯示（千分位）
    n = Math.round(n);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  var Mod = {
    renderEmpty: function (tbody, msg) {
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="9" class="cs-empty">' + esc(msg || '無資料') + '</td></tr>';
    },

    render: function (tbody, rows) {
      if (!tbody) return;
      rows = rows || [];
      if (!rows.length) return this.renderEmpty(tbody, '無資料');

      var html = '';
      rows.forEach(function (r) {
        html += '<tr>';
        html += '<td>' + esc(r.repair_date || '') + '</td>';
        html += '<td>' + esc(r.repair_type || '') + '</td>';
        html += '<td>' + esc(r.tool_name || '') + '</td>';
        html += '<td>' + esc(r.vendor_name || '') + '</td>';

        // 摘要（hover title 顯示完整）
        html += '<td title="' + esc(r.items_title || '') + '">' + esc(r.items_text || '') + '</td>';

        html += '<td class="ta-r">' + esc(fmtMoney(r.company_amount_total || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtMoney(r.team_amount_total || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtMoney(r.grand_total || 0)) + '</td>';

        html += '<td>';
        html += '<button type="button" class="btn btn--info" data-act="edit" data-id="' + esc(r.id) + '">編輯</button> ';
        html += '<button type="button" class="btn btn--danger" data-act="del" data-id="' + esc(r.id) + '">刪除</button>';
        html += '</td>';

        html += '</tr>';
      });

      tbody.innerHTML = html;
    }
  };

  global.EquRepairsList = Mod;

})(window);
