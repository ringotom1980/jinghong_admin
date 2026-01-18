/* Path: Public/assets/js/equ_stats_summary.js
 * 說明: 左側彙總表渲染 + active 樣式管理
 * - 依工具統計：工具名稱/次數/公司負擔/工班負擔/總金額/Top3
 */

(function (global) {
  'use strict';

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function fmtMoney(v) {
    var n = Number(v || 0);
    if (!isFinite(n)) n = 0;
    return Math.round(n).toLocaleString('en-US');
  }

  function renderTop3(list) {
    list = list || [];
    if (!list.length) return '—';
    var html = '<div class="es-top3">';
    for (var i = 0; i < list.length; i++) {
      html += '<span class="tag">' + esc(list[i]) + '</span>';
    }
    html += '</div>';
    return html;
  }

  var Mod = {
    render: function (tbody, rows, activeToolId, fmtInt) {
      if (!tbody) return;
      rows = rows || [];

      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="es-empty">此期間無資料</td></tr>';
        return;
      }

      var html = '';
      rows.forEach(function (r) {
        var tid = r.tool_id;
        var isAct = (String(tid) === String(activeToolId));

        html += '<tr data-tool-id="' + esc(tid) + '" class="' + (isAct ? 'is-active' : '') + '">';
        html += '<td>' + esc(r.tool_name || '') + '</td>';
        html += '<td class="ta-r">' + esc(fmtInt(r.count || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtMoney(r.company_amount_total || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtMoney(r.team_amount_total || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtMoney(r.grand_total || 0)) + '</td>';
        html += '<td>' + renderTop3(r.top3 || []) + '</td>';
        html += '</tr>';
      });

      tbody.innerHTML = html;
    },

    setActive: function (tbody, activeToolId) {
      if (!tbody) return;
      var trs = tbody.querySelectorAll('tr[data-tool-id]');
      for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var tid = tr.getAttribute('data-tool-id') || '';
        if (String(tid) === String(activeToolId)) tr.classList.add('is-active');
        else tr.classList.remove('is-active');
      }
    }
  };

  global.EquStatsSummary = Mod;

})(window);
