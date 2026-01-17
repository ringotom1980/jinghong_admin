/* Path: Public/assets/js/car_stats_details.js
 * 說明: 右側明細表渲染（唯讀、不排序、不編輯）
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
        return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
                html += '<td>' + esc(r.content || '') + '</td>';
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
