/* Path: Public/assets/js/mat_issue.js
 * 說明: /mat/issue 總控（狀態/初始化/協調子模組/統一 toast+modal）
 * ✅ 新增：last_import_batch_ids（本次匯入範圍）
 * ✅ 新增：列表標題顯示「日期-領退清單」（跟隨 withdraw_date）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var App = {
    state: {
      withdraw_date: '',
      selected_batch_id: null,
      missing: [],
      personnel: [],

      // ✅ 本次匯入 batch 範圍（匯入後立即用這個查缺班別）
      last_import_batch_ids: []
    },

    els: {},

    init: function () {
      this.els.date = qs('#miWithdrawDate');
      this.els.files = qs('#miFiles');
      this.els.btnImport = qs('#miBtnImport');
      this.els.dates = qs('#miDates');
      this.els.batches = qs('#miBatches');
      this.els.missing = qs('#miMissing');
      this.els.btnOpenShift = qs('#miBtnOpenShift'); // 可能已移除（沒關係）

      // ✅ 批次清單標題（改成「日期-領退清單」）
      this.els.issueListTitle = qs('#miIssueListTitle');

      if (this.els.btnImport) {
        this.els.btnImport.addEventListener('click', function () {
          MatIssueImport.doImport();
        });
      }
      if (this.els.btnOpenShift) {
        this.els.btnOpenShift.addEventListener('click', function () {
          MatIssueShift.openShiftModal();
        });
      }

      // default date = today
      if (this.els.date && !this.els.date.value) {
        var d = new Date();
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        this.els.date.value = yyyy + '-' + mm + '-' + dd;
      }

      this.state.withdraw_date = (this.els.date && this.els.date.value) ? this.els.date.value : '';

      if (global.MatIssueDates) MatIssueDates.init(this);
      if (global.MatIssueBatches) MatIssueBatches.init(this);
      if (global.MatIssueShift) MatIssueShift.init(this);
      if (global.MatIssueImport) MatIssueImport.init(this);

      // ✅ 初次也先更新一次標題
      this.updateIssueListTitle();

      this.refreshAll(false);
    },

    // ✅ 標題：YYYY-MM-DD - 領退清單
    updateIssueListTitle: function () {
      if (!this.els.issueListTitle) return;

      var d = (this.state && this.state.withdraw_date) ? String(this.state.withdraw_date) : '';
      if (d) {
        this.els.issueListTitle.textContent = d + ' - 領退清單';
      } else {
        this.els.issueListTitle.textContent = '日期-領退清單';
      }
    },

    setWithdrawDate: function (dateStr) {
      this.state.withdraw_date = dateStr || '';
      if (this.els.date) this.els.date.value = this.state.withdraw_date;

      // ✅ 切日期時同步更新標題
      this.updateIssueListTitle();

      // 切日期時：這不是「本次匯入」了，所以清掉 last_import_batch_ids（避免誤用）
      this.state.last_import_batch_ids = [];

      if (global.MatIssueBatches) MatIssueBatches.loadBatches();
      if (global.MatIssueShift) MatIssueShift.loadMissing();
    },

    refreshAll: function (keepDate) {
      if (!keepDate && this.els.date) {
        this.state.withdraw_date = this.els.date.value || '';
      }

      // ✅ refresh 也同步更新標題（避免手動改 date input 後未更新）
      this.updateIssueListTitle();

      // refreshAll 也視為一般刷新，不強制使用本次匯入
      if (global.MatIssueDates) MatIssueDates.loadDates();
      if (global.MatIssueBatches) MatIssueBatches.loadBatches();
      if (global.MatIssueShift) MatIssueShift.loadMissing();
    },

    toast: function (type, title, message, duration) {
      if (global.Toast && Toast.show) {
        Toast.show({ type: type, title: title, message: message, duration: duration });
      }
    },

    confirm: function (title, message, onConfirm) {
      if (global.Modal && Modal.confirm) {
        Modal.confirm(title, message, onConfirm);
      }
    },
  };

  global.MatIssueApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
