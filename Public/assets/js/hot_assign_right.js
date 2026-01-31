/* Path: Public/assets/js/hot_assign_right.js
 * 說明: 活電工具配賦｜右側明細（table tbody 渲染）
 * - 對齊 DOM：#tbHotAssign、#hotActiveVehLabel
 * - 支援：解除單筆（開 modal 二次確認）
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

  var Mod = {
    app: null,
    els: { tb: null, label: null },

    init: function (app) {
      this.app = app || null;
      this.els.tb = qs('#tbHotAssign');
      this.els.label = qs('#hotActiveVehLabel');

      var self = this;
      if (this.els.tb) {
        this.els.tb.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest ? e.target.closest('[data-act="tool-unassign"]') : null;
          if (!btn) return;
          e.preventDefault();

          var tid = Number(btn.getAttribute('data-tool-id') || 0);
          if (!tid || !self.app) return;
          if (!global.HotAssignModals) return;

          var meta = btn.getAttribute('data-tool-meta') || '';
          global.HotAssignModals.openToolUnassign(tid, meta);
        });
      }
    },

    render: function (vehicleLabel, vehicleId, rows) {
      if (this.els.label) this.els.label.textContent = vehicleLabel || '未選取車輛';
      if (!this.els.tb) return;

      vehicleId = Number(vehicleId || 0);
      rows = rows || [];

      if (!vehicleId) {
        this.els.tb.innerHTML = '<tr class="hot-empty"><td colspan="5">請先選取左側車輛</td></tr>';
        return;
      }

      if (!rows.length) {
        this.els.tb.innerHTML = '<tr class="hot-empty"><td colspan="5">此車目前沒有配賦工具</td></tr>';
        return;
      }

      var html = '';
      rows.forEach(function (r) {
        r = r || {};
        var tid = Number(r.id || 0);
        var cat = (r.item_code ? (r.item_code + '｜') : '') + (r.item_name || '');
        var meta = cat + '｜' + (r.tool_no || '');

        html += ''
          + '<tr>'
          + '  <td>' + esc(cat) + '</td>'
          + '  <td>' + esc(r.tool_no || '') + '</td>'
          + '  <td>' + esc(r.inspect_date || '') + '</td>'
          + '  <td>' + esc(r.note || '') + '</td>'
          + '  <td>'
          + '    <span class="hot-row__act">'
          + '      <button type="button" class="btn btn--danger" data-act="tool-unassign" data-tool-id="' + tid + '" data-tool-meta="' + esc(meta) + '">解除配賦</button>'
          + '    </span>'
          + '  </td>'
          + '</tr>';
      });

      this.els.tb.innerHTML = html;
    }
  };

  global.HotAssignRight = Mod;

})(window);
