/* Path: Public/assets/js/ui_modal.js
 * 說明: Modal 行為（open/close/confirm/confirmChoice）
 * 定版：
 * - confirm modal 必須點「確認」才可關閉（不點背景、不 auto close、不 ESC、不 X）
 * - confirmChoice（一般情境）：可取消，可用 X / 背景 / ESC 關閉；取消不觸發 onConfirm
 *
 * ✅ 巢狀支援（Modal 內再開 confirmChoice）
 * - 改成「堆疊模式」：confirmChoice 會 stack=true 疊在上層，不會把外層 modal 關掉
 * - close() 永遠只關閉最上層；關完會回到上一層（外層仍在）
 *
 * ✅ onConfirm() 若回傳 false → 不關閉（用於必填檢核）
 * ✅ onConfirm() 若回傳 Promise → resolve 後依結果決定是否關閉（false 不關）
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

  function isPromise(x) {
    return !!x && (typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function';
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

      // close policy
      var closeOnBackdrop = !!opts.closeOnBackdrop; // default false
      var closeOnEsc = !!opts.closeOnEsc; // default false
      var allowCloseBtn = !!opts.allowCloseBtn; // default false（confirm-only）

      // ✅ stack=true：保留既有 modal（用於 modal 內再開 confirmChoice）
      var stack = !!opts.stack;
      if (!stack) this.closeAll(); // default：一次只留一個（舊行為）

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

      // ✅ 疊加時提高 z-index：以上一層為基準 +10，保證疊在最上面
      if (stack) {
        var prev = (this._stack && this._stack.length) ? this._stack[this._stack.length - 1] : null;

        var baseZ = 2000;
        if (prev) {
          // 先吃 inline style，再吃 computed style
          var z1 = parseInt(prev.style.zIndex || '0', 10);
          var z2 = 0;
          try { z2 = parseInt(window.getComputedStyle(prev).zIndex || '0', 10); } catch (e) { z2 = 0; }
          baseZ = Math.max(baseZ, (isNaN(z1) ? 0 : z1), (isNaN(z2) ? 0 : z2));
        }

        bd.style.zIndex = String(baseZ + 10);
      }

      // ✅ 保底：先立即打開（避免只剩遮罩）
      bd.classList.add('is-open');
      panel.classList.add('is-open');

      // ✅ 再用 rAF 觸發動畫（兼容 motion.css）
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
              var r = onConfirm();

              // ✅ Promise 支援：resolve 後再決定關不關
              if (isPromise(r)) {
                r.then(function (v) {
                  if (v === false) return;
                  Modal.close(); // 只關最上層
                }).catch(function () { /* ignore */ });
                return;
              }

              if (r === false) shouldClose = false;
            } catch (e) { /* ignore */ }
          }

          if (shouldClose) Modal.close();
        });
      }

      var cancelBtn = panel.querySelector('.modal__cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
          if (onCancel) {
            try { onCancel(); } catch (e) { /* ignore */ }
          }
          Modal.close();
        });
      }

      var closeBtn = panel.querySelector('.modal__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function () {
          // confirm-only：預設不允許用 X 關閉；confirmChoice 會 allowCloseBtn=true
          if (!allowCloseBtn) return;

          if (onCancel) {
            try { onCancel(); } catch (e) { /* ignore */ }
          }
          Modal.close();
        });
      }

      if (closeOnBackdrop) {
        bd.addEventListener('click', function (e) {
          if (e.target === bd && Modal._current === bd) {
            if (onCancel) {
              try { onCancel(); } catch (err) { /* ignore */ }
            }
            Modal.close();
          }
        });
      }

      if (closeOnEsc) {
        bd._escHandler = function (e) {
          if (e.key === 'Escape' && Modal._current === bd) {
            if (onCancel) {
              try { onCancel(); } catch (err2) { /* ignore */ }
            }
            Modal.close();
          }
        };
        document.addEventListener('keydown', bd._escHandler);
      }

      // ✅ 堆疊管理
      this._stack.push(bd);
      this._current = bd;

      return bd;
    },

    // ✅ confirm-only：只能按「確認」才可關閉（不點背景、不 ESC、不 X）
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
        closeOnEsc: false,

        // confirm 一般不用疊加，但允許你手動傳 stack
        stack: false
      });
    },

    // ✅ 一般確認：可取消（取消鈕 / X / 背景 / ESC 都視為取消，不會觸發 onConfirm）
    // ✅ 這裡固定 stack=true，確保不會把外層 modal 關掉
    confirmChoice: function (title, message, onConfirm, onCancel, opts) {
      opts = opts || {};
      return this.open({
        title: title || '確認',
        html: '<p style="margin:0;white-space:pre-wrap;">' + escapeHtml(message || '') + '</p>',

        confirmText: opts.confirmText || '確認',
        cancelText: (opts.cancelText !== undefined) ? String(opts.cancelText) : '取消',

        onConfirm: onConfirm || null,
        onCancel: onCancel || null,

        // ✅ 巢狀確認：一定疊加
        stack: true,

        // 預設放行（符合一般刪除/確認）
        allowCloseBtn: (opts.allowCloseBtn !== undefined) ? !!opts.allowCloseBtn : true,
        closeOnBackdrop: (opts.closeOnBackdrop !== undefined) ? !!opts.closeOnBackdrop : true,
        closeOnEsc: (opts.closeOnEsc !== undefined) ? !!opts.closeOnEsc : true
      });
    },

    // ✅ 關閉最上層（不會關到底）
    close: function () {
      if (!this._stack || !this._stack.length) return;

      var bd = this._stack[this._stack.length - 1];
      if (!bd) return;

      bd.classList.remove('is-open');
      bd.classList.add('is-leave');

      if (bd._escHandler) {
        document.removeEventListener('keydown', bd._escHandler);
      }

      // 先從堆疊移除，避免動畫期間再點擊造成狀態錯亂
      this._stack.pop();
      this._current = this._stack.length ? this._stack[this._stack.length - 1] : null;

      window.setTimeout(function () {
        if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
      }, 220);
    },

    // ✅ 關閉所有（用於 open 的非 stack 模式：一次只留一個）
    closeAll: function () {
      while (this._stack && this._stack.length) {
        this.close();
      }
    }
  };

  global.Modal = Modal;

})(window);
