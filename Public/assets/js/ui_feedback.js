/* Shared feedback for native navigation, real requests, saves and dialogs.
 * Timers are decorative only. Business state never waits for an animation event. */
(function (global) {
  'use strict';
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
  document.addEventListener('DOMContentLoaded', function () {
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
  });
})(window);
