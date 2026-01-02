/**
 * Path: Public/assets/js/nav.js
 * 說明: 導覽互動（動態側導覽抽屜 hover 展開 + pin 固定 + active 高亮）
 * - 不做業務請求；只處理 UI 狀態
 * - 規則：
 *   1) 預設收合（只剩 rail）
 *   2) 游標移到 sidenav → 展開 drawer
 *   3) pin 後固定展開（body 加 nav-pinned）
 *   4) 依 URL 自動高亮目前頁面
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'jh_sidenav_pinned';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function getPath() {
    try {
      return window.location.pathname || '';
    } catch (e) {
      return '';
    }
  }

  function setPinned(isPinned) {
    try { localStorage.setItem(STORAGE_KEY, isPinned ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('nav-pinned', !!isPinned);
  }

  function getPinned() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return false; }
  }

  function openDrawer(sidenav) {
    if (!sidenav) return;
    sidenav.classList.add('is-open');
    var drawer = qs('#sidenavDrawer');
    if (drawer) drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer(sidenav) {
    if (!sidenav) return;
    // pinned 狀態不自動收合
    if (document.body.classList.contains('nav-pinned')) return;
    sidenav.classList.remove('is-open');
    var drawer = qs('#sidenavDrawer');
    if (drawer) drawer.setAttribute('aria-hidden', 'true');
  }

  function applyActive() {
    var path = getPath();

    // 你的站點前綴固定在 /jinghong_admin
    // 這裡只做「包含判斷」，避免後續改 baseUrl 需要改很多地方
    var rules = [
      { key: 'dashboard', match: ['/dashboard'] },

      { key: 'mat', match: ['/mat/'] },
      { key: 'mat_issue', match: ['/mat/issue'] },
      { key: 'mat_edit', match: ['/mat/edit'] },
      { key: 'mat_materials', match: ['/mat/materials'] },
      { key: 'mat_stats', match: ['/mat/stats'] },

      { key: 'car', match: ['/car/'] },
      { key: 'car_base', match: ['/car/base'] },
      { key: 'car_repairs', match: ['/car/repairs'] },
      { key: 'car_stats', match: ['/car/stats'] },

      { key: 'equ', match: ['/equ/'] },
      { key: 'equ_repairs', match: ['/equ/repairs'] },
      { key: 'equ_stats', match: ['/equ/stats'] },

      { key: 'pole', match: ['/pole-map'] },
      { key: 'pole_map', match: ['/pole-map'] },

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

    // 命中：先找最精準的（較長的 match）
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

    // 沒命中：若在根目錄或 /login，視為 dashboard/login 不高亮側欄
    if (!best) return;

    // 套用 active
    qsa('[data-nav="' + best.key + '"]').forEach(function (el) {
      el.classList.add('is-active');
    });

    // 群組 key（mat/car/equ）也一起亮
    if (best.key.indexOf('mat_') === 0) qsa('[data-nav="mat"]').forEach(function (el) { el.classList.add('is-active'); });
    if (best.key.indexOf('car_') === 0) qsa('[data-nav="car"]').forEach(function (el) { el.classList.add('is-active'); });
    if (best.key.indexOf('equ_') === 0) qsa('[data-nav="equ"]').forEach(function (el) { el.classList.add('is-active'); });
    if (best.key.indexOf('pole') === 0) qsa('[data-nav="pole"]').forEach(function (el) { el.classList.add('is-active'); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sidenav = qs('#sidenav');
    var pinBtn = qs('#sidenavPin');

    if (!sidenav) return;

    // 初始 pinned 狀態
    var pinned = getPinned();
    setPinned(pinned);
    if (pinned) openDrawer(sidenav);

    // hover 行為：展開/收合
    sidenav.addEventListener('mouseenter', function () { openDrawer(sidenav); });
    sidenav.addEventListener('mouseleave', function () { closeDrawer(sidenav); });

    // pin 切換
    if (pinBtn) {
      pinBtn.addEventListener('click', function () {
        var next = !document.body.classList.contains('nav-pinned');
        setPinned(next);
        if (next) openDrawer(sidenav);
        else closeDrawer(sidenav);
      });
    }

    // active 高亮
    applyActive();
  });
})();
