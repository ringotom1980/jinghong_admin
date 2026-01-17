/* Path: Public/assets/js/car_stats_print.js
 * 說明: 列印 modal + 檢核 + 開啟列印視窗
 * - 三選一：summary / all_details / vehicle_details
 * - 檢核：activeKey / activeVehicleId 必存在
 * - 列印樣式：使用外掛 CSS（assets/css/car_stats_print.css），不內嵌 style
 * - 標題：LOGO + 境宏工程有限公司-維修統計表(2025-全年/上半年/下半年)
 * - 月份欄：顯示 1月、2月...（不含 YYYY-）
 * - 金額：千分位（整數）
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }

    function pickPrintType() {
        var el = qs('input[name="csPrintType"]:checked');
        return el ? (el.value || '') : 'summary';
    }

    function buildHtml(title, payload) {
        var esc = function (s) {
            s = (s === null || s === undefined) ? '' : String(s);
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        var fmtMoney = function (v) {
            var n = Number(v || 0);
            if (!isFinite(n)) n = 0;
            return Math.round(n).toLocaleString('zh-TW');
        };

        var fmtMonth = function (m) {
            // m: "YYYY-MM"
            var s = String(m || '');
            var parts = s.split('-');
            var mm = parts.length >= 2 ? parseInt(parts[1], 10) : NaN;
            if (!mm || !isFinite(mm)) return s;
            return mm + '月';
        };

        // 依你專案慣例：部署在 /jinghong_admin 時要加 base
        var base = (location.pathname.split('/')[1] === 'jinghong_admin') ? '/jinghong_admin' : '';
        var cssHref = base + '/assets/css/car_stats_print.css?v=2';
        var logoSrc = base + '/assets/img/brand/JH_logo.png?v=1';

        var html = '';
        html += '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">';
        html += '<meta name="viewport" content="width=device-width, initial-scale=1">';
        html += '<title>' + esc(title) + '</title>';
        html += '<link rel="stylesheet" href="' + esc(cssHref) + '">';
        html += '</head><body>';

        // Header：LOGO + Title
        html += '<header class="print-head">';
        html += '<img class="print-head__logo" src="' + esc(logoSrc) + '" alt="LOGO">';
        html += '<h1 class="print-head__title">' + esc(title) + '</h1>';
        html += '</header>';
        html += '<main class="print-body">';

        // ===== summary =====
        if (payload && payload.type === 'summary') {
            html += '<div class="sec">';
            html += '<table><thead><tr>';
            html += '<th class="ta-l">車輛編號</th><th class="ta-l">車牌</th>';

            (payload.months || []).forEach(function (m) {
                html += '<th class="ta-r">' + esc(fmtMonth(m)) + '</th>';
            });

            html += '<th class="ta-r">公司合計</th><th class="ta-r">工班合計</th><th class="ta-r">總合計</th>';
            html += '</tr></thead><tbody>';

            (payload.rows || []).forEach(function (r) {
                html += '<tr>';
                html += '<td class="ta-l">' + esc(r.vehicle_code || '') + '</td>';
                html += '<td class="ta-l">' + esc(r.plate_no || '') + '</td>';

                (payload.months || []).forEach(function (m) {
                    var cell = (r.by_month && r.by_month[m]) ? r.by_month[m] : { grand_total: 0 };
                    html += '<td class="ta-r">' + esc(fmtMoney(cell.grand_total)) + '</td>';
                });

                html += '<td class="ta-r">' + esc(fmtMoney(r.company_total)) + '</td>';
                html += '<td class="ta-r">' + esc(fmtMoney(r.team_total)) + '</td>';
                html += '<td class="ta-r">' + esc(fmtMoney(r.grand_total)) + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';
        }

        // ===== all_details =====
        if (payload && payload.type === 'all_details') {
            (payload.vehicles || []).forEach(function (v) {
                html += '<div class="sec">';
                html += '<h3>' + esc(v.vehicle_code || '') + '（' + esc(v.plate_no || '') + '）</h3>';
                html += '<table><thead><tr>';
                html += '<th>日期</th><th>內容</th><th class="ta-r">公司</th><th class="ta-r">工班</th><th class="ta-r">總額</th>';
                html += '</tr></thead><tbody>';

                (v.rows || []).forEach(function (r) {
                    html += '<tr>';
                    html += '<td>' + esc(r.repair_date || '') + '</td>';
                    html += '<td>' + esc(r.content || '') + '</td>';
                    html += '<td class="ta-r">' + esc(fmtMoney(r.company_amount_total)) + '</td>';
                    html += '<td class="ta-r">' + esc(fmtMoney(r.team_amount_total)) + '</td>';
                    html += '<td class="ta-r">' + esc(fmtMoney(r.grand_total)) + '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table></div>';
            });
        }

        // ===== vehicle_details =====
        if (payload && payload.type === 'vehicle_details') {
            var v2 = payload.vehicle || {};
            html += '<div class="sec">';
            html += '<h3>' + esc(v2.vehicle_code || '') + '（' + esc(v2.plate_no || '') + '）</h3>';
            html += '<table><thead><tr>';
            html += '<th>日期</th><th>內容</th><th class="ta-r">公司</th><th class="ta-r">工班</th><th class="ta-r">總額</th>';
            html += '</tr></thead><tbody>';

            (payload.rows || []).forEach(function (r) {
                html += '<tr>';
                html += '<td>' + esc(r.repair_date || '') + '</td>';
                html += '<td>' + esc(r.content || '') + '</td>';
                html += '<td class="ta-r">' + esc(fmtMoney(r.company_amount_total)) + '</td>';
                html += '<td class="ta-r">' + esc(fmtMoney(r.team_amount_total)) + '</td>';
                html += '<td class="ta-r">' + esc(fmtMoney(r.grand_total)) + '</td>';
                html += '</tr>';
            });

            html += '</tbody></table></div>';
        }

        html += '</main>';
        html += '<script>window.onload=function(){setTimeout(function(){window.print();},80);};</script>';
        html += '</body></html>';
        return html;
    }

    var Mod = {
        run: function (ctx, apiGet, toast, closeModal) {
            var type = pickPrintType();

            if (type === 'summary' || type === 'all_details') {
                if (!ctx.activeKey) {
                    toast('warning', '缺少期間', '請先選定某個半年或全年膠囊');
                    return;
                }
            }
            if (type === 'vehicle_details') {
                if (!ctx.activeVehicleId) {
                    toast('warning', '缺少車輛', '請先在左側選定一台車輛');
                    return;
                }
            }

            var api = '';
            var params = { key: ctx.activeKey };

            if (type === 'summary') api = '/api/car/car_stats_print_summary';
            if (type === 'all_details') api = '/api/car/car_stats_print_all_details';
            if (type === 'vehicle_details') {
                api = '/api/car/car_stats_print_vehicle_details';
                params.vehicle_id = ctx.activeVehicleId;
            }

            apiGet(api, params).then(function (j) {
                if (!j || !j.success) throw new Error((j && j.error) ? j.error : '列印資料取得失敗');
                var payload = j.data || {};
                if (typeof closeModal === 'function') closeModal();

                var w = window.open('', '_blank');
                if (!w) {
                    toast('error', '無法開啟列印視窗', '請確認瀏覽器未封鎖彈出視窗');
                    return;
                }
                w.document.open();
                w.document.write(buildHtml(payload.title || '列印', payload));
                w.document.close();
            }).catch(function (err) {
                toast('error', '列印失敗', err && err.message ? err.message : String(err));
            });
        }
    };

    global.CarStatsPrint = Mod;

})(window);
