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
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
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
      if (y > after) btn.classList.add('is-show');
      else btn.classList.remove('is-show');
    }

    btn.addEventListener('click', function () {
      var top = 0;
      if (targetEl) {
        // 回到指定元素的頂部（留 12px 間距）
        var rect = targetEl.getBoundingClientRect();
        top = getScrollTop() + rect.top - 12;
        if (top < 0) top = 0;
      }
      window.scrollTo({ top: top, behavior: 'smooth' });
    });

    window.addEventListener('scroll', update, { passive: true });
    update();
  });

  // 需要時可手動呼叫（目前先保留，不強制使用）
  global.UiBackToTop = global.UiBackToTop || {};
})(window);
