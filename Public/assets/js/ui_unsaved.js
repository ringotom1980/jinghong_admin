/* UI-only, in-memory change tracking. No drafts, API calls or history entries. */
(function (global) {
  'use strict';
  var watches = new Map(), pending = null, listening = false, navigationAllowed = false;
  function rootOf(opts) { return typeof opts.root === 'function' ? opts.root() : opts.root; }
  function snapshot(root) {
    if (!root) return '[]';
    var blankRows = new Set(Array.from(root.querySelectorAll('.crm-itemRow')).filter(function (row) {
      return Array.from(row.querySelectorAll('input[data-f]')).every(function (el) {
        return el.type === 'number' ? Number(el.value || 0) === 0 : !String(el.value || '').trim();
      });
    }));
    return JSON.stringify(Array.from(root.querySelectorAll('input, select, textarea')).filter(function (el) {
      return !blankRows.has(el.closest('.crm-itemRow')) && !el.readOnly && !el.hasAttribute('data-unsaved-ignore') && el.type !== 'search' && (!(el.type === 'checkbox' || el.type === 'radio') || el.checked);
    }).map(function (el) {
      var value = el.value;
      if (el.type === 'checkbox' || el.type === 'radio') value = el.checked;
      else if (el.type === 'file') value = Array.from(el.files || []).map(function (f) { return [f.name, f.size, f.lastModified]; });
      else if (el.type === 'number' && (value !== '' || /_amount$/.test(el.getAttribute('data-f') || '')) && isFinite(Number(value))) value = Number(value);
      else value = el.type === 'password' ? String(value || '') : String(value || '').trim();
      return [el.name || el.id || el.getAttribute('data-code') || el.getAttribute('data-field') || el.getAttribute('data-f') || '', el.type === 'checkbox' || el.type === 'radio' ? el.value : '', value];
    }));
  }
  function dirty() { return Array.from(watches.values()).filter(function (w) { return w.isDirty(); }); }
  function beforeUnload(e) {
    if (navigationAllowed) { navigationAllowed = false; return; }
    if (!dirty().length) return;
    e.preventDefault(); e.returnValue = '';
  }
  function update() {
    var needed = dirty().length > 0;
    if (needed === listening) return;
    listening = needed;
    global[needed ? 'addEventListener' : 'removeEventListener']('beforeunload', beforeUnload);
  }
  function watch(key, opts) {
    var capture = opts.snapshot || function () { return snapshot(rootOf(opts)); };
    var baseline = capture();
    var w = {
      key: key, opts: opts, lastFocus: null,
      capture: capture,
      isDirty: function () { return watches.get(key) === w && (!opts.active || opts.active()) && !!rootOf(opts) && capture() !== baseline; },
      markClean: function (saved) { baseline = saved === undefined ? capture() : saved; update(); },
      dispose: function () { if (watches.get(key) === w) watches.delete(key); update(); }
    };
    watches.set(key, w); update(); return w;
  }
  function request(action, selected) {
    var changed = (selected || Array.from(watches.values())).filter(function (w) { return w && w.isDirty(); });
    if (!changed.length) return Promise.resolve().then(action);
    if (pending) return Promise.resolve(false); // one decision, even on repeated clicks
    var focus = changed.map(function (w) { return w.lastFocus; }).find(function (el) { return el && el.isConnected && el.getClientRects().length; }) || document.activeElement;
    var scroll = Array.from(document.querySelectorAll('main, .modal__body, .equ-modal__body, .carb-right')).map(function (el) { return [el, el.scrollLeft, el.scrollTop]; });
    var x = global.scrollX, y = global.scrollY;
    return new Promise(function (resolve) {
      var bd;
      function continueEditing() {
        pending = null;
        if (focus && focus.isConnected) focus.focus({ preventScroll: true });
        scroll.forEach(function (s) { s[0].scrollLeft = s[1]; s[0].scrollTop = s[2]; });
        global.scrollTo(x, y); resolve(false);
      }
      pending = true;
      bd = global.Modal.open({
        title: '尚未儲存的變更',
        html: '<p style="margin:0;line-height:1.7">' + (changed.some(function (w) { return w.opts.busy && w.opts.busy(); })
          ? '儲存請求仍在處理中，離開不會取消已送出的請求。未送出的變更將不會保留。'
          : '目前的變更尚未儲存，離開後將不會保留。') + '</p>',
        panelClass: 'modal-panel--unsaved', stack: true, trackChanges: false,
        confirmText: '放棄變更', cancelText: '繼續編輯', allowCloseBtn: true, closeOnEsc: true, closeOnBackdrop: true,
        onCancel: function () { setTimeout(continueEditing, 0); },
        onConfirm: function () {
          pending = null; global.Modal.close(bd);
          Promise.resolve().then(action).then(resolve, function (e) {
            resolve(false);
            if (global.Toast) global.Toast.show({ type: 'danger', title: '操作失敗', message: e.message || '請再試一次' });
          });
          return false;
        }
      });
      bd.classList.add('modal-backdrop--unsaved');
      var z = 2000;
      document.querySelectorAll('.modal-backdrop, .ac-modal, .equ-modal').forEach(function (el) {
        if (el !== bd && el.getClientRects().length) z = Math.max(z, parseInt(getComputedStyle(el).zIndex, 10) || 0);
      });
      bd.style.zIndex = String(z + 10);
      bd.querySelector('.modal__cancel').className = 'btn btn--primary modal__cancel';
      bd.querySelector('.modal__confirm').className = 'btn btn--ghost modal__confirm';
      function focusSafeChoice() {
        if (global.Modal._current === bd && !bd.contains(document.activeElement)) bd.querySelector('.modal__cancel').focus({ preventScroll: true });
      }
      bd.addEventListener('transitionend', focusSafeChoice);
      setTimeout(focusSafeChoice, 240); // also covers reduced motion / no transition event
    });
  }
  document.addEventListener('focusin', function (e) {
    if (!e.target.matches('input, select, textarea')) return;
    watches.forEach(function (w) { var root = rootOf(w.opts); if (root && root.contains(e.target)) w.lastFocus = e.target; });
  });
  document.addEventListener('input', update);
  document.addEventListener('change', update);
  document.addEventListener('click', function () { queueMicrotask(update); }); // row add/delete can change a draft without an input event
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    var url = new URL(a.href, global.location.href);
    if (url.origin !== global.location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    if (!dirty().length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    request(function () { navigationAllowed = true; global.location.assign(url.href); });
  }, true);
  global.UnsavedChanges = { watch: watch, snapshot: snapshot, request: request, update: update, isDirty: function () { return dirty().length > 0; } };
})(window);
