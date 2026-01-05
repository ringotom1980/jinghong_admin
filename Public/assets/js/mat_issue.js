/* Path: Public/assets/js/mat_issue.js
 * 說明: /mat/issue 總控（狀態/初始化/協調子模組/統一 toast+modal）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var App = {
    state: {
      withdraw_date: '',
      selected_batch_id: null,
      missing: [],
      personnel: []
    },

    els: {},

    init: function () {
      this.els.date = qs('#miWithdrawDate');
      this.els.files = qs('#miFiles');
      this.els.btnImport = qs('#miBtnImport');
      this.els.btnRefresh = qs('#miBtnRefresh');
      this.els.dates = qs('#miDates');
      this.els.batches = qs('#miBatches');
      this.els.missing = qs('#miMissing');
      this.els.btnOpenShift = qs('#miBtnOpenShift');
      this.els.result = qs('#miImportResult');

      if (this.els.btnImport) {
        this.els.btnImport.addEventListener('click', function () {
          MatIssueImport.doImport();
        });
      }
      if (this.els.btnRefresh) {
        this.els.btnRefresh.addEventListener('click', function () {
          App.refreshAll(true);
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

      // state date
      this.state.withdraw_date = (this.els.date && this.els.date.value) ? this.els.date.value : '';

      // submodules init
      if (global.MatIssueDates) MatIssueDates.init(this);
      if (global.MatIssueBatches) MatIssueBatches.init(this);
      if (global.MatIssueShift) MatIssueShift.init(this);
      if (global.MatIssueImport) MatIssueImport.init(this);

      // first load
      this.refreshAll(false);
    },

    setWithdrawDate: function (dateStr) {
      this.state.withdraw_date = dateStr || '';
      if (this.els.date) this.els.date.value = this.state.withdraw_date;

      // refresh dependent
      if (global.MatIssueBatches) MatIssueBatches.loadBatches();
      if (global.MatIssueShift) MatIssueShift.loadMissing();
    },

    refreshAll: function (keepDate) {
      if (!keepDate && this.els.date) {
        this.state.withdraw_date = this.els.date.value || '';
      }
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

    setResultText: function (text) {
      if (!this.els.result) return;
      this.els.result.textContent = text || '';
    }
  };

  global.MatIssueApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
