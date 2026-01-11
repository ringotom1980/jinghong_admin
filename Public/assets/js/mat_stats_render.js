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

    function renderD(groupD) {
        groupD = groupD || {};
        var cats = Array.isArray(groupD.categories) ? groupD.categories : [];
        var recon = groupD.recon || null;
        var reconValues = (recon && recon.values) ? recon.values : {};

        // ✅ 注意：後端目前回的是 map（category_id => sums），不是 array
        var issueSumMap = (groupD && groupD.issue_sum_by_category && typeof groupD.issue_sum_by_category === 'object')
            ? groupD.issue_sum_by_category
            : {};

        var html = '';

        // 1) 類別清單
        var list = '<div class="ms-d-grid">';
        if (!cats.length) {
            list += '<div class="ms-empty">尚無分類</div>';
        } else {
            list += '<div class="ms-d-cats">';
            for (var i = 0; i < cats.length; i++) {
                var c = cats[i];
                var val = (reconValues && (reconValues[String(c.id)] !== undefined)) ? String(reconValues[String(c.id)]) : '';
                list += ''
                    + '<div class="ms-d-cat">'
                    + '  <div class="ms-d-cat__name">' + esc(c.category_name) + '</div>'
                    + '  <div class="ms-d-cat__meta">ID ' + esc(String(c.id)) + '｜排序 ' + esc(String(c.sort_order)) + '</div>'
                    + '  <div class="ms-d-cat__recon">'
                    + '    <span class="ms-d-chip">對帳</span>'
                    + '    <span class="ms-d-val">' + (val !== '' ? esc(val) : '<span class="ms-d-muted">（未填）</span>') + '</span>'
                    + '  </div>'
                    + '</div>';
            }
            list += '</div>';
        }
        list += '</div>';

        // 2) 來源統計（以 map 呈現：category_id => sums）
        var sumHtml = '';
        var keys = Object.keys(issueSumMap || {});
        if (keys.length) {
            sumHtml += '<div class="ms-table-wrap"><table class="table ms-table">';
            sumHtml += '<thead><tr>'
                + '<th>分類ID</th>'
                + '<th class="ms-th-num">領新料</th>'
                + '<th class="ms-th-num">領舊料</th>'
                + '<th class="ms-th-num">退新料</th>'
                + '<th class="ms-th-num">退舊料</th>'
                + '<th class="ms-th-num">廢料</th>'
                + '<th class="ms-th-num">下腳</th>'
                + '</tr></thead><tbody>';

            for (var j = 0; j < keys.length; j++) {
                var cid = keys[j];
                var s = issueSumMap[cid] || {};
                sumHtml += '<tr>'
                    + '<td>' + esc(String(cid)) + '</td>'
                    + '<td class="ms-td-num">' + esc(n(s.collar_new)) + '</td>'
                    + '<td class="ms-td-num">' + esc(n(s.collar_old)) + '</td>'
                    + '<td class="ms-td-num">' + esc(n(s.recede_new)) + '</td>'
                    + '<td class="ms-td-num">' + esc(n(s.recede_old)) + '</td>'
                    + '<td class="ms-td-num">' + esc(n(s.scrap)) + '</td>'
                    + '<td class="ms-td-num">' + esc(n(s.footprint)) + '</td>'
                    + '</tr>';
            }
            sumHtml += '</tbody></table></div>';
        } else {
            sumHtml = '<div class="ms-empty">來源統計尚未提供（issue_sum_by_category 為空）</div>';
        }

        // 3) recon meta
        var metaHtml = '';
        if (recon && recon.meta) {
            metaHtml = '最後更新：' + esc(String(recon.meta.updated_at || '')) + '｜更新者：' + esc(String(recon.meta.updated_by || ''));
        } else {
            metaHtml = '尚無對帳紀錄';
        }

        html += sectionCard('D 組（分類對帳）', metaHtml, list + '<div class="ms-gap"></div>' + sumHtml);
        return html;
    }

    function renderShiftCard(groups, shift, personnel, hasSort) {
        if (!groups || !groups[shift]) return '';

        var rows = (groups[shift] && Array.isArray(groups[shift].rows)) ? groups[shift].rows : [];

        // 標題：A班－姓名（若沒有姓名就只顯示 A班）
        var name = (personnel && personnel[shift]) ? String(personnel[shift]) : '';
        var title = shift + '班' + (name ? ('－' + name) : '');

        // ✅ 副標一律不顯示
        return sectionCard(title, '', buildTable(rows, { hasSort: !!hasSort }));
    }

    //A/C 專用 renderer
    function renderGroupAC(groups, personnel) {
        var html = '';

        ['A', 'C'].forEach(function (shift) {
            if (!groups[shift]) return;

            var rows = Array.isArray(groups[shift].rows) ? groups[shift].rows : [];

            var name = (personnel && personnel[shift]) ? String(personnel[shift]) : '';
            var title = shift + '班' + (name ? ('－' + name) : '');

            html += sectionCard(
                title,
                '',
                buildTableAC(rows)
            );
        });

        return html;
    }

    // E/F 專用 renderer
    function renderGroupEF(groups, personnel) {
        var html = '';

        ['E', 'F'].forEach(function (shift) {
            if (!groups[shift]) return;

            var rows = Array.isArray(groups[shift].rows) ? groups[shift].rows : [];

            var name = (personnel && personnel[shift]) ? String(personnel[shift]) : '';
            var title = shift + '班' + (name ? ('－' + name) : '');

            html += sectionCard(
                title,
                '',
                buildTableEF(rows)
            );
        });

        return html;
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

            // A / C（先只實作這組）
            html += renderGroupAC(groups, personnel);

            // B（預留）
            // html += renderGroupB(groups, personnel);

            // D（暫時保留你現有的）
            if (groups.D) {
                html += renderD(groups.D);
            }

            // E / F
            html += renderGroupEF(groups, personnel);

            if (!html) html = '<div class="ms-empty">無資料</div>';
            root.innerHTML = html;
        }
    };

    global.MatStatsRender = Mod;

})(window);
