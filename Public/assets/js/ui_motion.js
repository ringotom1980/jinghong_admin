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

// The shared core owns feedback, while retained deferred feedback assets may
// already own its maps/listeners. Preserve one initializer before page handlers.
// Both retained legacy footers and current templates already load this asset.
/* Shared feedback for native navigation, real requests, saves and dialogs.
 * Timers are decorative only. Business state never waits for an animation event. */
(function (global) {
  'use strict';
  // Touch browsers can delay native :active until release. Show feedback on
  // pointerdown without changing click behavior, focus, capture or layout.
  var pressed = new Map();
  function releasePress(id) {
    var button = pressed.get(id);
    if (button) button.classList.remove('ui-button-pressed');
    pressed.delete(id);
  }
  function clearPresses() { pressed.forEach(function (_, id) { releasePress(id); }); }
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    var button = e.target.closest && e.target.closest('.btn');
    if (!button || button.disabled || button.matches('.is-loading, .ui-action--pending, .upload-motion__button, .ui-top') || button.closest('.login-page')) return;
    releasePress(e.pointerId);
    pressed.set(e.pointerId, button); button.classList.add('ui-button-pressed');
  }, { passive: true });
  document.addEventListener('pointermove', function (e) {
    var button = pressed.get(e.pointerId); if (!button) return;
    var rect = button.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) releasePress(e.pointerId);
  }, { passive: true });
  global.addEventListener('pointerup', function (e) { releasePress(e.pointerId); }, { passive: true });
  global.addEventListener('pointercancel', function (e) { releasePress(e.pointerId); }, { passive: true });
  global.addEventListener('blur', clearPresses);
  global.addEventListener('pageshow', clearPresses);
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearPresses(); });


  function initializeFeedback() {
    var existing = global.UI.motion;
    if (existing.navigation && typeof existing.navigation.start === 'function' && typeof existing.navigation.reset === 'function' &&
        existing.region && typeof existing.region.begin === 'function' &&
        existing.action && typeof existing.action.begin === 'function' &&
        existing.updated && typeof existing.updated.arm === 'function' && typeof existing.updated.apply === 'function' &&
        existing.dialog && typeof existing.dialog.enter === 'function' && typeof existing.dialog.exit === 'function') return;
  var motion = global.UI.motion, requests = new WeakMap(), actions = new WeakMap();
  var reduced = global.matchMedia('(prefers-reduced-motion: reduce)');
  function elements(targets) { return (Array.isArray(targets) ? targets : [targets]).filter(Boolean); }
  function announce(text) {
    var el = document.getElementById('uiFeedbackStatus');
    if (!el) { el = document.createElement('span'); el.id = 'uiFeedbackStatus'; el.className = 'ui-feedback-sr'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = text;
  }
  var navTimer, navReset, bar;
  motion.navigation = {
    start: function () {
      this.reset();
      navTimer = setTimeout(function () {
        if (!bar) { bar = document.createElement('div'); bar.className = 'ui-navigation'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar); }
        bar.hidden = false;
      }, 150);
      navReset = setTimeout(this.reset.bind(this), 12000);
    },
    reset: function () { clearTimeout(navTimer); clearTimeout(navReset); if (bar) bar.hidden = true; }
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    var url = new URL(a.href, location.href);
    if (url.origin === location.origin && (url.pathname !== location.pathname || url.search !== location.search)) motion.navigation.start();
  });
  global.addEventListener('pageshow', function () { motion.navigation.reset(); });


  motion.region = {
    begin: function (owner, key, targets, options) {
      options = options || {};
      var slots = requests.get(owner); if (!slots) { slots = {}; requests.set(owner, slots); }
      if (slots[key]) slots[key].cancel();
      var nodes = elements(targets), notices = [], timer;
      var task = {
        current: function () { return slots[key] === task; },
        cancel: function () {
          clearTimeout(timer);
          nodes.forEach(function (el) { el.removeAttribute('aria-busy'); el.classList.remove('ui-region-loading'); });
          notices.forEach(function (el) { el.remove(); }); notices = [];
        },
        done: function (ok) {
          if (!task.current()) return;
          task.cancel();
          nodes.forEach(function (el) {
            if (ok !== false && !reduced.matches) {
              el.classList.remove('ui-region-enter'); void el.offsetWidth; el.classList.add('ui-region-enter');
              setTimeout(function () { el.classList.remove('ui-region-enter'); }, 220);
            }
          });
        }
      };
      slots[key] = task;
      nodes.forEach(function (el) { el.setAttribute('aria-busy', 'true'); });
      timer = setTimeout(function () {
        if (!task.current()) return;
        nodes.forEach(function (el) {
          el.classList.add('ui-region-loading');
          if (options.notice === false) return;
          var host = el.tagName === 'TBODY' ? el.closest('table').parentNode : el.parentNode;
          var note = document.createElement('span'); note.className = 'ui-region-status'; note.setAttribute('role', 'status'); note.textContent = '載入中…'; host.appendChild(note); notices.push(note);
        });
      }, 150);
      return task;
    }
  };

  motion.action = {
    begin: function (button, options) {
      options = options || {};
      if (!button) return null;
      var previous = actions.get(button); if (previous && previous.pending) return null;
      if (previous) previous.clear();
      var disabled = button.disabled, timer, task;
      var originalAriaLabel = button.getAttribute('aria-label');
      var label = originalAriaLabel || button.textContent.trim();
      button.setAttribute('aria-label', label + '（儲存中）');
      button.setAttribute('aria-busy', 'true'); button.disabled = true;
      button.classList.add('ui-action--pending'); announce('儲存中…');
      task = {
        pending: true,
        clear: function () {
          clearTimeout(timer); button.classList.remove('ui-action--pending', 'ui-action--success', 'ui-action--error');
          if (originalAriaLabel === null) button.removeAttribute('aria-label'); else button.setAttribute('aria-label', originalAriaLabel);
        },
        finish: function (result) {
          if (actions.get(button) !== task || !task.pending) return;
          task.pending = false; task.clear(); button.disabled = disabled; button.removeAttribute('aria-busy');
          if (result === 'cancel' || (options.current && !options.current()) || !button.isConnected || button.closest('[hidden], [aria-hidden="true"]')) return;
          button.setAttribute('aria-label', label);
          var success = result === true;
          button.classList.add(success ? 'ui-action--success' : 'ui-action--error'); announce(success ? '已儲存' : '儲存失敗，可以重試');
          timer = setTimeout(task.clear, 1000);
        }
      };
      actions.set(button, task); return task;
    }
  };

  var highlights = new WeakMap();
  motion.updated = {
    arm: function (owner, selectors) { highlights.set(owner, { selectors: elements(selectors), expires: Date.now() + 15000 }); },
    apply: function (owner, root) {
      var mark = highlights.get(owner); if (!mark) return;
      highlights.delete(owner); if (Date.now() > mark.expires || !root) return;
      mark.selectors.forEach(function (selector) {
        root.querySelectorAll(selector).forEach(function (row) { row.classList.add('ui-row-updated'); setTimeout(function () { row.classList.remove('ui-row-updated'); }, 900); });
      });
    }
  };

  var exits = new WeakMap();
  function panelOf(el) { return el.querySelector('.modal-panel, .ac-modal__panel, .equ-modal__panel, .cs-modal__panel, .es-modal__panel'); }
  motion.dialog = {
    enter: function (el) {
      var previous = exits.get(el); if (previous) { clearTimeout(previous.timer); previous.clone.remove(); exits.delete(el); }
      var panel = panelOf(el); if (!panel || reduced.matches) return;
      panel.classList.remove('ui-dialog-enter'); void panel.offsetWidth; panel.classList.add('ui-dialog-enter');
      setTimeout(function () { panel.classList.remove('ui-dialog-enter'); }, 220);
    },
    exit: function (el, display) {
      if (reduced.matches) return;
      var clone = el.cloneNode(true); clone.removeAttribute('id'); clone.removeAttribute('hidden');
      clone.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
      clone.inert = true; clone.setAttribute('aria-hidden', 'true'); clone.setAttribute('data-ui-dialog-exit', '');
      clone.style.display = display || getComputedStyle(el).display; (el.parentNode || document.body).appendChild(clone);
      var timer = setTimeout(function () { clone.remove(); if (exits.get(el) && exits.get(el).clone === clone) exits.delete(el); }, 160);
      exits.set(el, { clone: clone, timer: timer });
    }
  };
  function attachDialogs() {
    document.querySelectorAll('.modal-backdrop[id], .ac-modal, .equ-modal, .cs-modal, .es-modal').forEach(function (el) {
      var opened = false, display = 'flex';
      function sync() {
        var style = getComputedStyle(el), open = !el.hidden && el.getAttribute('aria-hidden') !== 'true' && style.display !== 'none';
        if (open && !opened) { display = style.display; motion.dialog.enter(el); }
        else if (!open && opened) motion.dialog.exit(el, display);
        opened = open;
      }
      new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: ['hidden', 'aria-hidden'] }); sync();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachDialogs, { once: true });
  else attachDialogs();
  }

  var retainedFeedback = Array.prototype.some.call(document.scripts, function (script) {
    return script.defer && !script.async && /(?:^|\/)ui_feedback\.js(?:[?#]|$)/.test(script.src);
  });
  if (retainedFeedback && document.readyState !== 'complete') {
    // Deferred old code has finished (or failed) before this event. Capture
    // runs before the normal page initialization listeners, even if registered earlier.
    document.addEventListener('DOMContentLoaded', initializeFeedback, { capture: true, once: true });
  } else initializeFeedback();
})(window);
