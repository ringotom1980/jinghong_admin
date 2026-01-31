/* Path: Public/assets/js/hot_assign.js
 * 說明: 活電工具配賦｜主控入口（A 路線：table/DOM 為真相）
 * - 職責：
 *   1) 綁定按鈕事件（新增/移轉/新增配賦）
 *   2) 提供 HotAssignModals 需要的 app 介面：state / loadAll() / getActiveVehicleLabel()
 *   3) 載入左表 vehicles 與右表 tools（依你後端 API 回傳結構渲染）
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

  function toast(type, title, message) {
    if (global.Toast && typeof global.Toast.show === 'function') {
      global.Toast.show({ type: type, title: title, message: message });
      return;
    }
    alert((title ? title + '\n' : '') + (message || ''));
  }

  function apiGet(url, params) {
    if (typeof global.apiGet === 'function') return global.apiGet(url, params);
    return Promise.resolve({ success: false, data: null, error: 'apiGet 不存在' });
  }

  // ===== App 主體（給 HotAssignModals 用）=====
  var App = {
    els: {},
    state: {
      vehicles: [],
      activeVehicleId: 0,
      tools: []
    },

    init: function () {
      // cache DOM
      this.els.tbVeh = qs('#tbHotVeh');
      this.els.tbAssign = qs('#tbHotAssign');
      this.els.activeVehLabel = qs('#hotActiveVehLabel');

      // buttons
      this.els.btnVehAdd = qs('#btnVehAdd');
      this.els.btnAssignAdd = qs('#btnAssignAdd');
      this.els.btnAssignMove = qs('#btnAssignMove');

      // ✅ 先把 Modal 模組初始化（最重要：把事件綁定起來）
      if (global.HotAssignModals && typeof global.HotAssignModals.init === 'function') {
        global.HotAssignModals.init(this);
      } else {
        toast('danger', '初始化失敗', 'HotAssignModals 未載入或缺 init()');
        return;
      }

      // ✅ 綁定按鈕 → 開 modal
      this.bindButtons();

      // 左表/右表事件（點車、解除、刪車）
      this.bindTables();

      // 首次載入
      this.loadAll(0);
    },

    bindButtons: function () {
      var self = this;

      if (self.els.btnVehAdd) {
        self.els.btnVehAdd.addEventListener('click', function () {
          global.HotAssignModals.openVehAdd();
        });
      }

      if (self.els.btnAssignAdd) {
        self.els.btnAssignAdd.addEventListener('click', function () {
          global.HotAssignModals.openAssignAdd();
        });
      }

      if (self.els.btnAssignMove) {
        self.els.btnAssignMove.addEventListener('click', function () {
          global.HotAssignModals.openAssignMove();
        });
      }
    },

    bindTables: function () {
      var self = this;

      // 點左表某台車 → 設為 active → 右表載入
      if (self.els.tbVeh) {
        self.els.tbVeh.addEventListener('click', function (e) {
          var tr = e.target && e.target.closest ? e.target.closest('tr[data-vehicle-id]') : null;
          if (!tr) return;

          var vid = Number(tr.getAttribute('data-vehicle-id') || 0);
          if (!vid) return;

          self.state.activeVehicleId = vid;
          self.renderActiveVehLabel();
          self.loadTools(vid);
        });

        // 左表：解除該車全部配賦（若你左表有放按鈕 class=js-veh-del）
        self.els.tbVeh.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest ? e.target.closest('.js-veh-del') : null;
          if (!btn) return;
          e.preventDefault();
          var tr = btn.closest('tr[data-vehicle-id]');
          var vid = tr ? Number(tr.getAttribute('data-vehicle-id') || 0) : 0;
          if (!vid) return;
          global.HotAssignModals.openVehDelete(vid);
        });
      }

      // 右表：解除單筆（若右表有放按鈕 class=js-tool-unassign data-tool-id data-meta）
      if (self.els.tbAssign) {
        self.els.tbAssign.addEventListener('click', function (e) {
          var btn = e.target && e.target.closest ? e.target.closest('.js-tool-unassign') : null;
          if (!btn) return;
          e.preventDefault();

          var tid = Number(btn.getAttribute('data-tool-id') || 0);
          var meta = btn.getAttribute('data-meta') || '';
          if (!tid) return;

          global.HotAssignModals.openToolUnassign(tid, meta);
        });
      }
    },

    // HotAssignModals 會呼叫
    loadAll: function (activeVehicleId) {
      var self = this;
      activeVehicleId = Number(activeVehicleId || 0);

      apiGet('/api/hot/assign', { action: 'init' }).then(function (j) {
        if (!j || !j.success) {
          toast('danger', '載入失敗', (j && j.error) ? j.error : 'init');
          return;
        }

        // 你後端回傳結構請對齊這裡：
        self.state.vehicles = (j.data && Array.isArray(j.data.vehicles)) ? j.data.vehicles : [];
        self.renderVehicles();

        // 決定 active 車
        if (activeVehicleId) {
          self.state.activeVehicleId = activeVehicleId;
        } else if (self.state.activeVehicleId) {
          // keep
        } else if (self.state.vehicles.length) {
          self.state.activeVehicleId = Number(self.state.vehicles[0].id || 0);
        } else {
          self.state.activeVehicleId = 0;
        }

        self.renderActiveVehLabel();

        if (self.state.activeVehicleId) self.loadTools(self.state.activeVehicleId);
        else self.renderToolsEmpty('請先選取左側車輛');
      });
    },

    loadTools: function (vehicleId) {
      var self = this;
      vehicleId = Number(vehicleId || 0);
      if (!vehicleId) {
        self.renderToolsEmpty('請先選取左側車輛');
        return;
      }

      apiGet('/api/hot/assign', { action: 'tools', vehicle_id: vehicleId }).then(function (j) {
        if (!j || !j.success) {
          toast('danger', '載入失敗', (j && j.error) ? j.error : 'tools');
          self.renderToolsEmpty('載入失敗');
          return;
        }

        self.state.tools = (j.data && Array.isArray(j.data.tools)) ? j.data.tools : [];
        self.renderTools();
      });
    },

    getActiveVehicleLabel: function () {
      var vid = Number(this.state.activeVehicleId || 0);
      if (!vid) return '未選取車輛';

      var v = this.state.vehicles.find(function (x) { return Number(x.id || 0) === vid; });
      if (!v) return '未選取車輛';

      var parts = [];
      if (v.vehicle_code) parts.push(String(v.vehicle_code));
      if (v.plate_no) parts.push(String(v.plate_no));
      var s = parts.join('｜');
      if (Number(v.is_active || 0) === 0) s += '（停用中）';
      return s || '未選取車輛';
    },

    renderActiveVehLabel: function () {
      if (this.els.activeVehLabel) this.els.activeVehLabel.textContent = this.getActiveVehicleLabel();
    },

    renderVehicles: function () {
      var tb = this.els.tbVeh;
      if (!tb) return;

      var rows = this.state.vehicles || [];
      if (!rows.length) {
        tb.innerHTML = '<tr class="hot-empty"><td colspan="5">尚無配賦車輛</td></tr>';
        return;
      }

      var html = '';
      rows.forEach(function (v) {
        v = v || {};
        var vid = Number(v.id || 0);
        if (!vid) return;

        var status = Number(v.is_active || 0) === 0 ? '停用' : '使用中';
        var cnt = Number(v.assigned_cnt || 0);

        html += ''
          + '<tr data-vehicle-id="' + vid + '">'
          + '  <td>' + esc(v.vehicle_code || '-') + '</td>'
          + '  <td>' + esc(v.plate_no || '-') + '</td>'
          + '  <td>' + esc(status) + '</td>'
          + '  <td>' + esc(String(cnt)) + '</td>'
          + '  <td>'
          + '    <button class="btn btn--ghost js-veh-del" type="button">解除</button>'
          + '  </td>'
          + '</tr>';
      });

      tb.innerHTML = html || '<tr class="hot-empty"><td colspan="5">尚無配賦車輛</td></tr>';
    },

    renderToolsEmpty: function (text) {
      var tb = this.els.tbAssign;
      if (!tb) return;
      tb.innerHTML = '<tr class="hot-empty"><td colspan="5">' + esc(text || '請先選取左側車輛') + '</td></tr>';
    },

    renderTools: function () {
      var tb = this.els.tbAssign;
      if (!tb) return;

      var rows = this.state.tools || [];
      if (!rows.length) {
        this.renderToolsEmpty('（此車尚無配賦工具）');
        return;
      }

      var html = '';
      rows.forEach(function (t) {
        t = t || {};
        var tid = Number(t.id || 0);
        if (!tid) return;

        var meta = (t.item_code ? t.item_code + '｜' : '') + (t.tool_no || '-');

        html += ''
          + '<tr>'
          + '  <td>' + esc(t.item_name || t.item_code || '-') + '</td>'
          + '  <td>' + esc(t.tool_no || '-') + '</td>'
          + '  <td>' + esc(t.inspect_date || '-') + '</td>'
          + '  <td>' + esc(t.note || '') + '</td>'
          + '  <td>'
          + '    <button class="btn btn--ghost js-tool-unassign" type="button"'
          + '      data-tool-id="' + tid + '" data-meta="' + esc(meta) + '">解除</button>'
          + '  </td>'
          + '</tr>';
      });

      tb.innerHTML = html || '<tr class="hot-empty"><td colspan="5">（此車尚無配賦工具）</td></tr>';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
    global.HotAssignApp = App; // 方便你 console 看 state
  });

})(window);
