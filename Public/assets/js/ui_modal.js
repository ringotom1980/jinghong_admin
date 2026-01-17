/* Path: Public/assets/js/ui_modal.js
 * 說明: Modal 行為（open/close/confirm/confirmChoice）
 * 定版：confirm modal 必須點「確認」才可關閉（不點背景、不 auto close、不 ESC）
 * ✅ 修正：onConfirm() 若回傳 false → 不關閉（用於「必填才可關閉」的情境）
 * ✅ 新增：confirmChoice（一般情境：可取消，可用 X / 背景 / ESC 關閉；取消不觸發 onConfirm）
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
    _stack: [],
    open: function (opts) {
      opts = opts || {};
      var title = opts.title || '';
      var html = opts.html || '';
      var confirmText = opts.confirmText || '確認';
      var cancelText = (opts.cancelText !== undefined && opts.cancelText !== null) ? String(opts.cancelText) : '';
      var onConfirm = (typeof opts.onConfirm === 'function') ? opts.onConfirm : null;
      var onCancel = (typeof opts.onCancel === 'function') ? opts.onCancel : null;

      // close policy (default: confirm-only)
      var closeOnBackdrop = !!opts.closeOnBackdrop; // default false
      var closeOnEsc = !!opts.closeOnEsc; // default false
      var allowCloseBtn = !!opts.allowCloseBtn; // default false（confirm-only）

      var stack = !!opts.stack; // ✅ stack=true 表示疊在既有 modal 上
      if (!stack) this.close(); // one at a time（預設維持原行為）

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
        + (cancelText ? '  <button class="btn btn--ghost modal__cancel" type="button">' + escapeHtml(cancelText) + '</button>' : '')
        + '  <button class="btn btn--primary modal__confirm" type="button">' + escapeHtml(confirmText) + '</button>'
        + '</div>';

      bd.appendChild(panel);
      document.body.appendChild(bd);
      // ✅ stack：讓新 modal 疊在上面
      if (stack) {
        var z = 2000 + (this._stack.length * 10); // 每層 +10，避免互相蓋到
        bd.style.zIndex = String(z);
      }

      // ✅ 保底：先立即打開（避免只剩遮罩）
      bd.classList.add('is-open');
      panel.classList.add('is-open');

      // ✅ 再用 rAF 觸發動畫（兼容你的 motion.css）
      requestAnimationFrame(function () {
        bd.classList.add('is-open');
        panel.classList.add('is-open');
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
            } catch (e) { }
          }
          if (shouldClose) Modal.close();
        });
      }

      var cancelBtn = panel.querySelector('.modal__cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          if (onCancel) {
            try { onCancel(); } catch (e) { }
          }
          Modal.close();
        });
      }

      var closeBtn = panel.querySelector('.modal__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          // confirm-only：預設不允許用 X 關閉；一般 confirmChoice 會開 allowCloseBtn
          if (!allowCloseBtn) return;

          if (onCancel) {
            try { onCancel(); } catch (e) { }
          }
          Modal.close();
        });
      }

      if (closeOnBackdrop) {
        bd.addEventListener('click', function (e) {
          if (e.target === bd) {
            if (onCancel) {
              try { onCancel(); } catch (err) { }
            }
            Modal.close();
          }
        });
      }

      if (closeOnEsc) {
        bd._escHandler = function (e) {
          if (e.key === 'Escape') {
            if (onCancel) {
              try { onCancel(); } catch (err2) { }
            }
            Modal.close();
          }
        };
        document.addEventListener('keydown', bd._escHandler);
      }

      if (stack) {
        this._stack.push(bd);
      } else {
        this._stack = [bd];
      }
      this._current = bd;
      return bd;

    },

    // ✅ 原定版：只能按「確認」才可關閉（不點背景、不 ESC、不 X）
    // 且 onConfirm() 回傳 false → 不關閉
    confirm: function (title, message, onConfirm) {
      return this.open({
        title: title || '確認',
        html: '<p style="margin:0;white-space:pre-wrap;">' + escapeHtml(message || '') + '</p>',
        confirmText: '確認',
        onConfirm: onConfirm || null,
        cancelText: '',

        allowCloseBtn: false,
        closeOnBackdrop: false,
        closeOnEsc: false
      });
    },

    // ✅ 一般確認：可取消（取消鈕 / X / 背景 / ESC 都視為取消，不會觸發 onConfirm）
    confirmChoice: function (title, message, onConfirm, onCancel, opts) {
      opts = opts || {};
      return this.open({
        title: title || '確認',
        html: '<p style="margin:0;white-space:pre-wrap;">' + escapeHtml(message || '') + '</p>',

        confirmText: opts.confirmText || '確認',
        cancelText: (opts.cancelText !== undefined) ? String(opts.cancelText) : '取消',

        onConfirm: onConfirm || null,
        onCancel: onCancel || null,
        stack: true, // ✅ confirm 疊在既有 modal 上，不關閉外層

        // 預設放行（符合一般刪除/確認）
        allowCloseBtn: (opts.allowCloseBtn !== undefined) ? !!opts.allowCloseBtn : true,
        closeOnBackdrop: (opts.closeOnBackdrop !== undefined) ? !!opts.closeOnBackdrop : true,
        closeOnEsc: (opts.closeOnEsc !== undefined) ? !!opts.closeOnEsc : true
      });
    },

    close: function () {
      var bd = (this._stack && this._stack.length) ? this._stack[this._stack.length - 1] : this._current;
      if (!bd) return;

      bd.classList.remove('is-open');
      bd.classList.add('is-leave');

      if (bd._escHandler) {
        document.removeEventListener('keydown', bd._escHandler);
      }

      window.setTimeout(function () {
        if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
      }, 220);

      if (this._stack && this._stack.length) this._stack.pop();
      this._current = (this._stack && this._stack.length) ? this._stack[this._stack.length - 1] : null;

    }
  };

  global.Modal = Modal;

})(window);
