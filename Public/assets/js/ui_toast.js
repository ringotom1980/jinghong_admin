/*
 * Path: Public/assets/js/ui_toast.js
 * 說明: 共用 Toast（取代 alert）— success/error/warn/info
 * - 自動建立 .toast-wrap 容器
 * - 搭配 motion.css：.toast + .is-show/.is-leave 動畫狀態
 * - 對外提供 window.Toast API
 */

(function () {
  'use strict';

  /* ===== 基本工具 ===== */
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function isStr(v) { return typeof v === 'string'; }

  /* ===== 內部狀態 ===== */
  var _wrap = null;
  var _maxToasts = 5;
  var _defaultDuration = 3000;

  /* ===== 建立容器 ===== */
  function ensureWrap() {
    if (_wrap && document.body.contains(_wrap)) return _wrap;

    var el = document.querySelector('.toast-wrap');
    if (el) {
      _wrap = el;
      return _wrap;
    }

    _wrap = document.createElement('div');
    _wrap.className = 'toast-wrap';
    document.body.appendChild(_wrap);
    return _wrap;
  }

  /* ===== 建立 toast 元素 ===== */
  function buildToast(type, message) {
    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;

    var icon = document.createElement('div');
    icon.className = 'toast__icon';
    icon.innerHTML = pickIconHtml(type);

    var msg = document.createElement('div');
    msg.className = 'toast__msg';
    msg.textContent = isStr(message) ? message : String(message || '');

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast__close';
    close.setAttribute('aria-label', '關閉提示');
    close.innerHTML = '<i class="fa-solid fa-xmark"></i>';

    toast.appendChild(icon);
    toast.appendChild(msg);
    toast.appendChild(close);

    return { toast: toast, closeBtn: close };
  }

  /* ===== icon 對應（Font Awesome CDN 已在 head.php 載入） ===== */
  function pickIconHtml(type) {
    switch (type) {
      case 'success': return '<i class="fa-solid fa-circle-check"></i>';
      case 'error':   return '<i class="fa-solid fa-circle-xmark"></i>';
      case 'warn':    return '<i class="fa-solid fa-triangle-exclamation"></i>';
      case 'info':
      default:        return '<i class="fa-solid fa-circle-info"></i>';
    }
  }

  /* ===== 顯示與自動關閉 ===== */
  function showToast(opts) {
    opts = opts || {};
    var type = (opts.type || 'info');
    var message = opts.message || '';
    var durationMs = clamp(Number(opts.durationMs || _defaultDuration) || _defaultDuration, 800, 15000);

    var wrap = ensureWrap();

    // 超過上限：先移除最舊的
    while (wrap.children.length >= _maxToasts) {
      wrap.removeChild(wrap.firstElementChild);
    }

    var built = buildToast(type, message);
    var toast = built.toast;

    wrap.appendChild(toast);

    // 進場（motion.css 會處理）
    requestAnimationFrame(function () {
      toast.classList.add('is-show');
    });

    var closed = false;
    var timer = null;

    function closeToast() {
      if (closed) return;
      closed = true;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      // 離場（motion.css 會處理）
      toast.classList.add('is-leave');
      toast.classList.remove('is-show');

      // 給動畫一點時間再移除（與 motion.css 的 --m-mid/--m-slow 相容）
      setTimeout(function () {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
      }, 260);
    }

    // 點 X 關閉
    built.closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closeToast();
    });

    // 點 toast 本體也可關閉（輕量 UX）
    toast.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('.toast__close')) return;
      closeToast();
    });

    // 自動關閉
    timer = setTimeout(closeToast, durationMs);

    return { close: closeToast };
  }

  /* ===== 清空所有 toast ===== */
  function clearAll() {
    var wrap = ensureWrap();
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  }

  /* ===== 對外 API（success/error/warn/info） ===== */
  window.Toast = {
    show: function (opts) { return showToast(opts || {}); },
    success: function (msg, opts) {
      opts = opts || {};
      opts.type = 'success';
      opts.message = msg;
      return showToast(opts);
    },
    error: function (msg, opts) {
      opts = opts || {};
      opts.type = 'error';
      opts.message = msg;
      return showToast(opts);
    },
    warn: function (msg, opts) {
      opts = opts || {};
      opts.type = 'warn';
      opts.message = msg;
      return showToast(opts);
    },
    info: function (msg, opts) {
      opts = opts || {};
      opts.type = 'info';
      opts.message = msg;
      return showToast(opts);
    },
    clear: function () { clearAll(); }
  };
})();
