/* Path: Public/assets/js/mat_stats_render.js
 * 說明: 統計渲染器
 * - 依 payload.groups 渲染：A / B / C / D / E / F
 * - D：同一張表呈現「分類彙總（CAT） + 未分類材料（ITEM）」
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }

    function n(v) {
        if (v === null || v === undefined) return '0';
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

    function fmtQty(v) {
        if (v === null || v === undefined) return '';
        var num = Number(v);
        if (!isFinite(num)) return '';

        // 消除 JS 浮點誤差（關鍵）
        num = Math.round(num * 100) / 100;

        // 整數 → 不顯示小數
        if (Number.isInteger(num)) {
            return String(num);
        }

        // 小數 → 最多顯示 2 位，去掉多餘 0
        return num.toFixed(2).replace(/\.?0+$/, '');
    }

    //A/C 專用表格函式
    function buildTableAC(rows) {
        var html = '';

        html += '<div class="ms-table-wrap">';
        html += '<table class="table ms-table ms-table--ac">';

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

        html += '<tbody>';

        rows.forEach(function (r, idx) {
            var cn = Number(r.collar_new || 0);
            var co = Number(r.collar_old || 0);
            var rn = Number(r.recede_new || 0);
            var ro = Number(r.recede_old || 0);
            var sumNew = Number(r.total_new || 0);
            var sumOld = Number(r.total_old || 0);

            function v(x, cls) {
                var num = Number(x || 0);
                if (num === 0) return '';
                return '<span class="' + cls + '">' + esc(fmtQty(num)) + '</span>';
            }

            html += '<tr>';
            html += '<td class="ms-td-num">' + (idx + 1) + '</td>';
            html += '<td class="ms-td-name">' + esc(r.material_name || '') + '</td>';
            html += '<td class="ms-td-num">' + v(cn, cn < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(co, co < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(rn, rn < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(ro, ro < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(sumNew, sumNew < 0 ? 'ms-neg' : 'ms-sum-pos') + '</td>';
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

        html += '<tbody>';

        var sumCn = 0, sumCo = 0, sumRn = 0, sumRo = 0;

        rows.forEach(function (r, idx) {
            var cn = Number(r.collar_new || 0);
            var co = Number(r.collar_old || 0);
            var rn = Number(r.recede_new || 0);
            var ro = Number(r.recede_old || 0);

            var sh = String(r.shift || '').toUpperCase();
            if (sh === 'F') {
                sumCn += cn;
                sumCo += co;
                sumRn += rn;
                sumRo += ro;
            }

            function v(x, cls) {
                var num = Number(x || 0);
                if (num === 0) return '';
                return '<span class="' + cls + '">' + esc(fmtQty(num)) + '</span>';
            }

            html += '<tr>';
            html += '<td class="ms-td-num">' + (idx + 1) + '</td>';
            html += '<td class="ms-td-name">' + esc(r.material_name || '') + '</td>';
            html += '<td class="ms-td-num">' + v(cn, cn < 0 ? 'ms-neg' : 'ms-sum-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(co, co < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            html += '<td class="ms-td-num">' + v(rn, 'ms-neg') + '</td>';
            html += '<td class="ms-td-num">' + v(ro, 'ms-neg') + '</td>';
            html += '</tr>';
        });

        if (!rows.length) {
            html += '<tr><td colspan="6" class="ms-empty">無資料</td></tr>';
        }

        if (rows.length) {
            var hasF = rows.some(function (r) { return String(r.shift || '').toUpperCase() === 'F'; });
            if (hasF) {
                html += '<tr class="ms-tr-sum">';
                html += '<td class="ms-td-num" colspan="2">合計</td>';
                html += '<td class="ms-td-num">' +
                    (sumCn === 0 ? '' :
                        '<span class="' + (sumCn < 0 ? 'ms-neg' : 'ms-sum-pos') + '">' + esc(fmtQty(sumCn)) + '</span>') +
                    '</td>';
                html += '<td class="ms-td-num">' +
                    (sumCo === 0 ? '' :
                        '<span class="' + (sumCo < 0 ? 'ms-neg' : 'ms-pos') + '">' + esc(fmtQty(sumCo)) + '</span>') +
                    '</td>';
                html += '<td class="ms-td-num">' +
                    (sumRn === 0 ? '' : '<span class="ms-neg">' + esc(fmtQty(sumRn)) + '</span>') +
                    '</td>';
                html += '<td class="ms-td-num">' +
                    (sumRo === 0 ? '' : '<span class="ms-neg">' + esc(fmtQty(sumRo)) + '</span>') +
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

            function vNum(x) {
                var num = Number(x || 0);
                return num === 0 ? '' : esc(fmtQty(num));
            }

            function vList(s) { return s ? esc(s) : ''; }

            html += '<tr>';
            html += '<td class="ms-td-num">' + (idx + 1) + '</td>';
            html += '<td class="ms-td-name">' + esc(r.material_name || '') + '</td>';

            html += '<td class="ms-td-num">' + vNum(cn) + '</td>';
            html += '<td class="ms-td-num">' + vList(cnList) + '</td>';
            html += '<td class="ms-td-num">' + vNum(co) + '</td>';
            html += '<td class="ms-td-num">' + vList(coList) + '</td>';

            html += '<td class="ms-td-num">' + vNum(rn) + '</td>';
            html += '<td class="ms-td-num">' + vList(rnList) + '</td>';
            html += '<td class="ms-td-num">' + vNum(ro) + '</td>';
            html += '<td class="ms-td-num">' + vList(roList) + '</td>';

            html += '<td class="ms-td-num">' +
                (tn === 0 ? '' : ('<span class="' + (tn < 0 ? 'ms-neg' : 'ms-sum-pos') + '">' + esc(fmtQty(tn)) + '</span>')) +
                '</td>';

            html += '<td class="ms-td-num">' +
                (to === 0 ? '' : ('<span class="' + (to < 0 ? 'ms-neg' : 'ms-pos') + '">' + esc(fmtQty(to)) + '</span>')) +
                '</td>';

            html += '</tr>';
        });

        if (!rows.length) {
            html += '<tr><td colspan="12" class="ms-empty">無資料</td></tr>';
        }

        html += '</tbody></table></div>';
        return html;
    }

    function sectionCard(sectionId, title, subtitle, innerHtml) {
        var html = '';
        sectionId = (sectionId === null || sectionId === undefined) ? '' : String(sectionId);
        sectionId = sectionId ? esc(sectionId) : '';

        html += '<section class="ms-section card card--flat"' + (sectionId ? (' id="' + sectionId + '"') : '') + '>';
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

    // ✅ D 班：同表顯示 CAT + ITEM
    // D 班專用表格函式（分類列 + 未分類材料列：只顯示材料名稱，不顯示材料編號）
    function renderD(groupD, personnel) {
        groupD = groupD || {};
        var rows = Array.isArray(groupD.rows) ? groupD.rows : [];

        function v(x, cls) {
            var num = Number(x || 0);
            if (num === 0) return '';
            return '<span class="' + cls + '">' + esc(fmtQty(num)) + '</span>';
        }

        // ✅ 顯示欄位：CAT 顯示分類名稱；ITEM（未分類材料）只顯示材料名稱
        function labelForRow(r) {
            var kind = String(r.row_kind || '').toUpperCase();
            if (kind === 'ITEM') {
                return String(r.material_name || ''); // 不顯示材料編號
            }
            return String(r.category_name || '');
        }

        var tableHtml = '';
        tableHtml += '<div class="ms-table-wrap">';
        tableHtml += '<table class="table ms-table ms-table--d">';
        tableHtml += '<thead>';
        tableHtml += '<tr>';
        tableHtml += '<th rowspan="2" style="width:70px;">項次</th>';
        tableHtml += '<th rowspan="2">材料名稱</th>';
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

            var tn = Number(r.total_new || 0);
            var to = Number(r.total_old || 0);

            var kind = String(r.row_kind || '').toUpperCase();
            var trCls = (kind === 'ITEM') ? ' class="ms-tr-sub"' : '';

            tableHtml += '<tr' + trCls + '>';
            tableHtml += '<td class="ms-td-num">' + (idx + 1) + '</td>';
            tableHtml += '<td class="ms-td-name">' + esc(labelForRow(r)) + '</td>';

            // 領料（新、舊）：正黑、負紅
            tableHtml += '<td class="ms-td-num">' + v(cn, cn < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            tableHtml += '<td class="ms-td-num">' + v(co, co < 0 ? 'ms-neg' : 'ms-pos') + '</td>';

            // 退料（新、舊）：正黑、負紅
            tableHtml += '<td class="ms-td-num">' + v(rn, rn < 0 ? 'ms-neg' : 'ms-pos') + '</td>';
            tableHtml += '<td class="ms-td-num">' + v(ro, ro < 0 ? 'ms-neg' : 'ms-pos') + '</td>';

            // 對帳（分類列才有）：正黑、負紅
            var kind = String(r.row_kind || '').toUpperCase();
            var rv = Number(r.recon_value || 0);

            tableHtml += '<td class="ms-td-num">' +
                (kind === 'ITEM' ? '' : v(rv, rv < 0 ? 'ms-neg' : 'ms-pos')) +
                '</td>';


            // 領退合計
            // 新：正藍、負紅
            tableHtml += '<td class="ms-td-num">' + v(tn, tn < 0 ? 'ms-neg' : 'ms-sum-pos') + '</td>';
            // 舊：正黑、負紅
            tableHtml += '<td class="ms-td-num">' + v(to, to < 0 ? 'ms-neg' : 'ms-pos') + '</td>';

            tableHtml += '</tr>';
        });

        if (!rows.length) {
            tableHtml += '<tr><td colspan="9" class="ms-empty">無資料</td></tr>';
        }

        tableHtml += '</tbody></table></div>';

        // ✅ 標題比照其他班：D班－姓名
        return sectionCard(
            'D',
            'D班' + ((personnel && personnel.D) ? ('－' + String(personnel.D)) : ''),
            '',
            tableHtml
        );
    }

    function renderGroupB(groups, personnel) {
        if (!groups || !groups.B) return '';
        var rows = (groups.B && Array.isArray(groups.B.rows)) ? groups.B.rows : [];
        var name = (personnel && personnel.B) ? String(personnel.B) : '';
        var title = 'B班' + (name ? ('－' + name) : '');
        return sectionCard('B', title, '', buildTableB(rows));
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

            if (groups.A) {
                html += sectionCard(
                    'A',
                    'A班' + ((personnel && personnel.A) ? ('－' + String(personnel.A)) : ''),
                    '',
                    buildTableAC(Array.isArray(groups.A.rows) ? groups.A.rows : [])
                );
            }

            html += renderGroupB(groups, personnel);

            if (groups.C) {
                html += sectionCard(
                    'C',
                    'C班' + ((personnel && personnel.C) ? ('－' + String(personnel.C)) : ''),
                    '',
                    buildTableAC(Array.isArray(groups.C.rows) ? groups.C.rows : [])
                );
            }

            if (groups.D) {
                html += renderD(groups.D, personnel);
            }

            if (groups.E) {
                html += sectionCard(
                    'E',
                    'E班' + ((personnel && personnel.E) ? ('－' + String(personnel.E)) : ''),
                    '',
                    buildTableEF(Array.isArray(groups.E.rows) ? groups.E.rows : [])
                );
            }

            if (groups.F) {
                html += sectionCard(
                    'F',
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
