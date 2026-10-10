/**
 * Path: Public/assets/js/login.js
 * 說明: 登入頁表單送出（正式版）
 */

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('loginForm');
  var msgEl = document.getElementById('loginMessage');
  if (!form) return;

  // Touch browsers may defer :active until release; provide immediate pressed feedback.
  document.querySelectorAll('.auth-form .btn, .auth-public .btn').forEach(function (button) {
    function clearPress() { button.classList.remove('is-pressed'); }
    button.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse' && !button.disabled && !button.classList.contains('is-loading')) {
        button.classList.add('is-pressed');
      }
    }, { passive: true });
    ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture', 'blur'].forEach(function (event) {
      button.addEventListener(event, clearPress);
    });
    window.addEventListener('blur', clearPress);
  });

  var inFlight = false;
  var password = document.getElementById("loginPassword");
  var toggle = document.getElementById("passwordToggle");
  if (password && toggle) toggle.addEventListener("click", function () {
    var showing = password.type === "password";
    password.type = showing ? "text" : "password";
    toggle.textContent = showing ? "隱藏" : "顯示";
    toggle.setAttribute("aria-label", showing ? "隱藏密碼" : "顯示密碼");
    toggle.setAttribute("aria-pressed", String(showing));
  });

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
    if (inFlight) return;

    var u = form.username.value.trim();
    var p = form.password.value.trim();

    if (!u || !p) {
      setMsg('請輸入帳號與密碼', 'error');
      return;
    }

    inFlight = true;
    form.setAttribute("aria-busy", "true");
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
          inFlight = false;
          form.setAttribute("aria-busy", "false");
          disableForm(false);
          return;
        }
        window.location.href = './dashboard';
      })
      .catch(() => {
        setMsg('伺服器錯誤，請稍後再試', 'error');
        if (submitBtn && window.UI && UI.motion && UI.motion.loading) UI.motion.loading.off(submitBtn);
        inFlight = false;
        form.setAttribute("aria-busy", "false");
        disableForm(false);
      });
  });
});
