/* Path: Public/assets/js/mat_personnel.js
 * 說明: /mat/personnel 前端控制器（承辦人異動）
 * - GET list：載入 A-F
 * - POST update：每列更新
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(type, title, message) {
    if (global.Toast && global.Toast.show) {
      global.Toast.show({ type: type, title: title, message: message });
      return;
    }
    // fallback
    alert((title ? (title + '\n') : '') + (message || ''));
  }

  var App = {
    els: { list: null, btnReload: null },
    state: { rows: [] },

    init: function () {
      this.els.list = qs('#mpList');
      this.els.btnReload = qs('#mpBtnReload');

      if (this.els.btnReload) {
        this.els.btnReload.addEventListener('click', function () {
          App.load();
        });
      }

      this.load();
    },

    load: function () {
      if (!global.apiGet) return;

      if (this.els.list) this.els.list.innerHTML = '<div class="me-note">載入中…</div>';

      return global.apiGet('/api/mat/personnel?action=list').then(function (j) {
        if (!j || !j.success) {
          toast('error', '載入失敗', (j && j.error) ? j.error : 'list error');
          return;
        }

        var rows = (j.data && j.data.rows) ? j.data.rows : [];
        if (!Array.isArray(rows)) rows = [];
        App.state.rows = rows;

        App.render();
      });
    },

    render: function () {
      if (!this.els.list) return;

      var rows = this.state.rows || [];
      if (!rows.length) {
        this.els.list.innerHTML = '<div class="me-note">目前沒有資料。</div>';
        return;
      }

      var html = '';
      rows.forEach(function (r) {
        var shift = String(r.shift_code || '');
        var name = String(r.person_name || '');
        html += ''
          + '<div class="mp-row" data-shift="' + esc(shift) + '">'
          + '  <div class="mp-shift">' + esc(shift) + '</div>'
          + '  <div class="mp-name">'
          + '    <input class="mp-input" type="text" maxlength="50" value="' + esc(name) + '" data-orig="' + esc(name) + '" />'
          + '  </div>'
          + '  <div class="mp-actions">'
          + '    <button type="button" class="btn btn--primary mp-btn" data-act="update">更新</button>'
          + '  </div>'
          + '</div>';
      });

      this.els.list.innerHTML = html;
      this.bindRowEvents();
    },

    bindRowEvents: function () {
      // 更新按鈕
      qsa('.mp-row [data-act="update"]', this.els.list).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var row = btn.closest('.mp-row');
          if (!row) return;
          App.updateRow(row);
        });
      });

      // Enter 送出（只送該列）
      qsa('.mp-row .mp-input', this.els.list).forEach(function (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var row = inp.closest('.mp-row');
            if (row) App.updateRow(row);
          }
        });
      });
    },

    setRowBusy: function (row, busy) {
      if (!row) return;
      row.classList.toggle('is-busy', !!busy);

      var input = qs('.mp-input', row);
      var btn = qs('.mp-btn', row);
      if (input) input.disabled = !!busy;
      if (btn) btn.disabled = !!busy;
    },

    updateRow: function (row) {
      if (!global.apiPost) return;

      var shift = row.getAttribute('data-shift') || '';
      var input = qs('.mp-input', row);
      var btn = qs('.mp-btn', row);

      var name = input ? String(input.value || '').trim() : '';
      var orig = input ? String(input.getAttribute('data-orig') || '').trim() : '';

      if (!shift) return;

      if (!name) {
        toast('warning', '缺少姓名', '請輸入承辦人姓名');
        if (input) input.focus();
        return;
      }

      if (name === orig) {
        toast('info', '未變更', '姓名沒有變更，不需更新');
        return;
      }

      App.setRowBusy(row, true);

      return global.apiPost('/api/mat/personnel?action=update', {
        shift_code: shift,
        person_name: name
      }).then(function (j) {
        App.setRowBusy(row, false);

        if (!j || !j.success) {
          toast('error', '更新失敗', (j && j.error) ? j.error : 'update error');
          return;
        }

        // 成功：更新 orig
        if (input) input.setAttribute('data-orig', name);
        toast('success', '已更新', '班別 ' + shift + ' 承辦人已更新');
      });
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
