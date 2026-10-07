/* Path: Public/assets/js/me_account.js
 * 說明: 管理帳號頁互動（載入 me、更新基本資料、改密碼）
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
      global.Toast.show({ type: 'success', title: '成功', message: msg });
    } else {
      alert(msg);
    }
  }

  function toastErr(msg){
    if (global.Toast && typeof global.Toast.show === 'function') {
      global.Toast.show({ type: 'danger', title: '錯誤', message: msg });
    } else {
      alert(msg);
    }
  }

  // Form-scoped lock also covers Enter / programmatic repeated submits.
  function lockForm(form){
    form._saving = true;
    form.setAttribute('aria-busy', 'true');
    var buttons = qsa('button[type="submit"]', form);
    var previous = buttons.map(function(btn){ return btn.disabled; });
    var labels = buttons.map(function(btn){ return btn.innerHTML; });
    buttons.forEach(function(btn){ btn.disabled = true; btn.textContent = '儲存中…'; });
    return function(){
      form._saving = false;
      form.removeAttribute('aria-busy');
      buttons.forEach(function(btn, i){ btn.disabled = previous[i]; btn.innerHTML = labels[i]; });
    };
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

  var profileDraft, passwordDraft;

  function bindTabs(){
    var tabs = qsa('.ma-tab');
    var panes = qsa('.ma-pane');
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

  function loadMe(){
    var initialName = qs('#maName').value;
    var initialUsername = qs('#maUsername').value;
    return apiJson(apiUrl('/api/auth/me'))
      .then(function(j){
        var u = j.data || {};
        var elName = qs('#maName');
        var elUsername = qs('#maUsername');
        if (elName && elName.value === initialName) elName.value = u.name || '';
        if (elUsername && elUsername.value === initialUsername) elUsername.value = u.username || '';
        // A late initial /me response must not erase edits already being typed.
        var baseline = JSON.parse(profileDraft.capture()).map(function (field) {
          if (field[0] === 'name' || field[0] === 'maName') field[2] = String(u.name || '').trim();
          if (field[0] === 'username' || field[0] === 'maUsername') field[2] = String(u.username || '').trim();
          return field;
        });
        profileDraft.markClean(JSON.stringify(baseline));
      });
  }

  function bindProfileSave(){
    var form = qs('#maProfileForm');
    if (!form) return;

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (form._saving) return;

      var name = (qs('#maName').value || '').trim();
      var username = (qs('#maUsername').value || '').trim();
      if (!name || !username) return toastErr('姓名與帳號不可為空');

      var draft = form.getAttribute('id') === 'maProfileForm' ? profileDraft : passwordDraft;
      var saved = draft.capture();
      var release = lockForm(form);
      Promise.resolve().then(function(){ return apiJson(apiUrl('/api/me/account_update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, username: username })
      }); })
        .then(function(){
          toastOk('已更新基本資料');
          // 重新刷新 topbar 顯示（最簡單：重抓 /me）
          draft.markClean(saved);
          if (!draft.isDirty()) return loadMe();
        })
        .catch(function(err){
          toastErr(err.message || '更新失敗');
        }).finally(release);
    });
  }

  function bindPwdChange(){
    var form = qs('#maPwdForm');
    if (!form) return;

    form.addEventListener('submit', function(e){
      e.preventDefault();
      if (form._saving) return;

      var oldp = (form.querySelector('[name="old_password"]').value || '');
      var newp = (form.querySelector('[name="new_password"]').value || '');
      var newp2 = (form.querySelector('[name="new_password2"]').value || '');
      if (!oldp || !newp || !newp2) return toastErr('請完整填寫密碼欄位');
      if (newp !== newp2) return toastErr('新密碼與確認不一致');
      if (newp.length < 8) return toastErr('新密碼至少 8 碼');

      var draft = form.getAttribute('id') === 'maProfileForm' ? profileDraft : passwordDraft;
      var saved = draft.capture();
      var release = lockForm(form);
      Promise.resolve().then(function(){ return apiJson(apiUrl('/api/auth/change_password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldp, new_password: newp })
      }); })
        .then(function(){
          draft.markClean(saved);
          if (!draft.isDirty()) { form.reset(); draft.markClean(); }
          toastOk('密碼已更新');
        })
        .catch(function(err){
          toastErr(err.message || '更新失敗');
        }).finally(release);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    bindTabs();
    profileDraft = global.UnsavedChanges.watch('account-profile', { root: qs('#maProfileForm'), busy: function () { return !!qs('#maProfileForm')._saving; } });
    loadMe().catch(function(){});
    bindProfileSave();
    bindPwdChange();
    passwordDraft = global.UnsavedChanges.watch('account-password', { root: qs('#maPwdForm'), busy: function () { return !!qs('#maPwdForm')._saving; } });
  });

})(window);
