/* Path: Public/assets/js/car_stats_details.js
 * 說明: 右側明細表渲染（唯讀、不排序、不編輯）
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
        return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function buildContentCell(raw) {
        raw = (raw === null || raw === undefined) ? '' : String(raw).trim();
        if (!raw) return { text: '', title: '' };

        var items = raw.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);

        // 顯示前 3 筆
        var shown = items.slice(0, 3);
        var more = (items.length > 3);

        var text = shown.join('、') + (more ? '…' : '');

        // tooltip：每筆一行（你要的格式）
        var title = items.join('\n');

        return { text: text, title: title };
    }

    var Mod = {
        render: function (tbody, rows, fmtInt) {
            if (!tbody) return;
            rows = rows || [];

            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="cs-empty">無明細</td></tr>';
                return;
            }

            var html = '';
            rows.forEach(function (r) {
                html += '<tr>';
                html += '<td>' + esc(r.vehicle_code || '') + '</td>';
                html += '<td>' + esc(r.repair_date || '') + '</td>';
                var cc = buildContentCell(r.detail || '');
                html += '<td title="' + esc(cc.title) + '">' + esc(cc.text) + '</td>';
                html += '<td class="ta-r">' + esc(fmtMoney(r.company_amount_total || 0)) + '</td>';
                html += '<td class="ta-r">' + esc(fmtMoney(r.team_amount_total || 0)) + '</td>';
                html += '<td class="ta-r">' + esc(fmtMoney(r.grand_total || 0)) + '</td>';
                html += '</tr>';
            });

            tbody.innerHTML = html;
        }
    };

    global.CarStatsDetails = Mod;

})(window);
