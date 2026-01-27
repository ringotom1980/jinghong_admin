/* Path: Public/assets/js/hot_assign_left.js
 * 說明: 活電工具配賦｜左側車輛清單（僅顯示有配賦的車）
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
      var host = app && app.els ? app.els.leftWrap : null;
      if (!host) return;

      host.addEventListener('click', this.onClick.bind(this));
    },

    render: function (vehicles, activeId) {
      var host = this.app && this.app.els ? this.app.els.leftWrap : null;
      if (!host) return;

      vehicles = vehicles || [];
      activeId = Number(activeId || 0);

      if (!vehicles.length) {
        host.innerHTML = '<div class="ha-empty">尚無配賦車輛</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < vehicles.length; i++) {
        var v = vehicles[i] || {};
        var vid = Number(v.vehicle_id || 0);
        var active = (vid && vid === activeId) ? ' is-active' : '';
        var cnt = Number(v.assigned_count || 0);

        html += ''
          + '<button type="button" class="ha-veh' + active + '" data-vehicle-id="' + vid + '">'
          + '  <div class="ha-veh__title">' + esc(v.vehicle_label || '') + '</div>'
          + '  <div class="ha-veh__meta">配賦 ' + cnt + ' 件</div>'
          + '</button>';
      }

      host.innerHTML = html;
    },

    onClick: function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-vehicle-id]') : null;
      if (!btn) return;

      var id = Number(btn.getAttribute('data-vehicle-id') || 0);
      if (!id) return;
      if (!this.app) return;

      if (id === this.app.state.activeVehicleId) return;

      this.app.state.activeVehicleId = id;
      this.app.setActiveVehicle(id);
      this.app.loadVehicleTools(id);
    }
  };

  global.HotAssignLeft = Mod;

})(window);
