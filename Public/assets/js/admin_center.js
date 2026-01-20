/* Path: Public/assets/js/admin_center.js
 * 說明: 管理中心互動（改自己密碼 + 使用者管理 CRUD）
 */

(function (global) {
  'use strict';

  function qs(sel, root){ return (root || document).querySelector(sel); }
  function qsa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function apiUrl(path){
    var base = global.BASE_URL || '';
    if (base && base[base.length - 1] === '/') base = base.slice(0, -1);
    return base + path;
  }

  function toastOk(msg){
    if (global.Toast && typeof global.Toast.show === 'function') {
      global.Toast.show('success', '成功', msg);
    } else {
      alert(msg);
    }
  }

  function toastErr(msg){
    if (global.Toast && typeof global.Toast.show === 'function') {
      global.Toast.show('error', '錯誤', msg);
    } else {
      alert(msg);
    }
  }

  function apiJson(url, opts){
    opts = opts || {};
    opts.credentials = 'same-origin';
    opts.headers = opts.headers || {};
    opts.headers['Accept'] = 'application/json';
    return fetch(url, opts).then(function(res){
      return res.json().then(function(j){
        if (!res.ok || !j || j.success === false) {
          var m = (j && (j.error || j.message)) ? (j.error || j.message) : ('HTTP ' + res.status);
          throw new Error(m);
        }
        return j;
      });
    });
  }

  function bindTabs(){
    var tabs = qsa('.ac-tab');
    var panes = qsa('.ac-pane');
    tabs.forEach(function(btn){
      btn.addEventListener('click', function(){
        var tab = btn.getAttribute('data-tab');
        tabs.forEach(function(b){ b.classList.toggle('is-active', b === btn); });
        panes.forEach(function(p){
          p.classList.toggle('is-active', p.getAttribute('data-pane') === tab);
        });
      });
    });
  }

  // my password
  function bindMyPwd(){
    var form = qs('#acPwdForm');
    if (!form) return;

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var oldp = (form.querySelector('[name="old_password"]').value || '');
      var newp = (form.querySelector('[name="new_password"]').value || '');
      var newp2 = (form.querySelector('[name="new_password2"]').value || '');
      if (!oldp || !newp || !newp2) return toastErr('請完整填寫密碼欄位');
      if (newp !== newp2) return toastErr('新密碼與確認不一致');
      if (newp.length < 8) return toastErr('新密碼至少 8 碼');

      apiJson(apiUrl('/api/auth/change_password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldp, new_password: newp })
      })
        .then(function(){
          form.reset();
          toastOk('密碼已更新');
        })
        .catch(function(err){
          toastErr(err.message || '更新失敗');
        });
    });
  }

  // users management
  var state = {
    users: []
  };

  function renderUsers(){
    var tb = qs('#acUsersTbody');
    if (!tb) return;

    if (!state.users || !state.users.length) {
      tb.innerHTML = '<tr><td colspan="6" class="ac-muted">目前沒有使用者</td></tr>';
      return;
    }

    tb.innerHTML = state.users.map(function(u){
      var status = String(u.is_active) === '1' ? '啟用' : '停用';
      var btnToggle = String(u.is_active) === '1' ? '停用' : '啟用';

      return [
        '<tr>',
          '<td>', u.id, '</td>',
          '<td>', esc(u.name), '</td>',
          '<td>', esc(u.username), '</td>',
          '<td>', esc(u.role), '</td>',
          '<td>', status, '</td>',
          '<td>',
            '<button type="button" class="btn btn--secondary" data-act="edit" data-id="', u.id, '">編輯</button> ',
            '<button type="button" class="btn btn--secondary" data-act="toggle" data-id="', u.id, '">', btnToggle, '</button> ',
            '<button type="button" class="btn btn--secondary" data-act="resetpwd" data-id="', u.id, '">重設密碼</button>',
          '</td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function esc(s){
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function loadUsers(){
    return apiJson(apiUrl('/api/admin/users_list'))
      .then(function(j){
        state.users = (j.data && j.data.users) ? j.data.users : [];
        renderUsers();
      });
  }

  function modalOpen(){
    var m = qs('#acUserModal');
    if (m) m.hidden = false;
  }
  function modalClose(){
    var m = qs('#acUserModal');
    if (m) m.hidden = true;
  }

  function fillModal(u){
    var form = qs('#acUserForm');
    if (!form) return;

    form.querySelector('[name="id"]').value = u ? String(u.id) : '0';
    form.querySelector('[name="name"]').value = u ? (u.name || '') : '';
    form.querySelector('[name="username"]').value = u ? (u.username || '') : '';
    form.querySelector('[name="role"]').value = u ? (u.role || 'STAFF') : 'STAFF';
    form.querySelector('[name="is_active"]').value = u ? String(u.is_active) : '1';
    form.querySelector('[name="new_password"]').value = '';
    qs('#acModalTitle').textContent = u ? ('編輯使用者 #' + u.id) : '新增使用者';
  }

  function bindUsersTable(){
    var tb = qs('#acUsersTbody');
    if (!tb) return;

    tb.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!btn) return;

      var act = btn.getAttribute('data-act');
      var id = parseInt(btn.getAttribute('data-id') || '0', 10);
      var u = state.users.filter(function(x){ return parseInt(x.id,10) === id; })[0];

      if (act === 'edit') {
        fillModal(u);
        modalOpen();
        return;
      }

      if (act === 'toggle') {
        apiJson(apiUrl('/api/admin/users_toggle_active'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id })
        })
          .then(function(){ return loadUsers(); })
          .then(function(){ toastOk('狀態已更新'); })
          .catch(function(err){ toastErr(err.message || '更新失敗'); });
        return;
      }

      if (act === 'resetpwd') {
        var np = prompt('輸入新密碼（至少 8 碼）');
        if (!np) return;
        if (np.length < 8) return toastErr('新密碼至少 8 碼');

        apiJson(apiUrl('/api/admin/users_set_password'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, new_password: np })
        })
          .then(function(){ toastOk('密碼已更新'); })
          .catch(function(err){ toastErr(err.message || '更新失敗'); });
        return;
      }
    });
  }

  function bindNewUser(){
    var btn = qs('#acBtnNewUser');
    if (!btn) return;
    btn.addEventListener('click', function(){
      fillModal(null);
      modalOpen();
    });
  }

  function bindModalClose(){
    var m = qs('#acUserModal');
    if (!m) return;

    m.addEventListener('click', function(e){
      var t = e.target;
      if (t && (t.getAttribute('data-close') === '1' || (t.closest && t.closest('[data-close="1"]')))) {
        modalClose();
      }
    });

    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !m.hidden) modalClose();
    });
  }

  function bindUserSave(){
    var form = qs('#acUserForm');
    if (!form) return;

    form.addEventListener('submit', function(e){
      e.preventDefault();

      var id = parseInt(form.querySelector('[name="id"]').value || '0', 10);
      var name = (form.querySelector('[name="name"]').value || '').trim();
      var username = (form.querySelector('[name="username"]').value || '').trim();
      var role = (form.querySelector('[name="role"]').value || 'STAFF').toUpperCase();
      var isActive = parseInt(form.querySelector('[name="is_active"]').value || '1', 10);
      var newPwd = (form.querySelector('[name="new_password"]').value || '');

      if (!name || !username) return toastErr('姓名與帳號不可為空');
      if (role !== 'ADMIN' && role !== 'STAFF') return toastErr('角色不合法');

      apiJson(apiUrl('/api/admin/users_save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          name: name,
          username: username,
          role: role,
          is_active: isActive,
          new_password: newPwd // 可空字串
        })
      })
        .then(function(){
          modalClose();
          return loadUsers();
        })
        .then(function(){
          toastOk('已儲存');
        })
        .catch(function(err){
          toastErr(err.message || '儲存失敗');
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    bindTabs();
    bindMyPwd();

    bindNewUser();
    bindUsersTable();
    bindModalClose();
    bindUserSave();

    loadUsers().catch(function(){});
  });

})(window);
