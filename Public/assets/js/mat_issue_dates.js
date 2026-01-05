/* Path: Public/assets/js/mat_issue_dates.js
 * 說明: 日期膠囊（withdraw_date 列表）
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

    init: function (app) {
      this.app = app;
    },

    loadDates: function () {
      if (!global.apiGet) return;
      apiGet('/api/mat/issue_dates').then(function (j) {
        if (!j || !j.success) {
          if (global.MatIssueApp) MatIssueApp.toast('danger', '載入失敗', j && j.error ? j.error : 'issue_dates');
          return;
        }

        var dates = (j.data && j.data.dates) ? j.data.dates : [];
        Mod.render(dates);
      });
    },

    render: function (dates) {
      var root = this.app && this.app.els ? this.app.els.dates : null;
      if (!root) return;

      var cur = (this.app && this.app.state) ? this.app.state.withdraw_date : '';
      if (!dates || !dates.length) {
        root.innerHTML = '<div class="mi-note">尚無匯入資料</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < dates.length; i++) {
        var d = dates[i];
        var active = (d === cur) ? ' is-active' : '';
        html += '<div class="mi-pill' + active + '" data-date="' + escapeHtml(d) + '">' + escapeHtml(d) + '</div>';
      }
      root.innerHTML = html;

      var pills = root.querySelectorAll('.mi-pill');
      for (var k = 0; k < pills.length; k++) {
        pills[k].addEventListener('click', function () {
          var d = this.getAttribute('data-date') || '';
          if (global.MatIssueApp) MatIssueApp.setWithdrawDate(d);
          // highlight
          Mod.render(dates);
        });
      }
    }
  };

  global.MatIssueDates = Mod;

})(window);
