/**
 * Path: Public/assets/js/auth_me.js
 * 說明: 取得目前登入者並顯示於 topbar
 * - 呼叫 /api/auth/me
 * - 顯示 name → username → 保底文字
 * - 依 role 切換右上角按鈕：ADMIN=管理中心、STAFF=管理帳號
 * - 401 時不噴錯、不跳頁
 */

(function () {
  'use strict';

  function apiUrl(path) {
    var base = window.BASE_URL || '';
    if (base && base[base.length - 1] === '/') base = base.slice(0, -1);
    return base + path;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var elName = document.getElementById('navCurrentUser');
    var elLink = document.getElementById('navAccountLink');

    fetch(apiUrl('/api/auth/me'), {
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) throw res;
        return res.json();
      })
      .then(function (json) {
        if (!json || !json.data) return;

        var u = json.data || {};
        var name = u.name || u.username || '使用者';
        if (elName) elName.textContent = name;

        // role-based topbar button
        var role = (u.role || '').toUpperCase();
        if (elLink) {
          if (role === 'ADMIN') {
            elLink.textContent = '管理中心';
            elLink.setAttribute('href', apiUrl('/admin'));
          } else {
            elLink.textContent = '管理帳號';
            elLink.setAttribute('href', apiUrl('/me/account'));
          }
        }
      })
      .catch(function () {
        // 未登入 / 401：維持原樣，不處理
      });
  });
})();
