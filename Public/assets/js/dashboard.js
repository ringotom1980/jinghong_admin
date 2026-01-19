/*
 * Path: Public/assets/js/dashboard.js
 * 說明: Dashboard v1.0（骨架可運行版）
 * - 先用假資料渲染 UI + 點擊導頁
 * - 下一步再接 /api/dashboard/kpi.php
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function pad2(n) { n = String(n); return n.length >= 2 ? n : ('0' + n); }

    function formatZhDate(iso) {
        // iso: YYYY-MM-DD
        if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
        var y = iso.slice(0, 4);
        var m = String(parseInt(iso.slice(5, 7), 10));
        var d = String(parseInt(iso.slice(8, 10), 10));
        return y + '年' + m + '月' + d + '日';
    }

    function setLight(key, on) {
        var dot = qs('[data-light="' + key + '"]');
        if (!dot) return;
        dot.classList.remove('is-green', 'is-red');
        dot.classList.add(on ? 'is-green' : 'is-red');
    }

    function renderList(el, rows) {
        if (!el) return;
        if (!rows || !rows.length) {
            el.innerHTML = '<div class="dash-muted">—</div>';
            return;
        }
        var html = rows.map(function (r) {
            return (
                '<div class="dash-item">' +
                '<div class="dash-item__k">' + esc(r.k) + '</div>' +
                '<div class="dash-item__v">' + esc(r.v) + '</div>' +
                '</div>'
            );
        }).join('');
        el.innerHTML = html;
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

    // 目前即期日期（由 applyData 設定；點擊導頁要用這個，不要再吃 Fake）
    var Current = { asof_date: '' };

    // ======= routes (骨架先用固定路徑；若你有 BASE_URL 會自動前綴) =======
    function toUrl(pathWithLeadingSlash) {
        var base = (global.BASE_URL || '');
        base = base ? String(base).replace(/\/$/, '') : '';
        return base + pathWithLeadingSlash;
    }

    var ROUTES = {
        mat_stats: toUrl('/Public/modules/mat/stats.php'),
        mat_issue: toUrl('/Public/modules/mat/issue.php'),
        mat_edit_b: toUrl('/Public/modules/mat/edit.php'),
        car_base: toUrl('/Public/modules/car/base.php'),
        car_stats: toUrl('/Public/modules/car/stats.php'),
        equ_stats: toUrl('/Public/modules/equ/stats.php')
    };

    // ======= fake data (之後直接替換成 API 回傳) =======
    var Fake = {
        asof_date: '2026-01-20',

        mat: {
            status: { LWK: true, T: false, S: true, RECON: false },

            a_pick: [
                { k: '#1', v: '12' },
                { k: '#2', v: '3' }
                // #500 若無數據就不顯示（照你定義）
            ],

            d_negative_returns: [
                { k: '材料A', v: '-2' },
                { k: '材料B', v: '-1' }
            ],

            stats: {
                A: { rows: [] },   // 先留空，A 班你已經走 API 了
                F: {
                    rows: [
                        // 測試用：桿上 / 亭置 / 未分型（未分型只加合計）
                        { material_name: '變壓器(桿上)', collar_new: 20, collar_old: 3, recede_new: 5, recede_old: 1 },
                        { material_name: '變壓器(亭置)', collar_new: 20, collar_old: 3, recede_new: 5, recede_old: 1 }
                    ]
                }
            }

        },

        vehicle: {
            overdue: [
                { k: 'KEA-9535（定檢）', v: '2026-01-10' }
            ],
            due_soon: [
                { k: 'KEG-6066（保險）', v: '2026-01-25' }
            ],
            repair_6m: { company: 120000, team: 80000, total: 200000 }
        }
    };

    /**
 * 由 A 班統計 rows 產生 1-2 卡片顯示資料
 * @param {Array} rows - stats_ac 的 A 班 rows
 * @return {Array<{k:string, v:string}>}
 */
    function buildMatACard(rows) {
        if (!Array.isArray(rows) || rows.length === 0) return [];

        // 1️⃣ 固定材料編號對照
        var mapByNumber = {
            '1102000019': '#1一般電纜',
            '1102000024': '#1防蟻電纜',
            '1102000021': '500一般電纜',
            '1102000025': '500防蟻電纜',
            '1102000034': '477被覆線',
            '1102000035': '#2被覆線'
        };

        // 2️⃣ 字串匹配（未分型 → 要加總）
        var nameMatchers = [
            { key: '四路開關(未分型)', match: '地下四路' },
            { key: '氣封開關(未分型)', match: '氣封開關' },
            { key: '架空自動線路開關(未分型)', match: '架空自動線路開關' }
        ];

        var result = [];
        var usedIndex = {};

        // 3️⃣ 先處理「材料編號直對」
        rows.forEach(function (r) {
            var mn = String(r.material_number || '');
            if (!mapByNumber[mn]) return;

            var qty = Number(r.total_new || 0);
            if (qty <= 0) return;

            result.push({
                k: mapByNumber[mn],
                v: String(qty)
            });

            usedIndex[mn] = true;
        });

        // 4️⃣ 再處理「字串匹配（合併）」
        nameMatchers.forEach(function (rule) {
            var sum = 0;

            rows.forEach(function (r) {
                if (!r.material_name) return;
                if (String(r.material_name).indexOf(rule.match) === -1) return;

                var qty = Number(r.total_new || 0);
                if (qty > 0) sum += qty;
            });

            if (sum > 0) {
                result.push({
                    k: rule.key,
                    v: String(sum)
                });
            }
        });

        return result;
    }

    /**
 * 由 F 班統計 rows 產生 1-4 卡片（領/退 × 新/舊 × 桿上/亭置 + 合計）
 * 規則：
 * - material_name 含「桿上」→ pole
 * - material_name 含「亭置」或「亭置式」→ pad
 * - 其餘 → 未分型，只加到合計（不進 pole/pad）
 */
    function buildMatFTransformer(rows) {
        var out = {
            issue: { pole_new: 0, pole_old: 0, pad_new: 0, pad_old: 0, total: 0 },
            ret: { pole_new: 0, pole_old: 0, pad_new: 0, pad_old: 0, total: 0 }
        };
        if (!Array.isArray(rows) || rows.length === 0) return out;

        function pickType(name) {
            name = (name == null) ? '' : String(name);
            if (name.indexOf('桿上') !== -1) return 'POLE';
            if (name.indexOf('亭置') !== -1) return 'PAD';
            return 'UN';
        }

        rows.forEach(function (r) {
            var name = r && r.material_name ? String(r.material_name) : '';
            var t = pickType(name);

            var collarNew = Number(r.collar_new || 0);
            var collarOld = Number(r.collar_old || 0);
            var recedeNew = Number(r.recede_new || 0);
            var recedeOld = Number(r.recede_old || 0); // ✅ stats_ef 已定版：退舊=recede_old+scrap+footprint

            // 合計（含未分型）
            out.issue.total += (collarNew + collarOld);
            out.ret.total += (recedeNew + recedeOld);

            // 分型（匹配到才分流）
            if (t === 'POLE') {
                out.issue.pole_new += collarNew;
                out.issue.pole_old += collarOld;
                out.ret.pole_new += recedeNew;
                out.ret.pole_old += recedeOld;
            } else if (t === 'PAD') {
                out.issue.pad_new += collarNew;
                out.issue.pad_old += collarOld;
                out.ret.pad_new += recedeNew;
                out.ret.pad_old += recedeOld;
            }
        });

        return out;
    }

    function applyData(d) {
        d = d || Fake;

        var asof = d.asof_date || '';
        Current.asof_date = asof;

        var asofText = formatZhDate(asof);

        var elAsOf = qs('#dashAsOfDate');
        if (elAsOf) elAsOf.textContent = asofText;

        var elDate = qs('#matNextDateText');
        if (elDate) elDate.textContent = asofText;

        setLight('LWK', !!(d.mat && d.mat.status && d.mat.status.LWK));
        setLight('T', !!(d.mat && d.mat.status && d.mat.status.T));
        setLight('S', !!(d.mat && d.mat.status && d.mat.status.S));
        setLight('RECON', !!(d.mat && d.mat.status && d.mat.status.RECON));

        // 1-2 即期 A 班領料（由統計頁 A 班邏輯共用）
        var aRows =
            d.mat &&
                d.mat.stats &&
                d.mat.stats.A &&
                Array.isArray(d.mat.stats.A.rows)
                ? d.mat.stats.A.rows
                : [];

        renderList(qs('#matAList'), buildMatACard(aRows));

        // 1-3 即期 D 班退料負數 Top N
        renderList(qs('#matDNegList'), d.mat && d.mat.d_negative_returns ? d.mat.d_negative_returns : []);

        // 1-4 即期 F 班變壓器（字串匹配：桿上/亭置；未分型只加到合計）
        var fRows =
            d.mat &&
                d.mat.stats &&
                d.mat.stats.F &&
                Array.isArray(d.mat.stats.F.rows)
                ? d.mat.stats.F.rows
                : [];

        var fx = (typeof buildMatFTransformer === 'function')
            ? buildMatFTransformer(fRows)
            : null;

        function setText(id, v) {
            var el = qs('#' + id);
            if (!el) return;
            el.textContent = (v === null || v === undefined) ? '—' : String(v);
        }

        if (fx) {
            setText('fIssuePoleNew', fx.issue.pole_new);
            setText('fIssuePoleOld', fx.issue.pole_old);
            setText('fIssuePadNew', fx.issue.pad_new);
            setText('fIssuePadOld', fx.issue.pad_old);
            setText('fIssueTotal', fx.issue.total);

            setText('fReturnPoleNew', fx.ret.pole_new);
            setText('fReturnPoleOld', fx.ret.pole_old);
            setText('fReturnPadNew', fx.ret.pad_new);
            setText('fReturnPadOld', fx.ret.pad_old);
            setText('fReturnTotal', fx.ret.total);
        } else {
            // 如果你還沒貼 buildMatFTransformer()，至少不讓畫面壞
            setText('fIssuePoleNew', '—');
            setText('fIssuePoleOld', '—');
            setText('fIssuePadNew', '—');
            setText('fIssuePadOld', '—');
            setText('fIssueTotal', '—');

            setText('fReturnPoleNew', '—');
            setText('fReturnPoleOld', '—');
            setText('fReturnPadNew', '—');
            setText('fReturnPadOld', '—');
            setText('fReturnTotal', '—');
        }

        // 車輛卡
        renderList(qs('#carOverdueList'), d.vehicle && d.vehicle.overdue ? d.vehicle.overdue : []);
        renderList(qs('#carDueSoonList'), d.vehicle && d.vehicle.due_soon ? d.vehicle.due_soon : []);

        var r6 = d.vehicle && d.vehicle.repair_6m ? d.vehicle.repair_6m : null;
        if (r6) {
            var c1 = qs('#carRepairCompany'); if (c1) c1.textContent = String(r6.company != null ? r6.company : '—');
            var c2 = qs('#carRepairTeam'); if (c2) c2.textContent = String(r6.team != null ? r6.team : '—');
            var c3 = qs('#carRepairTotal'); if (c3) c3.textContent = String(r6.total != null ? r6.total : '—');
        }
    }

    function bindClicks() {
        // 卡片整張點擊
        qsa('.dash-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                // 如果點在燈號按鈕上，交給燈號 handler
                var btn = e.target && e.target.closest && e.target.closest('.dash-light');
                if (btn) return;

                var jump = card.getAttribute('data-jump');
                var section = card.getAttribute('data-section') || '';
                if (!jump || !ROUTES[jump]) return;

                // 先用 hash 來定位（後續 mat_stats.js / car_base.js 你再接精準滾動）
                var url = ROUTES[jump] + (section ? ('#' + encodeURIComponent(section)) : '');
                global.location.href = url;
            });
        });

        // 燈號點擊（照你定義：LWK/T/S -> 提領作業；對帳 -> D班管理）
        qsa('.dash-light').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var action = btn.getAttribute('data-action');
                var asof = Current.asof_date || Fake.asof_date || '';

                if (action === 'go_issue') {
                    var t = btn.getAttribute('data-type') || '';
                    // 先用 hash 帶參數，後續你在 issue.js 再解析
                    global.location.href = ROUTES.mat_issue + '#date=' + encodeURIComponent(asof) + '&type=' + encodeURIComponent(t);
                    return;
                }

                if (action === 'go_edit_b') {
                    global.location.href = ROUTES.mat_edit_b + '#date=' + encodeURIComponent(asof);
                    return;
                }
            });
        });
    }

    function loadKpi() {
        // 若全站 api.js 有 apiGet，就用它；沒有就退回假資料
        if (typeof global.apiGet !== 'function') {
            applyData(Fake);
            return;
        }

        global.apiGet('/api/dashboard/kpi', {}).then(function (j) {
            if (!j || j.success !== true) {
                applyData(Fake);
                return;
            }
            applyData(j.data || {});
        }).catch(function () {
            applyData(Fake);
        });
    }

    function init() {
        loadKpi();     // ✅ 先改成載入 API，失敗才 fallback 假資料
        bindClicks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
