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
        var ts = Date.now(); // cache-bust：每次列印都重新載入
        var cssHref = base + '/assets/css/car_stats_print.css?t=' + ts;
        var logoSrc = base + '/assets/img/brand/JH_logo.png?t=' + ts;

        var html = '';
        html += '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">';
        html += '<meta name="viewport" content="width=device-width, initial-scale=1">';
        html += '<title>' + esc(title) + '</title>';
        html += '<link rel="stylesheet" href="' + esc(cssHref) + '">';
        var bodyCls = payload && payload.type ? ('print print--' + payload.type) : 'print';
        html += '</head><body class="' + esc(bodyCls) + '">';
        html += '<main class="print-body">';

        // ===== summary (維修統計表)=====
        if (payload && payload.type === 'summary') {
            html += '<div class="sec">';
            html += '<table><thead>';
            /* ✅ 欄寬定錨列：必須放在 thead 第一列，讓 table-layout:fixed 先吃到每欄 width */
            html += '<tr class="col-guard">';
            html += '<th class="col-code"></th>';
            html += '<th class="col-plate"></th>';
            (payload.months || []).forEach(function () { html += '<th></th>'; });
            html += '<th class="col-company"></th>';
            html += '<th class="col-team"></th>';
            html += '<th class="col-grand"></th>';
            html += '</tr>';
            /* ✅ 文件標題列：放在 thead 內，靠 CSS 控制每頁留白、不要格線 */
            html += '<tr class="print-head-row">';
            html += '<th colspan="' + (2 + (payload.months || []).length + 3) + '">';
            html += '<header class="print-head">';
            html += '<img class="print-head__logo" src="' + esc(logoSrc) + '" alt="LOGO">';
            html += '<h1 class="print-head__title">' + esc(title) + '</h1>';
            html += '</header>';
            html += '</th>';
            html += '</tr>';
            /* ✅ 原本表格欄位列 */
            html += '<tr>';
            html += '<th class="ta-c col-code">編號</th><th class="ta-c col-plate">車牌</th>';

            (payload.months || []).forEach(function (m) {
                html += '<th class="ta-c">' + esc(fmtMonth(m)) + '</th>';
            });

            html += '<th class="ta-c col-company">公司負擔</th><th class="ta-c col-team">工班負擔</th><th class="ta-c col-grand">維修金額</th>';
            html += '</tr></thead><tbody>';

            (payload.rows || []).forEach(function (r) {
                html += '<tr>';
                html += '<td class="ta-c col-code">' + esc(r.vehicle_code || '') + '</td>';
                html += '<td class="ta-c col-plate">' + esc(r.plate_no || '') + '</td>';

                (payload.months || []).forEach(function (m) {
                    var cell = (r.by_month && r.by_month[m]) ? r.by_month[m] : { grand_total: 0 };
                    html += '<td class="ta-r">' + esc(fmtMoney(cell.grand_total)) + '</td>';
                });

                html += '<td class="ta-r col-company">' + esc(fmtMoney(r.company_total)) + '</td>';
                html += '<td class="ta-r col-team">' + esc(fmtMoney(r.team_total)) + '</td>';
                html += '<td class="ta-r col-grand">' + esc(fmtMoney(r.grand_total)) + '</td>';
                html += '</tr>';
            });

            /* ✅ 合計列（表格最下方） */
            var sumByMonth = {};
            (payload.months || []).forEach(function (m) { sumByMonth[m] = 0; });
            var sumCompany = 0, sumTeam = 0, sumGrand = 0;

            (payload.rows || []).forEach(function (r) {
                (payload.months || []).forEach(function (m) {
                    var cell = (r.by_month && r.by_month[m]) ? r.by_month[m] : { grand_total: 0 };
                    sumByMonth[m] += Number(cell.grand_total || 0);
                });
                sumCompany += Number(r.company_total || 0);
                sumTeam += Number(r.team_total || 0);
                sumGrand += Number(r.grand_total || 0);
            });

            html += '<tr class="sum-row">';
            html += '<td class="ta-c" colspan="2">合計</td>';

            (payload.months || []).forEach(function (m) {
                html += '<td class="ta-r">' + esc(fmtMoney(sumByMonth[m])) + '</td>';
            });

            html += '<td class="ta-r col-company">' + esc(fmtMoney(sumCompany)) + '</td>';
            html += '<td class="ta-r col-team">' + esc(fmtMoney(sumTeam)) + '</td>';
            html += '<td class="ta-r col-grand">' + esc(fmtMoney(sumGrand)) + '</td>';
            html += '</tr>';

            html += '</tbody></table></div>';
        }

        // ===== all_details (列印各車維修明細)=====
        if (payload && payload.type === 'all_details') {
            var vehicles = payload.vehicles || [];

            vehicles.forEach(function (v, vi) {
                var vTitleRight = (v.vehicle_code || '') + '（' + (v.plate_no || '') + '）';

                html += '<div class="sec sec--vehicle">';

                html += '<table class="t-details"><thead>';

                // ✅ 欄寬定錨列（讓每欄可控寬）
                html += '<tr class="col-guard">';
                html += '<th class="col-no"></th>';
                html += '<th class="col-date"></th>';
                html += '<th class="col-vendor"></th>';
                html += '<th class="col-type"></th>';
                html += '<th class="col-detail"></th>';
                html += '<th class="col-company"></th>';
                html += '<th class="col-team"></th>';
                html += '<th class="col-grand"></th>';
                html += '</tr>';

                // ✅ 每台車都要有文件標題（含 LOGO + 標題 + 右側車號/車牌）
                html += '<tr class="print-head-row">';
                html += '<th colspan="8">';
                html += '<header class="print-head print-head--vehicle">';
                html += '<div class="print-head__left">';
                html += '<img class="print-head__logo" src="' + esc(logoSrc) + '" alt="LOGO">';
                html += '<h1 class="print-head__title">' + esc(title) + '</h1>';
                html += '</div>';
                html += '<div class="print-head__right">' + esc(vTitleRight) + '</div>';
                html += '</header>';
                html += '</th>';
                html += '</tr>';

                // ✅ 欄位列（8 欄）
                html += '<tr>';
                html += '<th class="ta-c col-no">項次</th>';
                html += '<th class="ta-c col-date">維修時間</th>';
                html += '<th class="ta-c col-vendor">維修廠商</th>';
                html += '<th class="ta-c col-type">類型</th>';
                html += '<th class="ta-c col-detail">維修明細</th>';
                html += '<th class="ta-c col-company">公司負擔</th>';
                html += '<th class="ta-c col-team">工班負擔</th>';
                html += '<th class="ta-c col-grand">維修金額</th>';
                html += '</tr></thead><tbody>';

                var sumCompany = 0, sumTeam = 0, sumGrand = 0;

                (v.rows || []).forEach(function (r, idx) {
                    var c = Number(r.company_amount_total || 0);
                    var t = Number(r.team_amount_total || 0);
                    var g = Number(r.grand_total || 0);
                    sumCompany += c; sumTeam += t; sumGrand += g;

                    html += '<tr>';
                    html += '<td class="ta-c col-no">' + esc(String(idx + 1)) + '</td>';
                    html += '<td class="ta-c col-date">' + esc(r.repair_date || '') + '</td>';
                    html += '<td class="ta-c col-vendor">' + esc(r.vendor_name || '') + '</td>';
                    html += '<td class="ta-c col-type">' + esc(r.repair_type || '') + '</td>';
                    html += '<td class="ta-l col-detail">' + esc(r.detail || '') + '</td>';
                    html += '<td class="ta-r col-company">' + esc(fmtMoney(c)) + '</td>';
                    html += '<td class="ta-r col-team">' + esc(fmtMoney(t)) + '</td>';
                    html += '<td class="ta-r col-grand">' + esc(fmtMoney(g)) + '</td>';
                    html += '</tr>';
                });

                // ✅ 合計列（每車表格底部）
                html += '<tr class="sum-row">';
                html += '<td class="ta-c" colspan="5">合計</td>';
                html += '<td class="ta-r col-company">' + esc(fmtMoney(sumCompany)) + '</td>';
                html += '<td class="ta-r col-team">' + esc(fmtMoney(sumTeam)) + '</td>';
                html += '<td class="ta-r col-grand">' + esc(fmtMoney(sumGrand)) + '</td>';
                html += '</tr>';

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
