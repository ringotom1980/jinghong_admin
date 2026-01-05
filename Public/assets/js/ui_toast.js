/* Path: Public/assets/js/ui_toast.js
 * 說明: Toast 行為（show/close/auto-remove）
 */
(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Toast = {
    _wrap: null,
    _seq: 1,

    _ensureWrap: function () {
      if (this._wrap) return this._wrap;
      var w = qs('.toast-wrap');
      if (!w) {
        w = document.createElement('div');
        w.className = 'toast-wrap';
        document.body.appendChild(w);
      }
      this._wrap = w;
      return w;
    },

    show: function (opts) {
      opts = opts || {};
      var type = (opts.type || 'info').toLowerCase();
      var title = opts.title || '';
      var message = opts.message || '';
      var duration = (opts.duration === 0) ? 0 : (Number(opts.duration) || 2600);

      var wrap = this._ensureWrap();
      var id = 'toast-' + (this._seq++);

      var el = document.createElement('div');
      el.className = 'toast toast--' + type;
      el.id = id;

      el.innerHTML = ''
        + '<div class="toast__row">'
        + '  <div class="toast__bar" aria-hidden="true"></div>'
        + '  <div class="toast__main">'
        + (title ? ('<div class="toast__title">' + escapeHtml(title) + '</div>') : '')
        + '    <p class="toast__msg">' + escapeHtml(message) + '</p>'
        + '  </div>'
        + '  <button class="toast__close" type="button" aria-label="關閉">✕</button>'
        + '</div>';

      wrap.appendChild(el);

      // motion.css 會接 .toast / .is-show / .is-leave
      requestAnimationFrame(function () {
        el.classList.add('is-show');
      });

      var btn = el.querySelector('.toast__close');
      if (btn) {
        btn.addEventListener('click', function () {
          Toast.close(id);
        });
      }

      if (duration > 0) {
        window.setTimeout(function () {
          Toast.close(id);
        }, duration);
      }

      return id;
    },

    close: function (id) {
      var el = document.getElementById(id);
      if (!el) return;

      el.classList.remove('is-show');
      el.classList.add('is-leave');

      window.setTimeout(function () {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 240);
    }
  };

  function escapeHtml(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.Toast = Toast;

})(window);
