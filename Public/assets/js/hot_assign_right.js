/* Path: Public/assets/js/hot_assign_right.js
 * 說明: 活電工具配賦｜右側明細（該車的工具清單）
 */

(function (global) {
  'use strict';

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  var Mod = {
    app: null,

    init: function (app) {
      this.app = app;
    },

    render: function (vehicleId, rows) {
      var host = this.app && this.app.els ? this.app.els.rightWrap : null;
      if (!host) return;

      vehicleId = Number(vehicleId || 0);
      rows = rows || [];

      if (!vehicleId) {
        host.innerHTML = '<div class="ha-empty">請先選擇左側車輛</div>';
        return;
      }

      if (!rows.length) {
        host.innerHTML = '<div class="ha-empty">此車目前沒有配賦工具</div>';
        return;
      }

      var html = ''
        + '<table class="ha-table">'
        + '  <thead>'
        + '    <tr>'
        + '      <th>分類</th>'
        + '      <th>工具編號</th>'
        + '      <th>檢驗日</th>'
        + '      <th>備註</th>'
        + '    </tr>'
        + '  </thead>'
        + '  <tbody>';

      for (var i = 0; i < rows.length; i++) {
        var r = rows[i] || {};
        html += ''
          + '<tr>'
          + '  <td>' + esc((r.item_code ? r.item_code + '｜' : '') + (r.item_name || '')) + '</td>'
          + '  <td>' + esc(r.tool_no || '') + '</td>'
          + '  <td>' + esc(r.inspect_date || '') + '</td>'
          + '  <td>' + esc(r.note || '') + '</td>'
          + '</tr>';
      }

      html += '  </tbody></table>';

      host.innerHTML = html;
    }
  };

  global.HotAssignRight = Mod;

})(window);
