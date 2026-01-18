/* Path: Public/assets/js/equ_stats_summary.js
 * 說明: 左側彙總表渲染 + active 樣式管理
 * - 依廠商統計：廠商/次數/公司負擔/工班負擔/總金額/Top3(工具名稱)
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
    return Math.round(n).toLocaleString('zh-TW');
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
    render: function (tbody, rows, activeVendorId, fmtInt) {
      if (!tbody) return;
      rows = rows || [];

      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="es-empty">此期間無資料</td></tr>';
        return;
      }

      var html = '';
      rows.forEach(function (r) {
        var vid = r.vendor_id;
        var isAct = (String(vid) === String(activeVendorId));

        html += '<tr data-vendor-id="' + esc(vid) + '" class="' + (isAct ? 'is-active' : '') + '">';
        html += '<td>' + esc(r.vendor_name || '') + '</td>';
        html += '<td class="ta-r">' + esc(fmtInt(r.count || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtMoney(r.company_amount_total || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtMoney(r.team_amount_total || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtMoney(r.grand_total || 0)) + '</td>';
        html += '<td>' + renderTop3(r.top3 || []) + '</td>';
        html += '</tr>';
      });

      tbody.innerHTML = html;
    },

    setActive: function (tbody, activeVendorId) {
      if (!tbody) return;
      var trs = tbody.querySelectorAll('tr[data-vendor-id]');
      for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var vid = tr.getAttribute('data-vendor-id') || '';
        if (String(vid) === String(activeVendorId)) tr.classList.add('is-active');
        else tr.classList.remove('is-active');
      }
    }
  };

  global.EquStatsSummary = Mod;

})(window);
