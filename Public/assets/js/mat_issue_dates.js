/* Path: Public/assets/js/mat_issue_dates.js
 * 說明: 日期膠囊（withdraw_date 列表）
 * ✅ 追加：依月份分組顯示（只增加小標題，不破壞原本膠囊樣式）
 */

(function (global) {
  'use strict';

  function escapeHtml(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function getMonthKey(dateStr) {
    // expect YYYY-MM-DD
    if (!dateStr || typeof dateStr !== 'string') return '';
    if (dateStr.length >= 7) return dateStr.slice(0, 7); // YYYY-MM
    return '';
  }

  function formatMonthTitle(monthKey) {
    // monthKey: YYYY-MM -> YYYY年MM月
    if (!monthKey || monthKey.length !== 7) return monthKey || '';
    var y = monthKey.slice(0, 4);
    var m = monthKey.slice(5, 7);
    return y + '年' + m + '月';
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

      // ✅ 分組：YYYY-MM -> dates[]
      var groups = {};
      var order = []; // keep month order as they appear (dates are usually DESC already)
      for (var i = 0; i < dates.length; i++) {
        var d = String(dates[i] || '');
        if (!d) continue;
        var mk = getMonthKey(d) || '未知月份';
        if (!groups[mk]) {
          groups[mk] = [];
          order.push(mk);
        }
        groups[mk].push(d);
      }

      var html = '';
      for (var oi = 0; oi < order.length; oi++) {
        var monthKey = order[oi];
        var monthTitle = formatMonthTitle(monthKey);

        html += ''
          + '<div class="mi-month">'
          + '  <div class="mi-month__title">' + escapeHtml(monthTitle) + '</div>'
          + '  <div class="mi-month__pills">';

        var arr = groups[monthKey] || [];
        for (var j = 0; j < arr.length; j++) {
          var dd = arr[j];
          var active = (dd === cur) ? ' is-active' : '';
          html += '<div class="mi-pill' + active + '" data-date="' + escapeHtml(dd) + '">' + escapeHtml(dd) + '</div>';
        }

        html += ''
          + '  </div>'
          + '</div>';
      }

      root.innerHTML = html;

      // bind click
      var pills = root.querySelectorAll('.mi-pill');
      for (var k = 0; k < pills.length; k++) {
        pills[k].addEventListener('click', function () {
          var d = this.getAttribute('data-date') || '';
          if (global.MatIssueApp) MatIssueApp.setWithdrawDate(d);
          // highlight（用原 dates 重新 render，保留分組）
          Mod.render(dates);
        });
      }
    }
  };

  global.MatIssueDates = Mod;

})(window);
