/* Path: Public/assets/js/mat_issue_import.js
 * 說明: 匯入（多檔上傳 + 顯示結果）
 * ✅ 匯入完成後：
 * - 保留 summary toast
 * - 取得 batch_ids 存到 App.state.last_import_batch_ids
 * - 若 has_missing_shift → 立刻以 batch_ids 範圍查缺漏並自動彈出補班別 modal（必填才可關閉）
 */

(function (global) {
  'use strict';

  var Mod = {
    app: null,

    init: function (app) { this.app = app; },

    doImport: function () {
      if (!global.apiPostForm) return;

      var d = this.app && this.app.els && this.app.els.date ? (this.app.els.date.value || '') : '';
      if (!d) {
        MatIssueApp.toast('warning', '缺少日期', '請先選擇領退日期');
        return;
      }

      var input = this.app && this.app.els ? this.app.els.files : null;
      if (!input || !input.files || !input.files.length) {
        MatIssueApp.toast('warning', '未選檔案', '請先選擇要匯入的 Excel 檔案');
        return;
      }

      var btn = (this.app && this.app.els) ? this.app.els.btnImport : null;
      if (btn) {
        btn.classList.add('is-loading');
        btn.disabled = true;
      }

      var fd = new FormData();
      fd.append('withdraw_date', d);
      for (var i = 0; i < input.files.length; i++) {
        fd.append('files[]', input.files[i]);
      }

      apiPostForm('/api/mat/issue_import', fd)
        .then(function (j) {
          if (!j || !j.success) {
            MatIssueApp.toast('danger', '匯入失敗', j && j.error ? j.error : 'issue_import');
            return;
          }

          var r = j.data || {};
          var sum = r.summary || {};
          var msg = ''
            + '完成：成功 ' + String(sum.inserted || 0)
            + '、略過 ' + String(sum.skipped || 0)
            + '、錯誤 ' + String(sum.errors || 0);

          MatIssueApp.toast('success', '匯入完成', msg, 2600);
          // ✅ (1) 匯入成功後清空檔案 input（避免殘留、避免重複送出同一批檔案）
          var fileInput = Mod.app && Mod.app.els ? Mod.app.els.files : null;
          if (fileInput) {
            try { fileInput.value = ''; } catch (e) { }
          }

          // ✅ 存本次匯入 batch_ids（本次匯入範圍）
          var batchIds = r.batch_ids || [];
          if (Mod.app && Mod.app.state) {
            Mod.app.state.last_import_batch_ids = batchIds;
          }

          // ✅ (2) 匯入成功後：聚焦到本次匯入日期（讓日期膠囊高亮、領退清單立刻看到剛匯入的資料）
          if (global.MatIssueApp && MatIssueApp.setWithdrawDate) {
            MatIssueApp.setWithdrawDate(d); // d 就是本次匯入使用者選的 withdraw_date
          }

          // 仍保留 refresh：讓日期膠囊重新載入並高亮、批次清單同步刷新
          MatIssueApp.refreshAll(true);

          // ✅ 若有缺 shift → 以「本次匯入 batch 範圍」查缺漏，並自動彈窗要求補齊
          if (r.has_missing_shift && global.MatIssueShift && MatIssueShift.loadMissing) {
            MatIssueShift.loadMissing({
              batch_ids: batchIds,
              autoOpen: true
            });
          }
        })
        .catch(function (err) {
          MatIssueApp.toast('danger', '匯入失敗', (err && err.message) ? err.message : 'network_error');
        })
        .finally(function () {
          if (btn) {
            btn.classList.remove('is-loading');
            btn.disabled = false;
          }
        });
    }
  };

  global.MatIssueImport = Mod;

})(window);
