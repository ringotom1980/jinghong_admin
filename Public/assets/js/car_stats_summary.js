/* Path: Public/assets/js/car_stats_summary.js
 * 說明: 左側彙總表渲染 + active 樣式管理
 */

(function (global) {
  'use strict';

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function renderTop3(list) {
    list = list || [];
    if (!list.length) return '—';
    var html = '<div class="cs-top3">';
    for (var i = 0; i < list.length; i++) {
      html += '<span class="tag">' + esc(list[i]) + '</span>';
    }
    html += '</div>';
    return html;
  }

  var Mod = {
    render: function (tbody, rows, activeVehicleId, fmtInt) {
      if (!tbody) return;
      rows = rows || [];
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="cs-empty">此期間無維修資料</td></tr>';
        return;
      }

      var html = '';
      rows.forEach(function (r) {
        var vid = r.vehicle_id;
        var isAct = (String(vid) === String(activeVehicleId));
        html += '<tr data-vehicle-id="' + esc(vid) + '" class="' + (isAct ? 'is-active' : '') + '">';
        html += '<td>' + esc(r.vehicle_code || '') + '</td>';
        html += '<td>' + esc(r.plate_no || '') + '</td>';
        html += '<td class="ta-r">' + esc(fmtInt(r.count || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtInt(r.company_amount_total || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtInt(r.team_amount_total || 0)) + '</td>';
        html += '<td class="ta-r">' + esc(fmtInt(r.grand_total || 0)) + '</td>';
        html += '<td>' + renderTop3(r.top3 || []) + '</td>';
        html += '</tr>';
      });

      tbody.innerHTML = html;
    },

    setActive: function (tbody, activeVehicleId) {
      if (!tbody) return;
      var trs = tbody.querySelectorAll('tr[data-vehicle-id]');
      for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var vid = tr.getAttribute('data-vehicle-id') || '';
        if (String(vid) === String(activeVehicleId)) tr.classList.add('is-active');
        else tr.classList.remove('is-active');
      }
    }
  };

  global.CarStatsSummary = Mod;

})(window);
