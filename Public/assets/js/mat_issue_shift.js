/* Path: Public/assets/js/mat_issue_shift.js
 * 說明: 缺 shift 補齊（顯示缺漏 + Modal 下拉選班別人員 + 儲存）
 */

(function (global) {
  'use strict';

  function escapeHtml(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
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
      var d = (this.app && this.app.state) ? this.app.state.withdraw_date : '';
      if (!d) {
        MatIssueApp.toast('warning', '尚未選日期', '請先選擇領退日期');
        return;
      }

      var missing = (this.app && this.app.state) ? (this.app.state.missing || []) : [];
      if (!missing.length) {
        MatIssueApp.toast('info', '無缺漏', '目前沒有缺 shift 需要補齊');
        return;
      }

      var personnel = (this.app && this.app.state) ? (this.app.state.personnel || []) : [];

      var opts = '';
      for (var i = 0; i < personnel.length; i++) {
        var p = personnel[i];
        var label = (p.shift_code || '') + '-' + (p.person_name || '');
        opts += '<option value="' + escapeHtml(p.shift_code) + '">' + escapeHtml(label) + '</option>';
      }
      if (!opts) {
        opts = '<option value="">（尚未建立 mat_personnel）</option>';
      }

      var list = '';
      for (var k = 0; k < missing.length; k++) {
        var m = missing[k];
        list += ''
          + '<div class="mi-modal-item">'
          + '  <div>'
          + '    <div class="mi-modal-code">' + escapeHtml(m.material_number) + '</div>'
          + '    <div class="mi-modal-name">' + escapeHtml(m.material_name || '') + '</div>'
          + '  </div>'
          + '  <div class="mi-modal-name">缺 ' + escapeHtml(m.missing_count) + '</div>'
          + '</div>';
      }

      var html = ''
        + '<div class="mi-modal-grid">'
        + '  <div class="mi-modal-hint">範圍：' + escapeHtml(d) + '（只回填該日期 shift 仍為空白的明細）</div>'
        + '  <label class="mi-label">選擇班別承辦人</label>'
        + '  <select id="miShiftSelect">' + opts + '</select>'
        + '  <div class="mi-modal-hint">將把下列材料編號的 shift 一次寫入（材料主檔 + 本日明細回填）</div>'
        + '  <div class="mi-modal-list">' + list + '</div>'
        + '</div>';

      Modal.open({
        title: '缺班別補齊',
        html: html,
        confirmText: '確認寫入',
        onConfirm: function () {
          var sel = document.getElementById('miShiftSelect');
          var code = sel ? (sel.value || '') : '';
          if (!code) {
            MatIssueApp.toast('warning', '未選班別', '請先選擇班別承辦人');
            // confirm-only modal 已關閉，所以這裡就直接提示；你若要「未選不關閉」再跟我說，我會改成 custom modal
            return;
          }
          Mod.saveShift(code);
        },
        closeOnBackdrop: false,
        closeOnEsc: false
      });
    },

    saveShift: function (shiftCode) {
      if (!global.apiPost) return;

      var d = (this.app && this.app.state) ? this.app.state.withdraw_date : '';
      var missing = (this.app && this.app.state) ? (this.app.state.missing || []) : [];

      var materialNumbers = [];
      for (var i = 0; i < missing.length; i++) {
        materialNumbers.push(missing[i].material_number);
      }

      apiPost('/api/mat/issue_shift_save', {
        withdraw_date: d,
        shift_code: shiftCode,
        material_numbers: materialNumbers
      }).then(function (j) {
        if (!j || !j.success) {
          MatIssueApp.toast('danger', '寫入失敗', j && j.error ? j.error : 'issue_shift_save');
          return;
        }
        var updated = (j.data && j.data.updated_items) ? j.data.updated_items : 0;
        MatIssueApp.toast('success', '已補齊', '已回填 ' + String(updated) + ' 筆明細', 2600);
        MatIssueApp.refreshAll(true);
      });
    }
  };

  global.MatIssueShift = Mod;

})(window);
