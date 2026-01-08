/* Path: Public/assets/js/ui_modal.js
 * 說明: Modal 行為（open/close/confirm）
 * 定版：confirm modal 必須點「確認」才可關閉（不點背景、不 auto close、不 ESC）
 * ✅ 修正：onConfirm() 若回傳 false → 不關閉（用於「必填才可關閉」的情境）
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  var Modal = {
    _current: null,

    open: function (opts) {
      opts = opts || {};
      var title = opts.title || '';
      var html = opts.html || '';
      var confirmText = opts.confirmText || '確認';
      var onConfirm = (typeof opts.onConfirm === 'function') ? opts.onConfirm : null;

      // close policy (default: confirm-only)
      var closeOnBackdrop = !!opts.closeOnBackdrop; // default false
      var closeOnEsc = !!opts.closeOnEsc; // default false

      this.close(); // one at a time

      var bd = document.createElement('div');
      bd.className = 'modal-backdrop';
      bd.setAttribute('role', 'dialog');
      bd.setAttribute('aria-modal', 'true');

      var panel = document.createElement('div');
      panel.className = 'modal-panel';

      panel.innerHTML = ''
        + '<div class="modal__head">'
        + '  <h3 class="modal__title">' + escapeHtml(title) + '</h3>'
        + '  <button class="modal__close" type="button" aria-label="關閉">✕</button>'
        + '</div>'
        + '<div class="modal__body">' + html + '</div>'
        + '<div class="modal__foot">'
        + '  <button class="btn btn--primary modal__confirm" type="button">' + escapeHtml(confirmText) + '</button>'
        + '</div>';

      bd.appendChild(panel);
      document.body.appendChild(bd);

      // motion.css uses .modal-backdrop.is-open
      requestAnimationFrame(function () {
        bd.classList.add('is-open');
      });

      var confirmBtn = panel.querySelector('.modal__confirm');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
          var shouldClose = true;
          if (onConfirm) {
            try {
              // ✅ 若 onConfirm 明確回傳 false → 不關閉
              var r = onConfirm();
              if (r === false) shouldClose = false;
            } catch (e) {}
          }
          if (shouldClose) Modal.close();
        });
      }

      var closeBtn = panel.querySelector('.modal__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          // confirm-only：預設不允許用 X 關閉；但若你未來要放行，可在 opts.allowCloseBtn 開
          if (opts.allowCloseBtn) Modal.close();
        });
      }

      if (closeOnBackdrop) {
        bd.addEventListener('click', function (e) {
          if (e.target === bd) Modal.close();
        });
      }

      if (closeOnEsc) {
        bd._escHandler = function (e) {
          if (e.key === 'Escape') Modal.close();
        };
        document.addEventListener('keydown', bd._escHandler);
      }

      this._current = bd;
      return bd;
    },

    confirm: function (title, message, onConfirm) {
      return this.open({
        title: title || '確認',
        html: '<p style="margin:0;white-space:pre-wrap;">' + escapeHtml(message || '') + '</p>',
        confirmText: '確認',
        onConfirm: onConfirm || null,
        closeOnBackdrop: false,
        closeOnEsc: false
      });
    },

    close: function () {
      var bd = this._current;
      if (!bd) return;

      bd.classList.remove('is-open');
      bd.classList.add('is-leave');

      if (bd._escHandler) {
        document.removeEventListener('keydown', bd._escHandler);
      }

      window.setTimeout(function () {
        if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
      }, 220);

      this._current = null;
    }
  };

  global.Modal = Modal;

})(window);
