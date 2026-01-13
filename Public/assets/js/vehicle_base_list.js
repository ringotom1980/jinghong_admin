/* Path: Public/assets/js/vehicle_base_list.js
 * 說明: 列表渲染 + 選取狀態
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,
    els: {},

    init: function (app) {
      this.app = app;
      this.els.tbody = app.els.listTbody;
    },

    render: function (rows) {
      rows = rows || [];
      if (!this.els.tbody) return;

      if (!rows.length) {
        this.els.tbody.innerHTML = '<tr><td colspan="4" class="vb-empty">沒有資料</td></tr>';
        return;
      }

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var id = r.id;
        var code = esc(r.vehicle_code || '');
        var plate = esc(r.plate_no || '');
        var user = esc(r.user_name || r.owner_name || '');
        var on = (String(r.is_active) === '1');

        html += ''
          + '<tr data-id="' + esc(String(id)) + '">'
          + '  <td><strong>' + code + '</strong></td>'
          + '  <td>' + (plate || '<span style="color:rgba(15,23,42,.45);">—</span>') + '</td>'
          + '  <td>' + (user || '<span style="color:rgba(15,23,42,.45);">—</span>') + '</td>'
          + '  <td>' + (on ? '<span class="vb-status vb-status--on">使用中</span>' : '<span class="vb-status vb-status--off">停用</span>') + '</td>'
          + '</tr>';
      }

      this.els.tbody.innerHTML = html;

      var self = this;
      var trs = this.els.tbody.querySelectorAll('tr[data-id]');
      Array.prototype.forEach.call(trs, function (tr) {
        tr.addEventListener('click', function () {
          var id = tr.getAttribute('data-id');
          if (!id) return;
          if (self.app && self.app.selectVehicle) self.app.selectVehicle(id);
        });
      });

      // keep active highlight
      this.setActive(this.app && this.app.state ? this.app.state.currentId : null);
    },

    renderError: function (msg) {
      if (!this.els.tbody) return;
      this.els.tbody.innerHTML = '<tr><td colspan="4" class="vb-empty">' + esc(msg || '載入失敗') + '</td></tr>';
    },

    setActive: function (id) {
      if (!this.els.tbody) return;
      var trs = this.els.tbody.querySelectorAll('tr[data-id]');
      Array.prototype.forEach.call(trs, function (tr) {
        tr.classList.toggle('is-active', id && tr.getAttribute('data-id') === String(id));
      });
    }
  };

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.VehicleBaseList = Mod;

})(window);
