/* Path: Public/assets/js/mat_issue_shift.js
 * 說明: 缺 shift 補齊（匯入後強制彈出 Modal：逐筆指定、必填才可關閉）
 *
 * ✅ 定版：
 * - 缺 shift 的每個「唯一 material_number」顯示一列：
 *   material_number / material_name / 下拉選單（A-鄭建昇...）
 * - 每列必選 shift_code 才能儲存
 * - 儲存成功：
 *   1) 更新本次 batch_ids 範圍內、shift 空白的 mat_issue_items.shift
 *   2) upsert mat_materials(material_number, material_name, shift)
 * - 儲存後自動關閉 modal
 */

(function (global) {
  'use strict';

  function escapeHtml(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function uniqByMaterial(rows) {
    var map = {};
    var out = [];
    for (var i = 0; i < (rows || []).length; i++) {
      var r = rows[i] || {};
      var mn = String(r.material_number || '');
      if (!mn) continue;
      if (map[mn]) continue;
      map[mn] = true;
      out.push(r);
    }
    return out;
  }

  var Mod = {
    app: null,
    _lastQueryBatchIds: [],

    init: function (app) { this.app = app; },

    /**
     * opts:
     * - batch_ids: []  （可選；有值就查「本次匯入範圍」）
     * - autoOpen: true（可選；查完若有缺漏就自動彈窗）
     */
    loadMissing: function (opts) {
      if (!global.apiGet) return;
      opts = opts || {};

      var d = (this.app && this.app.state) ? this.app.state.withdraw_date : '';
      if (!d) return;

      var batchIds = opts.batch_ids || [];
      this._lastQueryBatchIds = batchIds;

      var url = '/api/mat/issue_missing_shifts?withdraw_date=' + encodeURIComponent(d);
      if (batchIds && batchIds.length) {
        url += '&batch_ids=' + encodeURIComponent(batchIds.join(','));
      }

      apiGet(url).then(function (j) {
        if (!j || !j.success) {
          if (global.MatIssueApp) MatIssueApp.toast('danger', '載入失敗', j && j.error ? j.error : 'issue_missing_shifts');
          return;
        }

        var missing = (j.data && j.data.missing) ? j.data.missing : [];
        var personnel = (j.data && j.data.personnel) ? j.data.personnel : [];

        // 去重（material_number）
        missing = uniqByMaterial(missing);

        if (Mod.app && Mod.app.state) {
          Mod.app.state.missing = missing;
          Mod.app.state.personnel = personnel;
        }

        // 匯入後頁面已移除缺漏區塊：這裡不 render 卡片，只在需要時彈窗
        if (opts.autoOpen && missing.length) {
          Mod.openShiftModal({
            batch_ids: batchIds,
            force: true
          });
        }
      });
    },

    openShiftModal: function (opts) {
      opts = opts || {};
      var d = (this.app && this.app.state) ? this.app.state.withdraw_date : '';
      if (!d) {
        MatIssueApp.toast('warning', '尚未選日期', '請先選擇領退日期');
        return;
      }

      var missing = (this.app && this.app.state) ? (this.app.state.missing || []) : [];
      if (!missing.length) {
        if (!opts.force) MatIssueApp.toast('info', '無缺漏', '目前沒有缺 shift 需要補齊');
        return;
      }

      var personnel = (this.app && this.app.state) ? (this.app.state.personnel || []) : [];
      var batchIds = opts.batch_ids || this._lastQueryBatchIds || (this.app && this.app.state ? this.app.state.last_import_batch_ids : []) || [];

      // options html
      var optHtml = '<option value="">（請選擇）</option>';
      for (var i = 0; i < personnel.length; i++) {
        var p = personnel[i];
        var label = (p.shift_code || '') + '-' + (p.person_name || '');
        optHtml += '<option value="' + escapeHtml(p.shift_code) + '">' + escapeHtml(label) + '</option>';
      }

      var rowsHtml = '';
      for (var k = 0; k < missing.length; k++) {
        var m = missing[k] || {};
        var mn = String(m.material_number || '');
        var mname = String(m.material_name || '');

        rowsHtml += ''
          + '<div class="mi-shift-row" data-mn="' + escapeHtml(mn) + '">'
          + '  <div class="mi-shift-col mi-shift-col--mn">'
          + '    <div class="mi-modal-code">' + escapeHtml(mn) + '</div>'
          + '  </div>'
          + '  <div class="mi-shift-col mi-shift-col--name">'
          + '    <div class="mi-modal-name">' + escapeHtml(mname) + '</div>'
          + '  </div>'
          + '  <div class="mi-shift-col mi-shift-col--sel">'
          + '    <select class="mi-shift-sel">' + optHtml + '</select>'
          + '  </div>'
          + '</div>';
      }

      var html = ''
        + '<div class="mi-modal-grid">'
        + '  <div class="mi-shift-head">本次匯入以下材料缺班別，必須逐筆指定後才能儲存。</div>'
        + '  <div class="mi-shift-list">' + rowsHtml + '</div>'
        + '</div>';

      // ✅ 使用 Modal.open 的 confirm 按鈕作為「儲存」
      //    透過 ui_modal.js 的 onConfirm return false → 阻止關閉（直到儲存成功才手動 close）
      Modal.open({
        title: '請選擇班別',
        html: html,
        confirmText: '儲存',
        closeOnBackdrop: false,
        closeOnEsc: false,
        allowCloseBtn: false,
        onConfirm: function () {
          // 驗證 + 儲存（異步）→ 這裡一律 return false，不讓 modal 自己關
          Mod._saveFromModal(batchIds);
          return false;
        }
      });
    },

    _saveFromModal: function (batchIds) {
      if (!global.apiPost) return;

      var d = (this.app && this.app.state) ? this.app.state.withdraw_date : '';
      if (!d) return;

      var root = document.querySelector('.mi-shift-list');
      if (!root) return;

      var rows = root.querySelectorAll('.mi-shift-row');
      if (!rows || !rows.length) return;

      var items = [];
      var ok = true;

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var mn = row.getAttribute('data-mn') || '';
        var sel = row.querySelector('.mi-shift-sel');
        var code = sel ? (sel.value || '') : '';

        if (!code) {
          ok = false;
          // 提示：第一個未選者 focus
          if (sel) sel.focus();
          break;
        }

        // 取 material_name（直接從 DOM 取顯示字串）
        var nameEl = row.querySelector('.mi-modal-name');
        var mname = nameEl ? (nameEl.textContent || '') : '';

        items.push({
          material_number: mn,
          material_name: mname,
          shift_code: code
        });
      }

      if (!ok) {
        MatIssueApp.toast('warning', '尚未完成', '每一筆都必須選擇班別承辦人');
        return;
      }

      // 去重（以 material_number）
      var seen = {};
      var uniq = [];
      for (var k = 0; k < items.length; k++) {
        var it = items[k];
        if (!it.material_number) continue;
        if (seen[it.material_number]) continue;
        seen[it.material_number] = true;
        uniq.push(it);
      }

      apiPost('/api/mat/issue_shift_save', {
        withdraw_date: d,
        batch_ids: batchIds || [],
        items: uniq
      }).then(function (j) {
        if (!j || !j.success) {
          MatIssueApp.toast('danger', '寫入失敗', j && j.error ? j.error : 'issue_shift_save');
          return;
        }

        var updated = (j.data && j.data.updated_items) ? j.data.updated_items : 0;
        var uniqCnt = (j.data && j.data.unique_materials) ? j.data.unique_materials : uniq.length;

        MatIssueApp.toast('success', '已補齊', '已完成 ' + String(uniqCnt) + ' 筆材料設定，回填明細 ' + String(updated) + ' 筆', 2600);

        // ✅ 關閉 modal（此時才關）
        if (global.Modal && Modal.close) Modal.close();

        // 一般刷新（不再用本次匯入限定）
        if (Mod.app && Mod.app.state) {
          Mod.app.state.last_import_batch_ids = [];
        }
        MatIssueApp.refreshAll(true);
      });
    }
  };

  global.MatIssueShift = Mod;

})(window);
