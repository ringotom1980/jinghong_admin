/* Path: Public/assets/js/mat_issue_shift.js
 * 說明: 缺 shift 補齊（顯示缺漏 + Modal 下拉選班別人員 + 儲存）
 */

(function (global) {
  'use strict';

  function escapeHtml(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  var Mod = {
    app: null,

    init: function (app) { this.app = app; },

    loadMissing: function () {
      if (!global.apiGet) return;

      var d = (this.app && this.app.state) ? this.app.state.withdraw_date : '';
      if (!d) {
        if (this.app) this.app.els.missing.innerHTML = '<div class="mi-note">請先選擇領退日期</div>';
        return;
      }

      apiGet('/api/mat/issue_missing_shifts?withdraw_date=' + encodeURIComponent(d)).then(function (j) {
        if (!j || !j.success) {
          if (global.MatIssueApp) MatIssueApp.toast('danger', '載入失敗', j && j.error ? j.error : 'issue_missing_shifts');
          return;
        }

        var missing = (j.data && j.data.missing) ? j.data.missing : [];
        var personnel = (j.data && j.data.personnel) ? j.data.personnel : [];
        if (Mod.app && Mod.app.state) {
          Mod.app.state.missing = missing;
          Mod.app.state.personnel = personnel;
        }
        Mod.renderMissing(missing);
      });
    },

    renderMissing: function (rows) {
      var root = this.app && this.app.els ? this.app.els.missing : null;
      if (!root) return;

      if (!rows || !rows.length) {
        root.innerHTML = '<div class="mi-note">目前無缺漏（shift 已齊全）</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        html += ''
          + '<div class="mi-miss">'
          + '  <div class="mi-miss__row">'
          + '    <div class="mi-miss__title">' + escapeHtml(r.material_number) + '</div>'
          + '    <div class="mi-miss__title">缺漏 ' + escapeHtml(r.missing_count) + ' 筆</div>'
          + '  </div>'
          + '  <div class="mi-miss__sub">' + escapeHtml(r.material_name || '') + '</div>'
          + '</div>';
      }

      root.innerHTML = html;
    },

    openShiftModal: function () {
      var rows = this.app.state.missing;
      var personnel = this.app.state.personnel;

      var options = personnel.map(function (p) {
        return '<option value="' + p.shift_code + '">' + p.shift_code + '-' + p.person_name + '</option>';
      }).join('');

      var html = rows.map(function (r) {
        return `
      <div class="mi-row">
        <div>${r.material_number}</div>
        <div>${r.material_name}</div>
        <select data-mn="${r.material_number}">
          <option value="">請選班別</option>
          ${options}
        </select>
      </div>
    `;
      }).join('');

      Modal.open({
        title: '缺班別補齊',
        html: html,
        confirmText: '確認寫入',
        closeOnBackdrop: false,
        closeOnEsc: false,
        onConfirm: function () {
          var items = [];
          document.querySelectorAll('select[data-mn]').forEach(function (s) {
            if (!s.value) throw '有未選班別';
            items.push({
              material_number: s.dataset.mn,
              material_name: '',
              shift_code: s.value
            });
          });

          apiPost('/api/mat/issue_shift_save', {
            batch_ids: MatIssueApp.state.batch_ids,
            items: items
          }).then(function () {
            Modal.close();
            MatIssueApp.refreshAll(true);
          });
        }
      });
    }

  };

  global.MatIssueShift = Mod;

})(window);
