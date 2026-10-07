/**
 * Path: Public/assets/js/login.js
 * 說明: 登入頁表單送出（正式版）
 */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('loginForm');
  var msgEl = document.getElementById('loginMessage');
  if (!form) return;

  function setMsg(text, type) {
    msgEl.textContent = text || '';
    msgEl.className = 'auth-msg ' + (type || '');
  }

  function disableForm(disabled) {
    form.querySelectorAll('input, button').forEach(function (el) {
      el.disabled = disabled;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var u = form.username.value.trim();
    var p = form.password.value.trim();

    if (!u || !p) {
      setMsg('請輸入帳號與密碼', 'error');
      return;
    }

    disableForm(true);
    setMsg('');
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn && window.UI && UI.motion && UI.motion.loading) {
      /* 讀取資料時轉圈圈動畫（文字後面 end） */
      UI.motion.loading.on(submitBtn, { position: 'end' });
    }

    fetch('./api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ username: u, password: p }).toString(),
      credentials: 'same-origin'
    })
      .then(r => r.json())
      .then(j => {
        if (!j.success) {
          setMsg(j.error || '登入失敗', 'error');
          if (submitBtn && window.UI && UI.motion && UI.motion.loading) UI.motion.loading.off(submitBtn);
          disableForm(false);
          return;
        }
        window.location.href = './dashboard';
      })
      .catch(() => {
        setMsg('伺服器錯誤，請稍後再試', 'error');
        if (submitBtn && window.UI && UI.motion && UI.motion.loading) UI.motion.loading.off(submitBtn);
        disableForm(false);
      });
  });
});
