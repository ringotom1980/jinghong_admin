/**
 * Path: Public/assets/js/nav.js
 * 說明: 導覽互動（側邊導覽：hover → 浮動小面板抽屜）
 * 重點：
 * - 抽屜不再全高
 * - hover 哪個 tab，就把抽屜 top 對齊到該 tab 附近（並做邊界 clamp）
 */

(function () {
    'use strict';
    var closeTimer = null;
    var lastDrawerId = '';

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function getPath() {
        try { return window.location.pathname || ''; } catch (e) { return ''; }
    }

    function openHost(sidenav) {
        if (!sidenav) return;
        sidenav.classList.add('is-open');
        var host = qs('#sidenavDrawerHost');
        if (host) host.setAttribute('aria-hidden', 'false');
    }

    function closeHost(sidenav) {
        if (!sidenav) return;
        sidenav.classList.remove('is-open');
        var host = qs('#sidenavDrawerHost');
        if (host) host.setAttribute('aria-hidden', 'true');
    }

    function showDrawer(drawerId) {
        if (!drawerId) return;
        qsa('.drawerPanel').forEach(function (p) {
            p.classList.toggle('is-active', p.id === drawerId);
        });
    }

    function applyActive() {
        var path = getPath();

        var rules = [
            { key: 'dashboard', match: ['/dashboard'] },

            { key: 'mat_issue', match: ['/mat/issue'] },
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

        qsa('.rail__tab, .nav__item').forEach(function (el) {
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
        if (!best) return;

        qsa('[data-nav="' + best.key + '"]').forEach(function (el) {
            el.classList.add('is-active');
        });

        if (best.key.indexOf('mat_') === 0) qsa('[data-nav="mat"]').forEach(function (el) { el.classList.add('is-active'); });
        if (best.key.indexOf('car_') === 0) qsa('[data-nav="car"]').forEach(function (el) { el.classList.add('is-active'); });
        if (best.key.indexOf('equ_') === 0) qsa('[data-nav="equ"]').forEach(function (el) { el.classList.add('is-active'); });
        if (best.key.indexOf('pole') === 0) qsa('[data-nav="pole"]').forEach(function (el) { el.classList.add('is-active'); });

        var drawerId = '';
        if (best.key.indexOf('mat') === 0) drawerId = 'drawer-mat';
        else if (best.key.indexOf('car') === 0) drawerId = 'drawer-car';
        else if (best.key.indexOf('equ') === 0) drawerId = 'drawer-equ';
        else if (best.key.indexOf('pole') === 0) drawerId = 'drawer-pole';
        else drawerId = 'drawer-dashboard';

        showDrawer(drawerId);
    }

    function positionHostToTab(sidenav, tab) {
        var host = qs('#sidenavDrawerHost');
        if (!sidenav || !tab || !host) return;

        var sidenavRect = sidenav.getBoundingClientRect();
        var tabRect = tab.getBoundingClientRect();

        // 先讓 host 顯示（才能量高度）
        openHost(sidenav);

        // 設定一個初值 top（以 tab 的 top 對齊）
        var desiredTop = (tabRect.top - sidenavRect.top) + 6; // +6 微調
        host.style.top = desiredTop + 'px';

        // 下一個 frame 再做 clamp（量得到 host 高度）
        window.requestAnimationFrame(function () {
            var pad = 10;
            var maxTop = sidenav.clientHeight - host.offsetHeight - pad;
            if (maxTop < pad) maxTop = pad;

            var t = desiredTop;
            if (t < pad) t = pad;
            if (t > maxTop) t = maxTop;

            host.style.top = t + 'px';
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var sidenav = qs('#sidenav');
        var railTabs = qsa('.rail__tab');
        var host = qs('#sidenavDrawerHost');

        if (!sidenav) return;

        // ===== 浮動抽屜：關閉延遲 + 取消關閉（避免移到子選單就關） =====
        var closeTimer = null;
        var lastDrawerId = '';

        function scheduleClose() {
            if (closeTimer) window.clearTimeout(closeTimer);
            closeTimer = window.setTimeout(function () {
                closeHost(sidenav);
            }, 180); // 緩衝：讓滑鼠從 rail 移到抽屜不會觸發關閉
        }

        function cancelClose() {
            if (closeTimer) window.clearTimeout(closeTimer);
            closeTimer = null;
        }

        applyActive();

        // ✅ 抽屜本體：進入取消關閉 / 離開才排程關閉
        if (host) {
            host.addEventListener('mouseenter', cancelClose);
            host.addEventListener('mouseleave', scheduleClose);
        }

        // hover 進入：顯示目前 active 的 drawer（且位置對齊 active tab）
        sidenav.addEventListener('mouseenter', function () {
            cancelClose();

            var activeTab = qs('.rail__tab.is-active');
            var id = activeTab ? (activeTab.getAttribute('data-drawer') || '') : '';

            // 記住最後抽屜，避免回到預設（儀表板）
            if (id) lastDrawerId = id;

            if (id) showDrawer(id);

            if (activeTab) {
                positionHostToTab(sidenav, activeTab);
            } else {
                openHost(sidenav);
            }
        });

        // ✅ 不要立刻關：改成延遲關閉（避免移到子選單就關）
        sidenav.addEventListener('mouseleave', function () {
            scheduleClose();
        });

        // hover tab：切換 drawer + 把浮動面板對齊到該 tab
        railTabs.forEach(function (tab) {
            tab.addEventListener('mouseenter', function () {
                cancelClose();

                var id = tab.getAttribute('data-drawer') || '';
                if (id) {
                    lastDrawerId = id;
                    showDrawer(id);
                }
                positionHostToTab(sidenav, tab);
            });
        });

        // ✅ 安全補丁：如果抽屜被 showDrawer 切換時，host 仍沒打開，這裡確保開啟
        // （避免某些情況只有 showDrawer 沒 openHost）
        sidenav.addEventListener('mousemove', function () {
            if (!sidenav.classList.contains('is-open') && lastDrawerId) {
                openHost(sidenav);
                showDrawer(lastDrawerId);
            }
        });
    });
})();
