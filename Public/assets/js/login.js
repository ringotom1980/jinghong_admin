/**
 * Path: Public/assets/js/login.js
 * 說明: 登入頁表單送出（正式版）
 * - POST /api/auth/login
 * - 顯示錯誤訊息
 * - 成功後：優先導回 return，否則 /dashboard
 */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('loginForm');
  var msgEl = document.getElementById('loginMessage');
  if (!form) return;

  function setMsg(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.classList.remove('error', 'success');
    if (type) msgEl.classList.add(type);
  }

  function disableForm(disabled) {
    var inputs = form.querySelectorAll('input, button');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].disabled = !!disabled;
    }
  }

  function getReturnTo() {
    // hidden input name="return" (由 login.php 注入)
    var rtEl = form.querySelector('input[name="return"]');
    var rt = rtEl ? String(rtEl.value || '') : '';
    // 只允許站內路徑
    if (rt && rt.charAt(0) === '/' && rt.indexOf('//') !== 0) return rt;
    return '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var username = form.querySelector('input[name="username"]');
    var password = form.querySelector('input[name="password"]');

    var u = username ? String(username.value || '').trim() : '';
    var p = password ? String(password.value || '') : '';

    if (!u || !p) {
      setMsg('請輸入帳號與密碼', 'error');
      return;
    }

    setMsg('', '');
    disableForm(true);

    var body = new URLSearchParams();
    body.set('username', u);
    body.set('password', p);
    body.set('return', getReturnTo());

    fetch((window.BASE_URL ? window.BASE_URL : '') + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      credentials: 'same-origin',
      body: body.toString()
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || j.success !== true) {
          setMsg((j && j.error) ? j.error : '登入失敗', 'error');
          disableForm(false);
          return;
        }

        var rt = getReturnTo();
        var to = rt || ((window.BASE_URL ? window.BASE_URL : '') + '/dashboard');
        // 若 rt 是 /xxx 開頭，直接導向；若 BASE_URL 存在且 rt 不含 base，也可直接用 rt
        window.location.href = rt || to;
      })
      .catch(function () {
        setMsg('連線失敗，請稍後再試', 'error');
        disableForm(false);
      });
  });
});
