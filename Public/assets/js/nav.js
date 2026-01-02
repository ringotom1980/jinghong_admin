/**
 * Path: Public/assets/js/nav.js
 * 說明: 導覽互動（側邊導覽：hover 開啟對應抽屜 + active 高亮｜定版）
 * 定版重點：
 * - ✅ 無 pin：不使用 localStorage、不切 body class、不保留 pin DOM
 * - hover rail tab → 開啟 host 並顯示對應 drawerPanel
 * - 滑鼠離開 sidenav → 關閉抽屜
 * - 不做業務請求；只處理 UI 狀態
 */

(function () {
  'use strict';

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

    // 清除 active
    qsa('.rail__tab, .nav__item').forEach(function (el) {
      el.classList.remove('is-active');
    });

    // 命中最精準
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

    // 群組亮
    if (best.key.indexOf('mat_') === 0) qsa('[data-nav="mat"]').forEach(function (el) { el.classList.add('is-active'); });
    if (best.key.indexOf('car_') === 0) qsa('[data-nav="car"]').forEach(function (el) { el.classList.add('is-active'); });
    if (best.key.indexOf('equ_') === 0) qsa('[data-nav="equ"]').forEach(function (el) { el.classList.add('is-active'); });
    if (best.key.indexOf('pole') === 0) qsa('[data-nav="pole"]').forEach(function (el) { el.classList.add('is-active'); });

    // 預設抽屜面板（避免 hover 開啟時是空的）
    var drawerId = '';
    if (best.key.indexOf('mat') === 0) drawerId = 'drawer-mat';
    else if (best.key.indexOf('car') === 0) drawerId = 'drawer-car';
    else if (best.key.indexOf('equ') === 0) drawerId = 'drawer-equ';
    else if (best.key.indexOf('pole') === 0) drawerId = 'drawer-pole';
    else drawerId = 'drawer-dashboard';

    showDrawer(drawerId);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sidenav = qs('#sidenav');
    var railTabs = qsa('.rail__tab');

    if (!sidenav) return;

    // 先套 active（同時決定預設 drawer）
    applyActive();

    sidenav.addEventListener('mouseenter', function () {
      openHost(sidenav);

      var activeTab = qs('.rail__tab.is-active');
      var id = activeTab ? (activeTab.getAttribute('data-drawer') || '') : '';
      if (id) showDrawer(id);
    });

    sidenav.addEventListener('mouseleave', function () {
      closeHost(sidenav);
    });

    railTabs.forEach(function (tab) {
      tab.addEventListener('mouseenter', function () {
        var id = tab.getAttribute('data-drawer') || '';
        if (id) {
          openHost(sidenav);
          showDrawer(id);
        }
      });
    });
  });
})();
