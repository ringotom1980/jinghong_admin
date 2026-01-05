/* Path: Public/assets/js/mat_issue_import.js
 * 說明: 匯入（多檔上傳 + 顯示結果）
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

      var fd = new FormData();
      fd.append('withdraw_date', d);
      for (var i = 0; i < input.files.length; i++) {
        fd.append('files[]', input.files[i]);
      }

      MatIssueApp.setResultText('匯入中…');

      apiPostForm('/api/mat/issue_import', fd).then(function (j) {
        if (!j || !j.success) {
          MatIssueApp.setResultText('');
          MatIssueApp.toast('danger', '匯入失敗', j && j.error ? j.error : 'issue_import');
          return;
        }

        var r = j.data || {};
        var sum = r.summary || {};
        var msg = ''
          + '完成：成功 ' + String(sum.inserted || 0)
          + '、略過 ' + String(sum.skipped || 0)
          + '、錯誤 ' + String(sum.errors || 0);

        MatIssueApp.setResultText(msg);
        MatIssueApp.toast('success', '匯入完成', msg, 2600);

        // 若有缺 shift，提示（缺漏清單會由 refreshAll 載入）
        if (r.has_missing_shift) {
          MatIssueApp.toast('warning', '需要補齊班別', '有缺 shift 的材料編號，請點「補齊班別」', 3200);
        }

        MatIssueApp.refreshAll(true);
      });
    }
  };

  global.MatIssueImport = Mod;

})(window);
