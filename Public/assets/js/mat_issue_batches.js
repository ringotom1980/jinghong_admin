/* Path: Public/assets/js/mat_issue_batches.js
 * 說明: 批次/檔名清單（依 withdraw_date）
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

    loadBatches: function () {
      if (!global.apiGet) return;

      var d = (this.app && this.app.state) ? this.app.state.withdraw_date : '';
      if (!d) {
        if (this.app) this.app.els.batches.innerHTML = '<div class="mi-note">請先選擇領退日期</div>';
        return;
      }

      apiGet('/api/mat/issue_files?withdraw_date=' + encodeURIComponent(d)).then(function (j) {
        if (!j || !j.success) {
          if (global.MatIssueApp) MatIssueApp.toast('danger', '載入失敗', j && j.error ? j.error : 'issue_files');
          return;
        }
        var rows = (j.data && j.data.batches) ? j.data.batches : [];
        Mod.render(rows);
      });
    },

    render: function (rows) {
      var root = this.app && this.app.els ? this.app.els.batches : null;
      if (!root) return;

      if (!rows || !rows.length) {
        root.innerHTML = '<div class="mi-note">此日期尚無批次</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        html += ''
          + '<div class="mi-batch" data-batch-id="' + escapeHtml(r.batch_id) + '">'
          + '  <div>'
          + '    <div class="mi-batch__name">' + escapeHtml(r.original_filename) + '</div>'
          + '    <div class="mi-batch__meta">'
          + '      <span>批次 #' + escapeHtml(r.batch_id) + '</span>'
          + '      <span>類型 ' + escapeHtml(r.file_type) + '</span>'
          + '      <span>' + escapeHtml(r.uploaded_at) + '</span>'
          + '      <span>筆數 ' + escapeHtml(r.items_count) + '</span>'
          + '    </div>'
          + '  </div>'
          + '  <div class="mi-batch__actions">'
          + '    <button class="btn btn--danger" type="button" data-act="delete">刪除整批</button>'
          + '  </div>'
          + '</div>';
      }
      root.innerHTML = html;

      var btns = root.querySelectorAll('button[data-act="delete"]');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function () {
          var box = this.closest('.mi-batch');
          if (!box) return;
          var batchId = box.getAttribute('data-batch-id');
          Mod.deleteBatch(batchId);
        });
      }
    },

    deleteBatch: function (batchId) {
      if (!batchId) return;
      if (!global.apiPost) return;

      MatIssueApp.confirm('確認刪除', '確定要刪除整批？（批次 #' + String(batchId) + '）', function () {
        apiPost('/api/mat/issue_delete', { batch_id: batchId }).then(function (j) {
          if (!j || !j.success) {
            MatIssueApp.toast('danger', '刪除失敗', j && j.error ? j.error : 'issue_delete');
            return;
          }
          MatIssueApp.toast('success', '已刪除', '批次 #' + String(batchId) + ' 已刪除', 2600);
          MatIssueApp.refreshAll(true);
        });
      });
    }
  };

  global.MatIssueBatches = Mod;

})(window);
