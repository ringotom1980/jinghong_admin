/**
 * Path: Public/assets/js/logout.js
 * 說明: 登出頁行為（正式版）
 * - 進入 /logout 即自動呼叫 POST /api/auth/logout
 * - 成功/失敗都導回 /login（避免卡住）
 */

document.addEventListener('DOMContentLoaded', function () {
  var msgEl = document.getElementById('logoutMessage');

  function setMsg(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.classList.remove('error', 'success');
    if (type) msgEl.classList.add(type);
  }

  function goLogin() {
    // 不寫死 /jinghong_admin，使用相對路徑交給 router
    window.location.replace('./login');
  }

  fetch('./api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin'
  })
    .then(function () {
      goLogin();
    })
    .catch(function () {
      // 就算 API 出錯，也要把使用者帶離管理頁面
      setMsg('登出完成，正在返回登入頁...', 'success');
      setTimeout(goLogin, 500);
    });
});
