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

  function baseUrl() {
    // 若你全站已在 api.js 或 head 內提供 BASE_URL，就吃它；沒有就退回空字串（站根）
    return (window.BASE_URL || '').replace(/\/$/, '');
  }

  function goLogin() {
    window.location.replace(baseUrl() + '/login');
  }

  // 統一打「站根」的 API（不要用 ./ 相對路徑）
  var url = baseUrl() + '/api/auth/logout';

  fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Accept': 'application/json' }
  })
    .then(function (res) {
      // 不管 API 回什麼，登出頁都要把人送走（避免卡住）
      if (!res || !res.ok) {
        // 仍然導回登入頁（不要卡）
        setMsg('登出完成，正在返回登入頁...', 'success');
      }
      goLogin();
    })
    .catch(function () {
      setMsg('登出完成，正在返回登入頁...', 'success');
      setTimeout(goLogin, 300);
    });
});
