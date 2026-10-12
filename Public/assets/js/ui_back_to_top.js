/* Path: Public/assets/js/ui_back_to_top.js
 * 說明: 共用「回頂端」按鈕
 * 用法：
 * - 預設：全站啟用（頁面高度夠才顯示）
 * - 可選：body 加 data-backtop="off" 可停用
 * - 可選：body 設 data-backtop-target="#someEl" 可回到指定元素頂端
 * - 可選：body 設 data-backtop-after="520" 可調顯示門檻(px)
 */
(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function getScrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function parseIntSafe(v, def) {
    var n = parseInt(String(v || ''), 10);
    return isNaN(n) ? def : n;
  }

  function createBtn() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-top';
    btn.setAttribute('aria-label', '回到頂端');
    btn.innerHTML = '<svg class="ui-top__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg><span class="ui-top__text" aria-hidden="true">回到頂端</span>';
    btn.tabIndex = -1;
    btn.setAttribute('aria-hidden', 'true');
    document.body.appendChild(btn);
    return btn;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var body = document.body;
    if (!body) return;

    // ✅ 全站共用停用開關
    if ((body.getAttribute('data-backtop') || '').toLowerCase() === 'off') return;

    var after = parseIntSafe(body.getAttribute('data-backtop-after'), 520);
    var targetSel = body.getAttribute('data-backtop-target') || '';
    var targetEl = targetSel ? qs(targetSel) : null;

    var btn = createBtn();

    function update() {
      var y = getScrollTop();
      var shown = y > after;
      btn.classList.toggle('is-show', shown);
      btn.tabIndex = shown ? 0 : -1;
      btn.setAttribute('aria-hidden', String(!shown));
    }

    btn.addEventListener('click', function () {
      btn.blur(); // Do not leave keyboard focus on a button that will hide at the top.
      var top = 0;
      if (targetEl) {
        // 回到指定元素的頂部（留 12px 間距）
        var rect = targetEl.getBoundingClientRect();
        top = getScrollTop() + rect.top - 12;
        if (top < 0) top = 0;
      }
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: top, behavior: reduced ? 'instant' : 'smooth' });
    });

    window.addEventListener('scroll', update, { passive: true });
    update();
  });

  // 需要時可手動呼叫（目前先保留，不強制使用）
  global.UiBackToTop = global.UiBackToTop || {};
})(window);
