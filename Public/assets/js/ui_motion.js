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

  var uploadControllers = new WeakMap();
  function attachUpload(button, options) {
    if (uploadControllers.has(button)) return uploadControllers.get(button);
    options = options || {};
    var parent = document.createElement('span');
    parent.className = 'upload-motion';
    parent.style.minWidth = 'min(100%, ' + Math.max(144, button.getBoundingClientRect().width + 28) + 'px)';
    button.parentNode.insertBefore(parent, button);
    parent.appendChild(button);
    var original = document.createElement('span');
    original.className = 'upload-motion__label';
    while (button.firstChild) original.appendChild(button.firstChild);
    var idleIcon = document.createElement('span');
    idleIcon.className = 'upload-motion__idle-icon';
    idleIcon.setAttribute('aria-hidden', 'true');
    idleIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 19V5m-6 6 6-6 6 6M6 20h12"/></svg>';
    original.insertBefore(idleIcon, original.firstChild);
    button.appendChild(original);
    var visual = document.createElement('span');
    visual.className = 'upload-motion__visual';
    visual.setAttribute('aria-hidden', 'true');
    visual.innerHTML = '<svg viewBox="0 0 52 52"><circle class="upload-motion__track" cx="26" cy="26" r="22"/><circle class="upload-motion__arc" cx="26" cy="26" r="22" pathLength="100"/><path class="upload-motion__arrow" d="M26 35V17m-7 7 7-7 7 7M18 36h16"/><path class="upload-motion__check" d="m17 27 6 6 13-14"/><path class="upload-motion__notice" d="M26 16v13m0 5v2"/><path class="upload-motion__cross" d="m19 19 14 14m0-14L19 33"/></svg>';
    button.appendChild(visual);
    button.classList.add('upload-motion__button');
    var status = document.createElement('span');
    status.className = 'upload-motion__status';
    var announcement = document.createElement('span');
    announcement.className = 'upload-motion__announcement';
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    parent.appendChild(announcement);
    parent.appendChild(status);
    var progress = document.createElement('span');
    progress.className = 'upload-motion__progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', '檔案傳送進度');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', '100');
    progress.hidden = true;
    parent.appendChild(progress);
    var current = null, timer = null, busy = false, locks = [], destroyed = false;
    var oldLabel = button.getAttribute('aria-label');
    function unlock() { locks.forEach(function (entry) { entry.el.disabled = entry.disabled; }); locks = []; }
    function idle() {
      parent.dataset.state = 'idle';
      status.textContent = '';
      announcement.textContent = '';
      button.removeAttribute('aria-busy');
      if (oldLabel === null) button.removeAttribute('aria-label'); else button.setAttribute('aria-label', oldLabel);
      progress.hidden = true;
    }
    function visible() { return button.isConnected && !button.closest('[hidden], [aria-hidden="true"]') && parent.getClientRects().length > 0; }
    function invalidate() { clearTimeout(timer); current = null; busy = false; unlock(); idle(); }
    var observer = new MutationObserver(function () {
      if (current && !visible()) invalidate();
    });
    for (var ancestor = parent.parentElement; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'style', 'class'], childList: true });
    }
    var controller = {
      invalidate: invalidate,
      isBusy: function () { return busy; },
      dispose: function () {
        invalidate(); destroyed = true; observer.disconnect();
        button.classList.remove('upload-motion__button');
        idleIcon.remove();
        while (original.firstChild) button.insertBefore(original.firstChild, original);
        original.remove(); visual.remove();
        if (parent.parentNode) { parent.parentNode.insertBefore(button, parent); parent.remove(); }
        uploadControllers.delete(button);
      },
      begin: function () {
        if (busy || destroyed || button.disabled || !visible()) return null;
        clearTimeout(timer); busy = true;
        locks = [button].concat(options.lock || []).filter(Boolean).map(function (el) { return { el: el, disabled: el.disabled }; });
        locks.forEach(function (entry) { entry.el.disabled = true; });
        button.setAttribute('aria-busy', 'true');
        button.setAttribute('aria-label', '傳送中');
        parent.dataset.state = 'sending';
        parent.dataset.indeterminate = 'true';
        parent.style.setProperty('--upload-progress', '0');
        status.textContent = '傳送中';
        announcement.textContent = '傳送中';
        progress.hidden = false;
        progress.removeAttribute('aria-valuenow');
        progress.setAttribute('aria-valuetext', '傳送中，進度未知');
        var lastAnnouncedStep = -1;
        var run = {
          isCurrent: function () {
            if (current !== run || destroyed) return false;
            if (!visible()) { invalidate(); return false; }
            return true;
          },
          progress: function (event) {
            if (!run.isCurrent() || !busy || parent.dataset.state === 'processing') return;
            if (!event.lengthComputable || event.total <= 0) {
              parent.dataset.indeterminate = 'true';
              progress.removeAttribute('aria-valuenow');
              progress.setAttribute('aria-valuetext', '傳送中，進度未知');
              status.textContent = '傳送中';
              if (announcement.textContent !== '傳送中，進度未知') announcement.textContent = '傳送中，進度未知';
              return;
            }
            delete parent.dataset.indeterminate;
            var percent = Math.max(0, Math.min(100, Math.floor(event.loaded / event.total * 100)));
            parent.style.setProperty('--upload-progress', String(percent));
            progress.setAttribute('aria-valuenow', String(percent));
            progress.setAttribute('aria-valuetext', '已傳送 ' + percent + '%');
            status.textContent = percent + '% · 傳送中';
            if (Math.floor(percent / 10) !== lastAnnouncedStep) {
              lastAnnouncedStep = Math.floor(percent / 10);
              announcement.textContent = '已傳送 ' + percent + '%';
            }
            if (percent === 100) run.processing();
          },
          processing: function () {
            if (!run.isCurrent() || !busy) return;
            parent.dataset.state = 'processing';
            status.textContent = '處理中';
            announcement.textContent = '檔案已傳送，伺服器處理中';
            button.setAttribute('aria-label', '處理中');
            progress.removeAttribute('aria-valuenow');
            progress.setAttribute('aria-valuetext', '檔案已傳送，伺服器處理中');
          },
          finish: function (kind, message) {
            if (!run.isCurrent()) return;
            busy = false; unlock();
            parent.dataset.state = kind;
            button.removeAttribute('aria-busy');
            status.textContent = message;
            announcement.textContent = message;
            button.setAttribute('aria-label', message + '；' + original.textContent.trim());
            progress.hidden = true;
            // This delay only keeps a real result visible; it never invents progress.
            timer = setTimeout(function () { if (run.isCurrent()) idle(); }, 1600);
          }
        };
        current = run;
        return run;
      }
    };
    idle(); uploadControllers.set(button, controller); return controller;
  }

  /* 對外統一入口 */
  global.UI = global.UI || {};
  global.UI.motion = global.UI.motion || {};
  global.UI.motion.loading = Loading;
  global.UI.motion.upload = { attach: attachUpload };

})(window);
