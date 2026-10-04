/* Pure UI: focus ownership for existing static dialogs. Does not submit, dismiss,
 * change close policies, or modify API/state. Dynamic Modal owns its own focus. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var dialogs = Array.prototype.slice.call(document.querySelectorAll(
      '.modal-backdrop[id], .ac-modal, .equ-modal, .cs-modal, .es-modal'
    ));
    if (!dialogs.length) return;
    var opener = null, active = [];
    document.addEventListener('click', function (e) {
      opener = e.target.closest('button, a, input, [tabindex]') || document.activeElement;
    }, true);
    function controls(dialog) {
      return Array.prototype.filter.call(dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
      ), function (el) { return el.getClientRects().length > 0; });
    }
    function sync() {
      dialogs.forEach(function (dialog) {
        var open = !dialog.hidden && dialog.getAttribute('aria-hidden') !== 'true' && getComputedStyle(dialog).display !== 'none';
        var index = active.indexOf(dialog);
        if (open && index < 0) {
          dialog._uiOpener = opener || document.activeElement;
          active.push(dialog);
          var nodes = controls(dialog);
          if (!dialog.contains(document.activeElement) && nodes[0]) nodes[0].focus({ preventScroll: true });
        } else if (!open && index >= 0) {
          active.splice(index, 1);
          if (dialog._uiOpener && dialog._uiOpener.isConnected) dialog._uiOpener.focus({ preventScroll: true });
        }
      });
      document.documentElement.classList.toggle('ui-static-dialog-open', active.length > 0);
    }
    var observer = new MutationObserver(sync);
    dialogs.forEach(function (dialog) { observer.observe(dialog, { attributes: true, attributeFilter: ['hidden', 'aria-hidden'] }); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !active.length || (window.Modal && window.Modal._current)) return;
      var dialog = active[active.length - 1], nodes = controls(dialog);
      if (!nodes.length) { e.preventDefault(); return; }
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    });
    sync();
  });
})();
