/* Path: Public/assets/js/hot_assign_left.js
 * 說明: 活電工具配賦｜左側車輛清單（table tbody 渲染）
 * - 對齊 DOM：#tbHotVeh
 * - 支援：選取 active、編輯模式顯示「解除全部配賦」
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function pill(isActive) {
    if (Number(isActive || 0) === 0) return '<span class="hot-pill hot-pill--off">停用</span>';
    return '<span class="hot-pill">使用中</span>';
  }

  var Mod = {
    app: null,
    els: { tb: null },

    init: function (app) {
      this.app = app || null;
      this.els.tb = qs('#tbHotVeh');

      var self = this;

      if (this.els.tb) {
        this.els.tb.addEventListener('click', function (e) {
          var delBtn = e.target && e.target.closest ? e.target.closest('[data-act="veh-unassign-all"]') : null;
          if (delBtn) {
            e.preventDefault();
            e.stopPropagation();
            var vid = Number(delBtn.getAttribute('data-vehicle-id') || 0);
            if (!vid || !self.app) return;
            if (!global.HotAssignModals) return;
            global.HotAssignModals.openVehDelete(vid);
            return;
          }

          var tr = e.target && e.target.closest ? e.target.closest('tr[data-vehicle-id]') : null;
          if (!tr) return;
          var id = Number(tr.getAttribute('data-vehicle-id') || 0);
          if (!id || !self.app) return;
          self.app.setActiveVehicle(id, true);
        });
      }
    },

    render: function (vehicles, activeId, editMode) {
      if (!this.els.tb) return;

      vehicles = vehicles || [];
      activeId = Number(activeId || 0);
      editMode = !!editMode;

      if (!vehicles.length) {
        this.els.tb.innerHTML = '<tr class="hot-empty"><td colspan="5">尚無配賦車輛</td></tr>';
        return;
      }

      var html = '';
      vehicles.forEach(function (v) {
        v = v || {};
        var vid = Number(v.id || 0);
        var active = (vid && vid === activeId) ? ' is-active' : '';
        var cnt = Number(v.assigned_cnt || 0);

        html += ''
          + '<tr class="hot-row' + active + '" data-vehicle-id="' + vid + '">'
          + '  <td>' + esc(v.vehicle_code || '') + '</td>'
          + '  <td>' + esc(v.plate_no || '') + '</td>'
          + '  <td>' + pill(v.is_active) + '</td>'
          + '  <td>' + cnt + '</td>'
          + '  <td>'
          + (editMode
            ? ('<span class="hot-row__act">'
              + '<button type="button" class="hot-row__del" data-act="veh-unassign-all" data-vehicle-id="' + vid + '">解除</button>'
              + '</span>')
            : ''
          )
          + '  </td>'
          + '</tr>';
      });

      this.els.tb.innerHTML = html;
    }
  };

  global.HotAssignLeft = Mod;

})(window);
