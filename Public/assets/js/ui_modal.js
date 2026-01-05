/*
 * Path: Public/assets/js/ui_modal.js
 * 說明: 共用 Modal（取代 confirm/alert）
 * - confirm(): 回傳 Promise<boolean>
 * - alert(): 回傳 Promise<void>
 * - 搭配 motion.css：.modal-backdrop/.modal-panel + .is-open/.is-leave
 * - 風格：A（輕量）
 */

(function () {
  'use strict';

  /* ===== 基本工具 ===== */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function isStr(v) { return typeof v === 'string'; }

  /* ===== 內部狀態 ===== */
  var _backdrop = null;
  var _panel = null;
  var _titleEl = null;
  var _msgEl = null;
  var _btnOk = null;
  var _btnCancel = null;

  var _resolver = null;  // 用來 resolve Promise
  var _mode = null;      // 'confirm' | 'alert'
  var _escHandler = null;

  /* ===== 建立 Modal DOM ===== */
  function ensureModal() {
    if (_backdrop && document.body.contains(_backdrop)) return;

    _backdrop = document.createElement('div');
    _backdrop.className = 'modal-backdrop';

    _panel = document.createElement('div');
    _panel.className = 'modal-panel';

    var head = document.createElement('div');
    head.className = 'modal__head';

    _titleEl = document.createElement('div');
    _titleEl.className = 'modal__title';
    _titleEl.textContent = '';

    head.appendChild(_titleEl);

    var body = document.createElement('div');
    body.className = 'modal__body';

    _msgEl = document.createElement('div');
    _msgEl.className = 'modal__message';
    _msgEl.textContent = '';

    body.appendChild(_msgEl);

    var actions = document.createElement('div');
    actions.className = 'modal__actions';

    _btnCancel = document.createElement('button');
    _btnCancel.type = 'button';
    _btnCancel.className = 'btn btn--secondary';
    _btnCancel.textContent = '取消';

    _btnOk = document.createElement('button');
    _btnOk.type = 'button';
    _btnOk.className = 'btn btn--primary';
    _btnOk.textContent = '確定';

    actions.appendChild(_btnCancel);
    actions.appendChild(_btnOk);

    _panel.appendChild(head);
    _panel.appendChild(body);
    _panel.appendChild(actions);

    _backdrop.appendChild(_panel);
    document.body.appendChild(_backdrop);

    /* 點遮罩關閉（只有 confirm 模式允許取消） */
    _backdrop.addEventListener('click', function (e) {
      if (e.target !== _backdrop) return;
      if (_mode === 'confirm') {
        close(false);
      }
    });

    /* 取消按鈕 */
    _btnCancel.addEventListener('click', function () {
      if (_mode === 'confirm') close(false);
    });

    /* 確定按鈕 */
    _btnOk.addEventListener('click', function () {
      if (_mode === 'confirm') close(true);
      else close(); // alert
    });
  }

  /* ===== 開啟（共用） ===== */
  function openModal(opts, mode) {
    ensureModal();

    opts = opts || {};
    _mode = mode;

    var title = isStr(opts.title) && opts.title ? opts.title : (mode === 'confirm' ? '請確認' : '提示');
    var message = isStr(opts.message) ? opts.message : String(opts.message || '');

    var okText = isStr(opts.okText) && opts.okText ? opts.okText : '確定';
    var cancelText = isStr(opts.cancelText) && opts.cancelText ? opts.cancelText : '取消';
    var danger = !!opts.danger;

    _titleEl.textContent = title;
    _msgEl.textContent = message;

    _btnOk.textContent = okText;

    // danger 模式：OK 變成 danger
    _btnOk.className = danger ? 'btn btn--danger' : 'btn btn--primary';

    if (mode === 'confirm') {
      _btnCancel.style.display = '';
      _btnCancel.textContent = cancelText;
    } else {
      _btnCancel.style.display = 'none';
    }

    // 開啟狀態（motion.css 會處理動畫）
    _backdrop.classList.remove('is-leave');
    _backdrop.classList.add('is-open');

    // focus 到主要按鈕（輕量可用）
    setTimeout(function () {
      try { _btnOk.focus(); } catch (e) { }
    }, 0);

    // ESC（只有 confirm 可取消）
    _escHandler = function (ev) {
      if (ev.key !== 'Escape') return;
      if (_mode === 'confirm') close(false);
    };
    document.addEventListener('keydown', _escHandler);
  }

  /* ===== 關閉與清理事件 ===== */
  function close(result) {
    if (!_backdrop) return;

    // 關閉狀態（motion.css 會處理離場）
    _backdrop.classList.add('is-leave');
    _backdrop.classList.remove('is-open');

    // 清掉 ESC handler
    if (_escHandler) {
      document.removeEventListener('keydown', _escHandler);
      _escHandler = null;
    }

    // resolve Promise
    var r = _resolver;
    _resolver = null;

    var mode = _mode;
    _mode = null;

    setTimeout(function () {
      // alert：resolve void；confirm：resolve boolean
      if (typeof r === 'function') {
        if (mode === 'confirm') r(!!result);
        else r();
      }
    }, 220);
  }

  /* ===== 對外 API：confirm（回傳 Promise<boolean>） ===== */
  function confirm(opts) {
    return new Promise(function (resolve) {
      _resolver = resolve;
      openModal(opts, 'confirm');
    });
  }

  /* ===== 對外 API：alert（回傳 Promise<void>） ===== */
  function alertModal(opts) {
    return new Promise(function (resolve) {
      _resolver = resolve;
      openModal(opts, 'alert');
    });
  }

  /* ===== 對外 API 彙整 ===== */
  window.Modal = {
    confirm: confirm,
    alert: alertModal,
    close: function () { close(false); }
  };
})();
