/**
 * Path: Public/assets/js/nav.js
 * 說明: 導覽互動（側邊導覽：hover → 浮動小面板抽屜）
 * 修正重點：
 * - 抽屜維持「浮動小面板」，不再全高
 * - rail/host 都算 hover 區，移到子選單不會被當成離開
 * - 不會回切 dashboard：以 lastDrawerId 為準
 * - 抽屜定位對齊 tab（中心對齊），並做上下 clamp
 */

(function () {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function getPath() {
        try { return window.location.pathname || ''; } catch (e) { return ''; }
    }

    function isInside(el, root) {
        if (!el || !root) return false;
        return root === el || root.contains(el);
    }

    function openHost(sidenav) {
        if (!sidenav) return;
        sidenav.classList.add('is-open');
        var host = qs('#sidenavDrawerHost', sidenav);
        if (host) host.setAttribute('aria-hidden', 'false');
    }

    function closeHost(sidenav) {
        if (!sidenav) return;
        sidenav.classList.remove('is-open');
        var host = qs('#sidenavDrawerHost', sidenav);
        if (host) host.setAttribute('aria-hidden', 'true');
    }

    function showDrawer(drawerId, sidenav) {
        if (!drawerId) return;
        qsa('.drawerPanel', sidenav || document).forEach(function (p) {
            p.classList.toggle('is-active', p.id === drawerId);
        });
    }

    function applyActive(sidenav) {
        var path = getPath();

        var rules = [
            { key: 'dashboard', match: ['/dashboard'] },

            { key: 'mat_issue', match: ['/mat/issue'] },
            { key: 'mat_personnel', match: ['/mat/personnel'] },
            { key: 'mat_edit_B', match: ['/mat/edit_B'] },
            { key: 'mat_edit', match: ['/mat/edit'] },
            { key: 'mat_materials', match: ['/mat/materials'] },
            { key: 'mat_stats', match: ['/mat/stats'] },
            { key: 'mat', match: ['/mat/'] },

            { key: 'car_base', match: ['/car/base'] },
            { key: 'car_repairs', match: ['/car/repairs'] },
            { key: 'car_stats', match: ['/car/stats'] },
            { key: 'car', match: ['/car/'] },

            { key: 'equ_repairs', match: ['/equ/repairs'] },
            { key: 'equ_stats', match: ['/equ/stats'] },
            { key: 'equ', match: ['/equ/'] },

            { key: 'pole_map', match: ['/pole-map'] },
            { key: 'pole', match: ['/pole-map'] },

            { key: 'me_password', match: ['/me/password'] }
        ];

        function hit(rule) {
            for (var i = 0; i < rule.match.length; i++) {
                if (path.indexOf(rule.match[i]) !== -1) return true;
            }
            return false;
        }

        qsa('.rail__tab, .nav__item', sidenav).forEach(function (el) {
            el.classList.remove('is-active');
        });

        var best = null;
        for (var r = 0; r < rules.length; r++) {
            if (hit(rules[r])) {
                if (!best) best = rules[r];
                else {
                    var a = (best.match[0] || '').length;
                    var b = (rules[r].match[0] || '').length;
                    if (b > a) best = rules[r];
                }
            }
        }
        if (!best) return null;

        qsa('[data-nav="' + best.key + '"]', sidenav).forEach(function (el) {
            el.classList.add('is-active');
        });

        // 群組亮
        if (best.key.indexOf('mat_') === 0) qsa('[data-nav="mat"]', sidenav).forEach(function (el) { el.classList.add('is-active'); });
        if (best.key.indexOf('car_') === 0) qsa('[data-nav="car"]', sidenav).forEach(function (el) { el.classList.add('is-active'); });
        if (best.key.indexOf('equ_') === 0) qsa('[data-nav="equ"]', sidenav).forEach(function (el) { el.classList.add('is-active'); });
        if (best.key.indexOf('pole') === 0) qsa('[data-nav="pole"]', sidenav).forEach(function (el) { el.classList.add('is-active'); });

        // 對應 drawer
        var drawerId = '';
        if (best.key.indexOf('mat') === 0) drawerId = 'drawer-mat';
        else if (best.key.indexOf('car') === 0) drawerId = 'drawer-car';
        else if (best.key.indexOf('equ') === 0) drawerId = 'drawer-equ';
        else drawerId = 'drawer-dashboard'; // ✅ pole-map 也走 dashboard，避免不存在的 drawer-pole

        showDrawer(drawerId, sidenav);
        return drawerId;
    }

    function positionHostToTab(sidenav, tab, host) {
        if (!sidenav || !tab || !host) return;

        // 先開（確保可量）
        openHost(sidenav);

        var rail = qs('.sidenav__rail', sidenav);
        var railRect = rail ? rail.getBoundingClientRect() : sidenav.getBoundingClientRect();
        var tabRect = tab.getBoundingClientRect();

        // 目標：host 上緣對齊 tab「中心」- host 高度的一半（更自然）
        // clamp：保持 host 在 rail 高度範圍內（留 pad）
        var pad = 10;

        // 先給一個暫時 top，讓 offsetHeight 有值（避免第一次 0）
        host.style.top = pad + 'px';

        window.requestAnimationFrame(function () {
            var hostH = host.offsetHeight || 1;
            var desiredTop = (tabRect.top - railRect.top) + (tabRect.height / 2) - (hostH / 2);

            var minTop = pad;
            var maxTop = railRect.height - hostH - pad;
            if (maxTop < minTop) maxTop = minTop;

            var t = desiredTop;
            if (t < minTop) t = minTop;
            if (t > maxTop) t = maxTop;

            host.style.top = Math.round(t) + 'px';
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var sidenav = qs('#sidenav');
        if (!sidenav) return;

        var rail = qs('.sidenav__rail', sidenav);
        var host = qs('#sidenavDrawerHost', sidenav);
        var railTabs = qsa('.rail__tab', sidenav);

        // ===== state（唯一）=====
        var closeTimer = null;
        var lastDrawerId = '';

        function clearCloseTimer() {
            if (closeTimer) window.clearTimeout(closeTimer);
            closeTimer = null;
        }

        function scheduleClose() {
            clearCloseTimer();
            closeTimer = window.setTimeout(function () {
                closeHost(sidenav);
            }, 180);
        }

        function openWithDrawer(drawerId, tabEl) {
            if (drawerId) {
                lastDrawerId = drawerId;
                showDrawer(drawerId, sidenav);
            } else if (lastDrawerId) {
                showDrawer(lastDrawerId, sidenav);
            }

            openHost(sidenav);

            if (tabEl) positionHostToTab(sidenav, tabEl, host);
        }

        // 初始化 active 與預設 drawer
        lastDrawerId = applyActive(sidenav) || '';

        // 若頁面無 match（例如 /），仍給 dashboard 當預設
        if (!lastDrawerId) lastDrawerId = 'drawer-dashboard';

        // ===== hover 範圍：rail + host 都算 =====
        if (rail) {
            rail.addEventListener('pointerenter', function () {
                clearCloseTimer();
            });

            rail.addEventListener('pointerleave', function (e) {
                var to = e.relatedTarget;
                if (isInside(to, host)) return; // 移到抽屜不關
                scheduleClose();
            });
        }

        if (host) {
            host.addEventListener('pointerenter', function () {
                clearCloseTimer();
                openHost(sidenav);
                if (lastDrawerId) showDrawer(lastDrawerId, sidenav);
            });

            host.addEventListener('pointerleave', function (e) {
                var to = e.relatedTarget;
                if (isInside(to, rail)) return; // 移回 rail 不關
                scheduleClose();
            });
        }

        // hover tab：切換 drawer + 定位
        railTabs.forEach(function (tab) {
            tab.addEventListener('pointerenter', function () {
                clearCloseTimer();

                // ✅ no-drawer：例如「電桿地圖」只要點擊直達，不要浮出抽屜
                if (tab.getAttribute('data-no-drawer') === '1') {
                    closeHost(sidenav);
                    return;
                }

                var id = tab.getAttribute('data-drawer') || '';
                if (!id) {
                    closeHost(sidenav);
                    return;
                }

                openWithDrawer(id, tab);
            });
        });

        // 保底：真的離開 rail+host 才關
        sidenav.addEventListener('pointerleave', function (e) {
            var to = e.relatedTarget;
            if (isInside(to, rail) || isInside(to, host)) return;
            scheduleClose();
        });

        sidenav.addEventListener('pointerenter', function () {
            clearCloseTimer();
        });
    });
})();
