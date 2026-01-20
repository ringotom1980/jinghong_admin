/*
 * Path: Public/assets/js/dashboard.js
 * 說明: Dashboard（依卡片順序渲染：1-1 → 1-4 → 2-x → 3-x）
 * 注意：
 * - 不碰字體，不做多餘樣式
 * - 只負責：載入 KPI、填值、點擊導頁
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function esc(s) {
        s = (s === null || s === undefined) ? '' : String(s);
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatZhDate(iso) {
        if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
        var y = iso.slice(0, 4);
        var m = String(parseInt(iso.slice(5, 7), 10));
        var d = String(parseInt(iso.slice(8, 10), 10));
        return y + '年' + m + '月' + d + '日';
    }

    function formatTwdAmount(n) {
        n = Number(n);
        if (!isFinite(n) || n === 0) return '0元';

        var abs = Math.abs(n);
        var sign = n < 0 ? '-' : '';

        if (abs < 10000) {
            return sign + abs.toLocaleString('zh-TW') + '元';
        }

        var wan = Math.floor(abs / 10000);
        var rest = abs % 10000;

        if (rest === 0) {
            return sign + wan + '萬元';
        }

        return sign + wan + '萬' + rest.toLocaleString('zh-TW') + '元';
    }

    function setText(id, v) {
        var el = qs('#' + id);
        if (!el) return;
        el.textContent = (v === null || v === undefined || v === '') ? '—' : String(v);
    }

    // 目前即期日期（給導頁用）
    var Current = { asof_date: '' };

    // ===== 導頁路徑（用 BASE_URL 前綴；不硬塞 /Public）=====
    function toUrl(path) {
        var base = (global.BASE_URL || '');
        base = base ? String(base).replace(/\/$/, '') : '';
        return base + path;
    }

    // 你系統的漂亮網址若已做好，就把這裡改成 /modules/...；目前先保守沿用你現有路徑
    var ROUTES = {
        mat_stats: toUrl('/Public/modules/mat/stats.php'),
        mat_issue: toUrl('/Public/modules/mat/issue.php'),
        mat_edit_b: toUrl('/Public/modules/mat/edit.php'),
        car_base: toUrl('/Public/modules/car/base.php'),
        car_stats: toUrl('/Public/modules/car/stats.php'),

    };

    /* =====================================================
     * 1-1：近期領退作業狀態（四顆燈號）
     * - 你現在是「燈條」：class 要加在 button 上
     * ===================================================== */
    function setLight(key, on) {
        // 找到 span[data-light="X"]，再往上找到 button.dash-light
        var dot = qs('[data-light="' + key + '"]');
        if (!dot) return;
        var btn = dot.closest ? dot.closest('.dash-light') : null;
        if (!btn) return;

        btn.classList.remove('is-green', 'is-red');
        btn.classList.add(on ? 'is-green' : 'is-red');
    }

    /* =====================================================
     * 共用：清單渲染（用 db-row，避免亂掉）
     * rows: [{k:'', v:''}, ...]
     * ===================================================== */
    function renderList(el, rows) {
        if (!el) return;

        if (!rows || !rows.length) {
            el.innerHTML = '<div class="db-empty">—</div>';
            return;
        }

        var html = rows.map(function (r) {
            return (
                '<div class="db-row">' +
                '<div class="db-row-k">' + esc(r.k) + '</div>' +
                '<div class="db-row-k">' + esc(r.v) + '</div>' +
                '</div>'
            );
        }).join('');

        el.innerHTML = html;
    }

    /* =====================================================
 * 2-1/2-2：車輛清單（編號/車牌 + 檢查項目膠囊 + 更多展開）
 * payload rows:
 *  [{ vehicle_id, name, items: ["驗車","保險",...]}]
 * ===================================================== */

    var VehicleUI = {
        expanded: { overdue: false, due_soon: false },
        data: { overdue: [], due_soon: [] }
    };

    function pillClassByLabel(label) {
        // 你已律定文字，不用猜，不做換行/橫向捲動
        switch (label) {
            case '驗車': return 'db-pill--verify';
            case '保險': return 'db-pill--insurance';
            case '廢氣': return 'db-pill--emission';
            case '行車': return 'db-pill--drive';
            case 'X光': return 'db-pill--xray';
            case '絕緣': return 'db-pill--insulation';
            default: return 'db-pill--muted';
        }
    }

    function renderVehicleList(el, key) {
        if (!el) return;

        var rows = VehicleUI.data[key] || [];
        if (!rows.length) {
            el.innerHTML = '<div class="db-empty">—</div>';
            return;
        }

        var expanded = !!VehicleUI.expanded[key];
        var max = 5;
        var show = expanded ? rows : rows.slice(0, max);
        var hasMore = rows.length > max;

        var html = show.map(function (r) {
            var name = (r && r.name) ? String(r.name) : '';
            var items = (r && Array.isArray(r.items)) ? r.items : [];
            items = items.slice(0, 4); // 你說最多同時 4 個

            var pills = items.map(function (it) {
                var t = String(it || '');
                if (!t) return '';
                return '<span class="db-pill ' + pillClassByLabel(t) + '">' + esc(t) + '</span>';
            }).join('');

            return (
                '<div class="db-row db-row--vehicle" data-vid="' + esc(r.vehicle_id || '') + '">' +
                '<div class="db-vrow">' +
                '<div class="db-vname">' + esc(name) + '</div>' +
                (pills ? ('<div class="db-pills" aria-label="逾期項目">' + pills + '</div>') : '') +
                '</div>' +
                '</div>'
            );
        }).join('');

        if (hasMore) {
            html += (
                '<div class="db-more">' +
                '<button type="button" class="db-pill db-pill--more" data-more="' + esc(key) + '">' +
                (expanded ? '收合' : ('更多（' + rows.length + '）')) +
                '</button>' +
                '</div>'
            );
        }

        el.innerHTML = html;
    }

    function setVehicleExpanded(key, on) {
        var other = (key === 'overdue') ? 'due_soon' : 'overdue';

        // 互斥：展開這張就收另一張
        VehicleUI.expanded[key] = !!on;
        if (on) VehicleUI.expanded[other] = false;

        renderVehicleList(qs('#carOverdueList'), 'overdue');
        renderVehicleList(qs('#carDueSoonList'), 'due_soon');
    }

    function bindVehicleMoreButtons() {
        // 用事件委派：清單內的更多/收合
        document.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest ? e.target.closest('.db-pill--more') : null;
            if (!btn) return;

            e.preventDefault();
            e.stopPropagation(); // 不要觸發整張卡片導頁

            var key = btn.getAttribute('data-more') || '';
            if (key !== 'overdue' && key !== 'due_soon') return;

            setVehicleExpanded(key, !VehicleUI.expanded[key]);
        }, true);

        // 點卡片外自動收合（只管 2-1/2-2）
        document.addEventListener('click', function (e) {
            if (!VehicleUI.expanded.overdue && !VehicleUI.expanded.due_soon) return;

            var overCard = qs('#carOverdueList') ? qs('#carOverdueList').closest('article.db-card') : null;
            var soonCard = qs('#carDueSoonList') ? qs('#carDueSoonList').closest('article.db-card') : null;

            var inOver = overCard && overCard.contains(e.target);
            var inSoon = soonCard && soonCard.contains(e.target);

            // 只要點在 2-1/2-2 任何一張卡片外 → 全收
            if (!inOver && !inSoon) {
                VehicleUI.expanded.overdue = false;
                VehicleUI.expanded.due_soon = false;
                renderVehicleList(qs('#carOverdueList'), 'overdue');
                renderVehicleList(qs('#carDueSoonList'), 'due_soon');
            }
        });
    }

    /* =====================================================
     * 1-2：近期 A 班領料（依你原本 buildMatACard 規則）
     * - 你要共用統計邏輯，所以這裡只做「挑重點顯示」
     * ===================================================== */
    function buildMatACard(rows) {
        if (!Array.isArray(rows) || rows.length === 0) return [];

        // 固定材料編號對照（你原本那份照搬）
        var mapByNumber = {
            '1102000019': '#1一般電纜',
            '1102000024': '#1防蟻電纜',
            '1102000021': '500一般電纜',
            '1102000025': '500防蟻電纜',
            '1102000034': '477被覆線',
            '1102000035': '#2被覆線'
        };

        // 字串匹配（未分型 → 要加總）
        var nameMatchers = [
            { key: '四路開關(未分型)', match: '地下四路' },
            { key: '氣封開關(未分型)', match: '氣封開關' },
            { key: '架空自動線路開關(未分型)', match: '架空自動線路開關' }
        ];

        var result = [];

        // 先處理「材料編號直對」
        rows.forEach(function (r) {
            var mn = String(r.material_number || '');
            if (!mapByNumber[mn]) return;

            var qty = Number(r.total_new || 0);
            if (qty <= 0) return;

            result.push({ k: mapByNumber[mn], v: String(qty) });
        });

        // 再處理「字串匹配（合併）」
        nameMatchers.forEach(function (rule) {
            var sum = 0;
            rows.forEach(function (r) {
                if (!r.material_name) return;
                if (String(r.material_name).indexOf(rule.match) === -1) return;
                var qty = Number(r.total_new || 0);
                if (qty > 0) sum += qty;
            });
            if (sum > 0) result.push({ k: rule.key, v: String(sum) });
        });

        return result;
    }

    /* =====================================================
     * 1-4：近期 F 班變壓器領退（桿上/亭置 + 合計）
     * - 未分型：只加到合計
     * ===================================================== */
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
            var recedeOld = Number(r.recede_old || 0);

            // 合計（含未分型）
            out.issue.total += (collarNew + collarOld);
            out.ret.total += (recedeNew + recedeOld);

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

    /* =====================================================
     * 依卡片順序套資料：1-1 → 1-4
     * ===================================================== */
    function applyKpi(data) {
        data = data || {};

        // ===== 1-1：日期 + 燈號 =====
        Current.asof_date = data.asof_date || '';
        var asofText = formatZhDate(Current.asof_date);

        setText('dashAsOfDate', asofText);
        setText('matNextDateText', asofText);

        var status = (data.mat && data.mat.status) ? data.mat.status : {};
        setLight('LWK', !!status.LWK);
        setLight('T', !!status.T);
        setLight('S', !!status.S);
        setLight('RECON', !!status.RECON);

        // ===== 1-2：A 班清單 =====
        var aRows = (data.mat && data.mat.stats && data.mat.stats.A && Array.isArray(data.mat.stats.A.rows))
            ? data.mat.stats.A.rows
            : [];
        renderList(qs('#matAList'), buildMatACard(aRows));

        // ===== 1-3：D 班負數清單 =====
        var dNeg = (data.mat && Array.isArray(data.mat.d_negative_returns)) ? data.mat.d_negative_returns : [];
        renderList(qs('#matDNegList'), dNeg);

        // ===== 1-4：F 班變壓器數字 =====
        var fRows = (data.mat && data.mat.stats && data.mat.stats.F && Array.isArray(data.mat.stats.F.rows))
            ? data.mat.stats.F.rows
            : [];
        var fx = buildMatFTransformer(fRows);

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

        // ===== 2-1 / 2-2：車輛逾期 / 即將到期 =====
        var vpack = (data && data.vehicle) ? data.vehicle : {};
        var overdue = Array.isArray(vpack.overdue) ? vpack.overdue : [];
        var dueSoon = Array.isArray(vpack.due_soon) ? vpack.due_soon : [];

        VehicleUI.data.overdue = overdue;
        VehicleUI.data.due_soon = dueSoon;

        renderVehicleList(qs('#carOverdueList'), 'overdue');
        renderVehicleList(qs('#carDueSoonList'), 'due_soon');

        // ===== 2-3：近半年維修金額（依膠囊期間）=====
        var r6 = (vpack && vpack.repair_6m) ? vpack.repair_6m : null;
        setText('carRepairCompany', r6 ? formatTwdAmount(r6.company) : '—');
        setText('carRepairTeam', r6 ? formatTwdAmount(r6.team) : '—');
        setText('carRepairTotal', r6 ? formatTwdAmount(r6.total) : '—');
        setText('carRepairPeriod', r6 ? r6.label : '—');
    }

    /* =====================================================
     * 點擊：依你 dashboard.php 的 data-action/data-jump
     * ===================================================== */
    function bindClicks() {

        // 1) 卡片整張點擊（article.db-card[data-jump]）
        qsa('article.db-card[data-jump]').forEach(function (card) {
            card.addEventListener('click', function (e) {

                // 如果點到燈號 button，就交給 button handler（避免整張卡跳走）
                var btn = e.target && e.target.closest ? e.target.closest('.dash-light') : null;
                if (btn) return;

                var jump = card.getAttribute('data-jump');
                var section = card.getAttribute('data-section') || '';
                if (!jump || !ROUTES[jump]) return;

                var url = ROUTES[jump] + (section ? ('#' + encodeURIComponent(section)) : '');
                global.location.href = url;
            });
        });

        // 2) 燈號點擊（1-1 四顆）
        qsa('.dash-light').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var action = btn.getAttribute('data-action') || '';
                var asof = Current.asof_date || '';
                // 點到「更多/收合」不要跳頁
                var moreBtn = e.target && e.target.closest ? e.target.closest('.db-pill--more') : null;
                if (moreBtn) return;

                if (action === 'go_issue') {
                    var t = btn.getAttribute('data-type') || '';
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

    /* =====================================================
     * 載入 KPI（API -> apply）
     * ===================================================== */
    function loadKpi() {
        // 你全站 api.js 若存在 apiGet，就用它；否則直接不動（避免亂塞假資料）
        if (typeof global.apiGet !== 'function') return;

        global.apiGet('/api/dashboard/kpi', {}).then(function (j) {
            if (!j || j.success !== true) return;
            applyKpi(j.data || {});
        }).catch(function () { /* 靜默 */ });
    }

    function init() {
        bindClicks();
        bindVehicleMoreButtons();
        loadKpi();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
