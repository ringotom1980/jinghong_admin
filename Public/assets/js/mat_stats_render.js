/* Path: Public/assets/js/mat_stats_render.js
 * 說明: 統計渲染器
 * - 依 payload.groups 渲染：A / B / C / D / E / F
 * - D：categories + recon + issue_sum_by_category
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }

    function n(v) {
        if (v === null || v === undefined) return '0.00';
        return String(v);
    }

    function esc(s) {
        s = (s === null || s === undefined) ? '' : String(s);
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function buildTable(rows, opts) {
        opts = opts || {};
        var hasSort = !!opts.hasSort;

        var thSort = hasSort ? '<th style="width:90px;">排序</th>' : '';
        var tdSort = function (r) { return hasSort ? ('<td class="ms-td-num">' + esc(String(r.sort_order || 0)) + '</td>') : ''; };

        var html = '';
        html += '<div class="ms-table-wrap">';
        html += '<table class="table ms-table">';
        html += '<thead><tr>';
        html += '<th style="width:140px;">材料編號</th>';
        html += '<th>材料名稱</th>';
        html += thSort;
        html += '<th class="ms-th-num">領新料</th>';
        html += '<th class="ms-th-num">領舊料</th>';
        html += '<th class="ms-th-num">退新料</th>';
        html += '<th class="ms-th-num">退舊料</th>';
        html += '<th class="ms-th-num">廢料</th>';
        html += '<th class="ms-th-num">下腳</th>';
        html += '</tr></thead>';

        html += '<tbody>';
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i] || {};
            html += '<tr>';
            html += '<td class="ms-td-mono">' + esc(r.material_number || '') + '</td>';
            html += '<td class="ms-td-name">' + esc(r.material_name || '') + '</td>';
            html += tdSort(r);
            html += '<td class="ms-td-num">' + esc(n(r.collar_new)) + '</td>';
            html += '<td class="ms-td-num">' + esc(n(r.collar_old)) + '</td>';
            html += '<td class="ms-td-num">' + esc(n(r.recede_new)) + '</td>';
            html += '<td class="ms-td-num">' + esc(n(r.recede_old)) + '</td>';
            html += '<td class="ms-td-num">' + esc(n(r.scrap)) + '</td>';
            html += '<td class="ms-td-num">' + esc(n(r.footprint)) + '</td>';
            html += '</tr>';
        }
        if (!rows.length) {
            html += '<tr><td colspan="' + (hasSort ? 10 : 9) + '" class="ms-empty">無資料</td></tr>';
        }
        html += '</tbody></table></div>';
        return html;
    }

    //A/C 專用表格函式
    function buildTableAC(rows) {
        var html = '';

        html += '<div class="ms-table-wrap">';
        html += '<table class="table ms-table ms-table--ac">';

        // ===== 表頭（兩列）=====
        html += '<thead>';
        html += '<tr>';
        html += '<th rowspan="2" style="width:70px;">項次</th>';
        html += '<th rowspan="2">材料名稱</th>';
        html += '<th colspan="2" class="ms-th-group">領料</th>';
        html += '<th colspan="2" class="ms-th-group">退料</th>';
        html += '<th colspan="2" class="ms-th-group">領退合計</th>';
        html += '</tr>';

        html += '<tr>';
        html += '<th class="ms-th-num">新</th>';
        html += '<th class="ms-th-num">舊</th>';
        html += '<th class="ms-th-num">新</th>';
        html += '<th class="ms-th-num">舊</th>';
        html += '<th class="ms-th-num">新</th>';
        html += '<th class="ms-th-num">舊</th>';
        html += '</tr>';
        html += '</thead>';

        // ===== 內容 =====
        html += '<tbody>';

        rows.forEach(function (r, idx) {
            var cn = Number(r.collar_new || 0);
            var co = Number(r.collar_old || 0);
            var rn = Number(r.recede_new || 0);
            var ro = Number(r.recede_old || 0);
            var sumNew = Number(r.total_new || 0);
            var sumOld = Number(r.total_old || 0);

            function v(x, cls) {
                if (x === 0) return '';
                return '<span class="' + cls + '">' + esc(n(x)) + '</span>';
            }

            html += '<tr>';
            html += '<td class="ms-td-num">' + (idx + 1) + '</td>';
            html += '<td class="ms-td-name">' + esc(r.material_name || '') + '</td>';
            // 領新 / 領舊 / 退新 / 退舊：負數才紅
            html += '<td class="ms-td-num">' + v(cn, cn < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(co, co < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(rn, rn < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(ro, ro < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            // 領退合計（新）：正藍、負紅
            html += '<td class="ms-td-num">' + v(sumNew, sumNew < 0 ? 'ms-neg' : 'ms-sum-pos') + '</td>';
            // 領退合計（舊）：正黑、負紅
            html += '<td class="ms-td-num">' + v(sumOld, sumOld < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '</tr>';
        });

        if (!rows.length) {
            html += '<tr><td colspan="8" class="ms-empty">無資料</td></tr>';
        }

        html += '</tbody></table></div>';
        return html;
    }

    // E/F 專用表格函式
    function buildTableEF(rows) {
        var html = '';

        html += '<div class="ms-table-wrap">';
        html += '<table class="table ms-table ms-table--ef">';

        // ===== 表頭（兩列）=====
        html += '<thead>';
        html += '<tr>';
        html += '<th rowspan="2" style="width:70px;">項次</th>';
        html += '<th rowspan="2">材料名稱</th>';
        html += '<th colspan="2" class="ms-th-group">領料</th>';
        html += '<th colspan="2" class="ms-th-group">退料</th>';
        html += '</tr>';

        html += '<tr>';
        html += '<th class="ms-th-num">新</th>';
        html += '<th class="ms-th-num">舊</th>';
        html += '<th class="ms-th-num">新</th>';
        html += '<th class="ms-th-num">舊</th>';
        html += '</tr>';
        html += '</thead>';

        // ===== 內容 =====
        html += '<tbody>';
        // ✅ F 班才需要「最下方合計列」：先累加四欄
        var sumCn = 0, sumCo = 0, sumRn = 0, sumRo = 0;

        rows.forEach(function (r, idx) {
            var cn = Number(r.collar_new || 0);
            var co = Number(r.collar_old || 0);
            var rn = Number(r.recede_new || 0);
            var ro = Number(r.recede_old || 0); // ✅ 後端已套用 recede_old+scrap+footprint
            // ✅ 累加（只要資料有 shift='F' 才加，避免 E 班也被算進去）
            var sh = String(r.shift || '').toUpperCase();
            if (sh === 'F') {
                sumCn += cn;
                sumCo += co;
                sumRn += rn;
                sumRo += ro;
            }

            function v(x, cls) {
                if (x === 0) return '';
                return '<span class="' + cls + '">' + esc(n(x)) + '</span>';
            }

            html += '<tr>';
            html += '<td class="ms-td-num">' + (idx + 1) + '</td>';
            html += '<td class="ms-td-name">' + esc(r.material_name || '') + '</td>';

            // 領料(新)：正藍、負紅
            html += '<td class="ms-td-num">' + v(cn, cn < 0 ? 'ms-neg' : 'ms-sum-pos') + '</td>';
            // 領料(舊)：正黑、負紅
            html += '<td class="ms-td-num">' + v(co, co < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            // 退料(新)：一律紅
            html += '<td class="ms-td-num">' + v(rn, 'ms-neg') + '</td>';
            // 退料(舊)：一律紅
            html += '<td class="ms-td-num">' + v(ro, 'ms-neg') + '</td>';

            html += '</tr>';
        });

        if (!rows.length) {
            html += '<tr><td colspan="6" class="ms-empty">無資料</td></tr>';
        }
        // ✅ 只有 F 班有資料時，才追加「合計」列
        if (rows.length) {
            var hasF = rows.some(function (r) { return String(r.shift || '').toUpperCase() === 'F'; });
            if (hasF) {
                html += '<tr class="ms-tr-sum">';

                // ✅ 合併「項次 + 材料名稱」
                html += '<td class="ms-td-num" colspan="2">合計</td>';
                // 領新：正藍、負紅
                html += '<td class="ms-td-num">' +
                    (sumCn === 0 ? '' :
                        '<span class="' + (sumCn < 0 ? 'ms-neg' : 'ms-sum-pos') + '">' + esc(n(sumCn)) + '</span>'
                    ) +
                    '</td>';
                // 領舊：正黑、負紅
                html += '<td class="ms-td-num">' +
                    (sumCo === 0 ? '' :
                        '<span class="' + (sumCo < 0 ? 'ms-neg' : 'ms-pos') + '">' + esc(n(sumCo)) + '</span>'
                    ) +
                    '</td>';
                // 退新：一律紅
                html += '<td class="ms-td-num">' +
                    (sumRn === 0 ? '' :
                        '<span class="ms-neg">' + esc(n(sumRn)) + '</span>'
                    ) +
                    '</td>';
                // 退舊：一律紅
                html += '<td class="ms-td-num">' +
                    (sumRo === 0 ? '' :
                        '<span class="ms-neg">' + esc(n(sumRo)) + '</span>'
                    ) +
                    '</td>';

                html += '</tr>';

            }
        }

        html += '</tbody></table></div>';
        return html;
    }

    // B 班專用表格函式（含：筆數欄位）
    function buildTableB(rows) {
        var html = '';

        html += '<div class="ms-table-wrap">';
        html += '<table class="table ms-table ms-table--b">';

        // ===== 表頭（兩列）=====
        html += '<thead>';
        html += '<tr>';
        html += '<th rowspan="2" style="width:70px;">項次</th>';
        html += '<th rowspan="2">材料名稱</th>';

        html += '<th colspan="4" class="ms-th-group">領料</th>';
        html += '<th colspan="4" class="ms-th-group">退料</th>';
        html += '<th colspan="2" class="ms-th-group">領退合計</th>';
        html += '</tr>';

        html += '<tr>';
        html += '<th class="ms-th-num">新</th>';
        html += '<th class="ms-th-num">筆數</th>';
        html += '<th class="ms-th-num">舊</th>';
        html += '<th class="ms-th-num">筆數</th>';

        html += '<th class="ms-th-num">新</th>';
        html += '<th class="ms-th-num">筆數</th>';
        html += '<th class="ms-th-num">舊</th>';
        html += '<th class="ms-th-num">筆數</th>';

        html += '<th class="ms-th-num">新</th>';
        html += '<th class="ms-th-num">舊</th>';
        html += '</tr>';
        html += '</thead>';

        // ===== 內容 =====
        html += '<tbody>';

        rows.forEach(function (r, idx) {
            var cn = Number(r.collar_new || 0);
            var co = Number(r.collar_old || 0);
            var rn = Number(r.recede_new || 0);
            var ro = Number(r.recede_old || 0);
            var tn = Number(r.total_new || 0);
            var to = Number(r.total_old || 0);

            var cnList = (r.collar_new_list === null || r.collar_new_list === undefined) ? '' : String(r.collar_new_list);
            var coList = (r.collar_old_list === null || r.collar_old_list === undefined) ? '' : String(r.collar_old_list);
            var rnList = (r.recede_new_list === null || r.recede_new_list === undefined) ? '' : String(r.recede_new_list);
            var roList = (r.recede_old_list === null || r.recede_old_list === undefined) ? '' : String(r.recede_old_list);

            function vNum(x) { return x === 0 ? '' : esc(n(x)); }
            function vList(s) { return s ? esc(s) : ''; }

            html += '<tr>';
            html += '<td class="ms-td-num">' + (idx + 1) + '</td>';
            html += '<td class="ms-td-name">' + esc(r.material_name || '') + '</td>';

            // 領料 新/筆數、舊/筆數
            html += '<td class="ms-td-num">' + vNum(cn) + '</td>';
            html += '<td class="ms-td-num">' + vList(cnList) + '</td>';
            html += '<td class="ms-td-num">' + vNum(co) + '</td>';
            html += '<td class="ms-td-num">' + vList(coList) + '</td>';

            // 退料 新/筆數、舊/筆數
            html += '<td class="ms-td-num">' + vNum(rn) + '</td>';
            html += '<td class="ms-td-num">' + vList(rnList) + '</td>';
            html += '<td class="ms-td-num">' + vNum(ro) + '</td>';
            html += '<td class="ms-td-num">' + vList(roList) + '</td>';

            // 合計 新/舊（定版顏色）
            // - 合計(新)：正數藍 ms-sum-pos、負數紅 ms-neg
            // - 合計(舊)：正數黑 ms-pos、負數紅 ms-neg
            html += '<td class="ms-td-num">' +
                (tn === 0 ? '' : ('<span class="' + (tn < 0 ? 'ms-neg' : 'ms-sum-pos') + '">' + esc(n(tn)) + '</span>')) +
                '</td>';

            html += '<td class="ms-td-num">' +
                (to === 0 ? '' : ('<span class="' + (to < 0 ? 'ms-neg' : 'ms-pos') + '">' + esc(n(to)) + '</span>')) +
                '</td>';

            html += '</tr>';
        });

        if (!rows.length) {
            html += '<tr><td colspan="12" class="ms-empty">無資料</td></tr>';
        }

        html += '</tbody></table></div>';
        return html;
    }

    function sectionCard(title, subtitle, innerHtml) {
        var html = '';
        html += '<section class="ms-section card card--flat">';
        html += '  <div class="ms-section__head">';
        html += '    <div>';
        html += '      <h2 class="ms-section__title">' + esc(title) + '</h2>';
        html += (subtitle ? ('      <div class="ms-section__sub">' + esc(subtitle) + '</div>') : '');
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="ms-section__body">';
        html += innerHtml || '';
        html += '  </div>';
        html += '</section>';
        return html;
    }

    // D 班專用表格函式
    function renderD(groupD, personnel) {
        groupD = groupD || {};
        var rows = Array.isArray(groupD.rows) ? groupD.rows : [];

        function v(x, cls) {
            var num = Number(x || 0);
            if (num === 0) return '';
            return '<span class="' + cls + '">' + esc(n(num)) + '</span>';
        }

        var tableHtml = '';
        tableHtml += '<div class="ms-table-wrap">';
        tableHtml += '<table class="table ms-table ms-table--d">';
        tableHtml += '<thead>';
        tableHtml += '<tr>';
        tableHtml += '<th rowspan="2" style="width:70px;">項次</th>';
        tableHtml += '<th rowspan="2">分類名稱</th>';
        tableHtml += '<th colspan="2" class="ms-th-group">領料</th>';
        tableHtml += '<th colspan="2" class="ms-th-group">退料</th>';
        tableHtml += '<th rowspan="2" class="ms-th-num">對帳</th>';
        tableHtml += '<th colspan="2" class="ms-th-group">領退合計</th>';
        tableHtml += '</tr>';

        tableHtml += '<tr>';
        tableHtml += '<th class="ms-th-num">新</th>';
        tableHtml += '<th class="ms-th-num">舊</th>';
        tableHtml += '<th class="ms-th-num">新</th>';
        tableHtml += '<th class="ms-th-num">舊</th>';
        tableHtml += '<th class="ms-th-num">新</th>';
        tableHtml += '<th class="ms-th-num">舊</th>';
        tableHtml += '</tr>';
        tableHtml += '</thead>';

        tableHtml += '<tbody>';

        rows.forEach(function (r, idx) {
            var cn = Number(r.collar_new || 0);
            var co = Number(r.collar_old || 0);
            var rn = Number(r.recede_new || 0);
            var ro = Number(r.recede_old || 0);
            var rv = Number(r.recon_value || 0);

            var tn = Number(r.total_new || 0); // collar_new - recede_new
            var to = Number(r.total_old || 0); // collar_old + recon_value - recede_old

            tableHtml += '<tr>';
            tableHtml += '<td class="ms-td-num">' + (idx + 1) + '</td>';
            tableHtml += '<td class="ms-td-name">' + esc(r.category_name || '') + '</td>';

            // 領料
            tableHtml += '<td class="ms-td-num">' + v(cn, cn < 0 ? 'ms-neg' : 'ms-sum-pos') + '</td>';
            tableHtml += '<td class="ms-td-num">' + v(co, co < 0 ? 'ms-neg' : 'ms-pos') + '</td>';

            // 退料（全紅）
            tableHtml += '<td class="ms-td-num">' + v(rn, 'ms-neg') + '</td>';
            tableHtml += '<td class="ms-td-num">' + v(ro, 'ms-neg') + '</td>';

            // 對帳（正黑負紅）
            tableHtml += '<td class="ms-td-num">' + v(rv, rv < 0 ? 'ms-neg' : 'ms-pos') + '</td>';

            // 領退合計
            tableHtml += '<td class="ms-td-num">' + v(tn, tn < 0 ? 'ms-neg' : 'ms-sum-pos') + '</td>';
            tableHtml += '<td class="ms-td-num">' + v(to, to < 0 ? 'ms-neg' : 'ms-pos') + '</td>';

            tableHtml += '</tr>';
        });

        if (!rows.length) {
            tableHtml += '<tr><td colspan="9" class="ms-empty">無資料</td></tr>';
        }

        tableHtml += '</tbody></table></div>';

        // ✅ 標題比照其他班：D班－姓名（無副標題）
        var name = (personnel && personnel.D) ? String(personnel.D) : '';
        var title = 'D班' + (name ? ('－' + name) : '');

        return sectionCard(title, '', tableHtml);
    }

    // B 班 renderer
    function renderGroupB(groups, personnel) {
        if (!groups || !groups.B) return '';

        var rows = (groups.B && Array.isArray(groups.B.rows)) ? groups.B.rows : [];
        var name = (personnel && personnel.B) ? String(personnel.B) : '';
        var title = 'B班' + (name ? ('－' + name) : '');

        return sectionCard(title, '', buildTableB(rows));
    }

    var Mod = {
        render: function (payload, opts) {
            opts = opts || {};
            var root = qs('#msContent');
            if (!root) return;

            payload = payload || {};
            var groups = payload.groups || {};
            var personnel = payload.personnel || {};
            var html = '';

            // ===== Group Dispatcher =====

            // A
            if (groups.A) {
                html += sectionCard(
                    'A班' + ((personnel && personnel.A) ? ('－' + String(personnel.A)) : ''),
                    '',
                    buildTableAC(Array.isArray(groups.A.rows) ? groups.A.rows : [])
                );
            }

            // B
            html += renderGroupB(groups, personnel);

            // C
            if (groups.C) {
                html += sectionCard(
                    'C班' + ((personnel && personnel.C) ? ('－' + String(personnel.C)) : ''),
                    '',
                    buildTableAC(Array.isArray(groups.C.rows) ? groups.C.rows : [])
                );
            }

            // D
            if (groups.D) {
                html += renderD(groups.D);
            }

            // E
            if (groups.E) {
                html += sectionCard(
                    'E班' + ((personnel && personnel.E) ? ('－' + String(personnel.E)) : ''),
                    '',
                    buildTableEF(Array.isArray(groups.E.rows) ? groups.E.rows : [])
                );
            }

            // F
            if (groups.F) {
                html += sectionCard(
                    'F班' + ((personnel && personnel.F) ? ('－' + String(personnel.F)) : ''),
                    '',
                    buildTableEF(Array.isArray(groups.F.rows) ? groups.F.rows : [])
                );
            }

            if (!html) html = '<div class="ms-empty">無資料</div>';
            root.innerHTML = html;
        }
    };

    global.MatStatsRender = Mod;

})(window);
