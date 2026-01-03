/**
 * Path: Public/assets/js/auth_me.js
 * 說明: 取得目前登入者並顯示於 topbar
 * - 呼叫 /api/auth/me
 * - 顯示 name → username → 保底文字
 * - 401 時不噴錯、不跳頁
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('navCurrentUser');
    if (!el) return;

    fetch(window.BASE_URL ? window.BASE_URL + '/api/auth/me' : '/api/auth/me', {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) throw res;
        return res.json();
      })
      .then(function (json) {
        if (!json || !json.data) return;

        var u = json.data;
        var name = u.name || u.username || '使用者';
        el.textContent = name;
      })
      .catch(function () {
        // 未登入 / 401：維持原樣，不處理
      });
  });
})();
