/* Path: Public/assets/js/hot_assign_right.js
 * 說明: 活電工具配賦｜右側明細（VIEW / EDIT 模式）
 * - 對齊 DOM：#tbHotAssign、#hotActiveVehLabel
 * - VIEW：純顯示
 * - EDIT：日期可編輯 + 列動作（移轉 / 解除）
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
      if (!this.els.tb) return;

      /* === click events（移轉 / 解除） === */
      this.els.tb.addEventListener('click', function (e) {
        var btnUn = e.target && e.target.closest ? e.target.closest('[data-act="tool-unassign"]') : null;
        if (btnUn) {
          e.preventDefault();
          if (!global.HotAssignModals || !self.app) return;

          var tid = Number(btnUn.getAttribute('data-tool-id') || 0);
          if (!tid) return;

          var meta = btnUn.getAttribute('data-tool-meta') || '';
          global.HotAssignModals.openToolUnassign(tid, meta);
          return;
        }

        var btnMv = e.target && e.target.closest ? e.target.closest('[data-act="tool-transfer"]') : null;
        if (btnMv) {
          e.preventDefault();
          if (!global.HotAssignModals || !self.app) return;

          var tid2 = Number(btnMv.getAttribute('data-tool-id') || 0);
          if (!tid2) return;

          var meta2 = btnMv.getAttribute('data-tool-meta') || '';
          var curVid = Number(self.app.state.activeVehicleId || 0);
          global.HotAssignModals.openToolTransfer(tid2, meta2, curVid);
          return;
        }
      });

      /* === change event（EDIT 模式：日期變更） === */
      this.els.tb.addEventListener('change', function (e) {
        // 檢驗日期
        var inp = e.target && e.target.closest ? e.target.closest('[data-act="inspect-change"]') : null;
        if (inp && self.app) {
          var tid = Number(inp.getAttribute('data-tool-id') || 0);
          if (!tid) return;

          var v = String(inp.value || '');
          if (!self.app.state.rightDraft) self.app.state.rightDraft = {};
          if (!self.app.state.rightDraft[tid]) self.app.state.rightDraft[tid] = {};
          self.app.state.rightDraft[tid].inspect_date = v;
          self.app.state.rightDirty = true;
          return;
        }

        // 更換日期
        var inp2 = e.target && e.target.closest ? e.target.closest('[data-act="replace-change"]') : null;
        if (!inp2 || !self.app) return;

        var tid2 = Number(inp2.getAttribute('data-tool-id') || 0);
        if (!tid2) return;

        var v2 = String(inp2.value || '');
        if (!self.app.state.rightDraft) self.app.state.rightDraft = {};
        if (!self.app.state.rightDraft[tid2]) self.app.state.rightDraft[tid2] = {};
        self.app.state.rightDraft[tid2].replace_date = v2;
        self.app.state.rightDirty = true;
      });
    },

    render: function (vehicleLabel, vehicleId, rows, editMode, draftDates) {
      editMode = !!editMode;
      draftDates = draftDates || {};

      if (this.els.label) {
        this.els.label.textContent = vehicleLabel || '未選取車輛';
      }
      if (!this.els.tb) return;

      vehicleId = Number(vehicleId || 0);
      rows = rows || [];

      if (!vehicleId) {
        this.els.tb.innerHTML =
          '<tr class="hot-empty"><td colspan="5">請先選取左側車輛</td></tr>';
        return;
      }

      if (!rows.length) {
        this.els.tb.innerHTML =
          '<tr class="hot-empty"><td colspan="5">此車目前沒有配賦工具</td></tr>';
        return;
      }

      var html = '';
      rows.forEach(function (r) {
        r = r || {};
        var tid = Number(r.id || 0);
        var cat = (r.item_code ? (r.item_code + '｜') : '') + (r.item_name || '');
        var meta = cat + '｜' + (r.tool_no || '');

        // draftDates[tid] 兼容：
        // - 舊：'YYYY-MM-DD'
        // - 新：{inspect_date:'', replace_date:''}
        var d = (draftDates && draftDates[tid] !== undefined) ? draftDates[tid] : null;

        var inspectVal = '';
        var replaceVal = '';

        if (d && typeof d === 'object') {
          inspectVal = String(d.inspect_date || '');
          replaceVal = String(d.replace_date || '');
        } else if (d !== null) {
          // 舊版：只有 inspect_date
          inspectVal = String(d || '');
          replaceVal = '';
        } else {
          inspectVal = String(r.inspect_date || '');
          replaceVal = String(r.replace_date || '');
        }

        html += ''
          + '<tr>'
          + '  <td>' + esc(cat) + '</td>'
          + '  <td>' + esc(r.tool_no || '') + '</td>'

          // 檢驗日期
          + '  <td>'
          + (editMode
            ? '<input type="date" class="input" data-act="inspect-change" data-tool-id="' + tid + '" value="' + esc(inspectVal) + '">'
            : esc(r.inspect_date || '')
          )
          + '  </td>'

          // 更換日期（第 4 欄改為 replace_date）
          + '  <td>'
          + (editMode
            ? '<input type="date" class="input" data-act="replace-change" data-tool-id="' + tid + '" value="' + esc(replaceVal) + '">'
            : esc(r.replace_date || '')
          )
          + '  </td>'

          + '  <td>'
          + (editMode
            ? '<span class="hot-row__act">'
            + '<button type="button" class="btn btn--info" data-act="tool-transfer" data-tool-id="' + tid + '" data-tool-meta="' + esc(meta) + '">移轉</button>'
            + '<button type="button" class="btn btn--danger" data-act="tool-unassign" data-tool-id="' + tid + '" data-tool-meta="' + esc(meta) + '">解除</button>'
            + '</span>'
            : ''
          )
          + '  </td>'
          + '</tr>';
      });

      this.els.tb.innerHTML = html;
    }
  };

  global.HotAssignRight = Mod;

})(window);
