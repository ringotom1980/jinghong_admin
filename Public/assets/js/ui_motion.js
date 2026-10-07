/*
 * Path: Public/assets/js/ui_motion.js
 * 說明: 全站動畫控制（只負責加/移 class 與必要 DOM；外觀/動畫在 motion.css）
 */

(function (global) {
  'use strict';

  function isEl(el) { return !!(el && el.nodeType === 1); }
  function qs(sel, root) { return (root || document).querySelector(sel); }

  function ensureWrap(el) {
    var wrap = qs('.ui-motion__wrap', el);
    if (wrap) return wrap;

    wrap = document.createElement('span');
    wrap.className = 'ui-motion__wrap';

    while (el.firstChild) wrap.appendChild(el.firstChild);
    el.appendChild(wrap);
    return wrap;
  }

  function setDisabled(el, disabled) {
    if (!isEl(el)) return;
    if (!('disabled' in el)) return;

    if (disabled) {
      if (el._motionPrevDisabled === undefined) el._motionPrevDisabled = el.disabled;
      el.disabled = true;
    } else {
      if (el._motionPrevDisabled !== undefined) {
        el.disabled = el._motionPrevDisabled;
        delete el._motionPrevDisabled;
      }
    }
  }

  /* =====================================================
   * 讀取資料時轉圈圈動畫（Loading Spinner）
   * - 用法：
   *     UI.motion.loading.on(el)        // 開始轉
   *     UI.motion.loading.off(el)       // 停止轉
   * - el 可是：button / div / modal body / card
   * ===================================================== */
  var Loading = {
    on: function (el, opts) {
      if (!isEl(el)) return;
      if (el.classList.contains('is-loading')) return;

      opts = opts || {};
      var pos = (opts.position === 'end') ? 'end' : 'start';

      el.classList.add('is-loading');
      setDisabled(el, true);

      var wrap = ensureWrap(el);

      // 避免重複插入 spinner
      if (qs('.ui-motion__spinner', el)) return;

      var sp = document.createElement('span');
      sp.className = 'motion-spin ui-motion__spinner';
      sp.setAttribute('aria-hidden', 'true');

      if (pos === 'end') wrap.appendChild(sp);
      else wrap.insertBefore(sp, wrap.firstChild);
    },

    off: function (el) {
      if (!isEl(el)) return;
      if (!el.classList.contains('is-loading')) return;

      el.classList.remove('is-loading');
      setDisabled(el, false);

      var sp = qs('.ui-motion__spinner', el);
      if (sp) sp.remove();
    }
  };

  /* =====================================================
   * 後續新增的動畫 1（預留）
   * - 範例：錯誤輕抖（shake）、注意提示（pulse）
   * - 規則：只加/移 class，不直接寫樣式
   * ===================================================== */
  // var State = { ... };

  /* =====================================================
   * 後續新增的動畫 2（預留）
   * - 範例：進場 enter、離場 leave
   * ===================================================== */
  // var Enter = { ... };

  /* 對外統一入口 */
  global.UI = global.UI || {};
  global.UI.motion = global.UI.motion || {};
  global.UI.motion.loading = Loading;

})(window);
