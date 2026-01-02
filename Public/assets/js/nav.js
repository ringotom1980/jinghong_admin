/**
 * Path: Public/assets/js/nav.js
 * 說明: 導覽互動（側邊導覽：hover 開啟對應抽屜 + pin 固定 + active 高亮）
 * - 依你的規格：每個選單是獨立抽屜（hover 某個 rail tab → 開啟該 drawerPanel）
 * - pinned：固定展開「最後一次開啟」的 drawer
 * - 不做業務請求；只處理 UI 狀態
 */

(function () {
  'use strict';

  var STORAGE_PIN = 'jh_sidenav_pinned';
  var STORAGE_LAST = 'jh_sidenav_last_drawer';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function getPath() {
    try { return window.location.pathname || ''; } catch (e) { return ''; }
  }

  function setPinned(isPinned) {
    try { localStorage.setItem(STORAGE_PIN, isPinned ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('nav-pinned', !!isPinned);
  }

  function getPinned() {
    try { return localStorage.getItem(STORAGE_PIN) === '1'; } catch (e) { return false; }
  }

  function setLastDrawer(id) {
    if (!id) return;
    try { localStorage.setItem(STORAGE_LAST, id); } catch (e) {}
  }

  function getLastDrawer() {
    try { return localStorage.getItem(STORAGE_LAST) || ''; } catch (e) { return ''; }
  }

  function openHost(sidenav) {
    if (!sidenav) return;
    sidenav.classList.add('is-open');
    var host = qs('#sidenavDrawerHost');
    if (host) host.setAttribute('aria-hidden', 'false');
  }

  function closeHost(sidenav) {
    if (!sidenav) return;
    if (document.body.classList.contains('nav-pinned')) return; // pinned 不關
    sidenav.classList.remove('is-open');
    var host = qs('#sidenavDrawerHost');
    if (host) host.setAttribute('aria-hidden', 'true');
  }

  function showDrawer(drawerId) {
    if (!drawerId) return;
    qsa('.drawerPanel').forEach(function (p) {
      p.classList.toggle('is-active', p.id === drawerId);
    });
    setLastDrawer(drawerId);
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

    // 清除
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

    // 順便決定預設抽屜（未 pinned 時也能 hover 打開；pinned 時可直接顯示）
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
    var pinBtn = qs('#sidenavPin');
    var railTabs = qsa('.rail__tab');

    if (!sidenav) return;

    // 初始 pinned
    var pinned = getPinned();
    setPinned(pinned);

    // 先套 active（會同時決定 drawer）
    applyActive();

    // 若 pinned：直接開 host，並顯示最後 drawer（沒有就用目前 active 推導出來的）
    if (pinned) {
      openHost(sidenav);
      var last = getLastDrawer();
      if (last) showDrawer(last);
    }

    // Hover sidenav 區塊：開/關 host
    sidenav.addEventListener('mouseenter', function () {
      openHost(sidenav);
      // 進入時若有 last drawer，就顯示它（避免空）
      var last = getLastDrawer();
      if (last) showDrawer(last);
    });

    sidenav.addEventListener('mouseleave', function () {
      closeHost(sidenav);
    });

    // Hover 每個 tab：切換對應 drawer（獨立抽屜）
    railTabs.forEach(function (tab) {
      tab.addEventListener('mouseenter', function () {
        var id = tab.getAttribute('data-drawer') || '';
        if (id) {
          openHost(sidenav);
          showDrawer(id);
        }
      });
    });

    // pin 切換
    if (pinBtn) {
      pinBtn.addEventListener('click', function () {
        var next = !document.body.classList.contains('nav-pinned');
        setPinned(next);
        if (next) openHost(sidenav);
        else closeHost(sidenav);
      });
    }
  });
})();
