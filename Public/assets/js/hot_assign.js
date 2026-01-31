/* Path: Public/assets/js/hot_assign.js
 * 說明: 活電工具配賦｜主控（A 路線：table/DOM 為真相）
 * - DOM:
 *   左：#tbHotVeh（HotAssignLeft 渲染）
 *   右：#tbHotAssign（HotAssignRight 渲染）
 *   左按鈕：#btnVehAdd #btnVehEdit #btnVehSave #btnVehCancel
 *   右按鈕：#btnAssignAdd #btnAssignMove
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function toast(type, title, message) {
    if (global.Toast && typeof global.Toast.show === 'function') {
      global.Toast.show({ type: type, title: title, message: message });
      return;
    }
    alert((title ? title + '\n' : '') + (message || ''));
  }

  var App = {
    els: {},
    state: {
      vehicles: [],
      activeVehicleId: 0,
      assignedTools: [],
      leftEditMode: false
    },

    init: function () {
      this.els.leftActions = qs('#hotAssignLeftActions');
      this.els.rightActions = qs('#hotAssignRightActions');

      this.els.btnVehAdd = qs('#btnVehAdd');
      this.els.btnVehEdit = qs('#btnVehEdit');
      this.els.btnVehSave = qs('#btnVehSave');
      this.els.btnVehCancel = qs('#btnVehCancel');

      this.els.btnAssignAdd = qs('#btnAssignAdd');
      this.els.btnAssignMove = qs('#btnAssignMove');

      if (global.HotAssignLeft) global.HotAssignLeft.init(this);
      if (global.HotAssignRight) global.HotAssignRight.init(this);
      if (global.HotAssignModals) global.HotAssignModals.init(this);

      this.bindEvents();
      this.loadAll(0);
    },

    bindEvents: function () {
      var self = this;

      if (this.els.btnVehAdd) {
        this.els.btnVehAdd.addEventListener('click', function () {
          if (!global.HotAssignModals) return;
          global.HotAssignModals.openVehAdd();
        });
      }

      // 左表：編輯模式＝顯示每列「解除」按鈕
      if (this.els.btnVehEdit) {
        this.els.btnVehEdit.addEventListener('click', function () {
          self.state.leftEditMode = true;
          self.syncLeftMode();
        });
      }
      if (this.els.btnVehCancel) {
        this.els.btnVehCancel.addEventListener('click', function () {
          self.state.leftEditMode = false;
          self.syncLeftMode();
        });
      }
      // save 不需要（解除會走 modal 確認）
      if (this.els.btnVehSave) this.els.btnVehSave.addEventListener('click', function () { });

      if (this.els.btnAssignAdd) {
        this.els.btnAssignAdd.addEventListener('click', function () {
          if (!global.HotAssignModals) return;
          global.HotAssignModals.openAssignAdd();
        });
      }

      if (this.els.btnAssignMove) {
        this.els.btnAssignMove.addEventListener('click', function () {
          if (!global.HotAssignModals) return;
          global.HotAssignModals.openAssignMove();
        });
      }
    },

    syncLeftMode: function () {
      var edit = !!this.state.leftEditMode;
      if (this.els.btnVehAdd) this.els.btnVehAdd.hidden = edit;
      if (this.els.btnVehEdit) this.els.btnVehEdit.hidden = edit;

      if (this.els.btnVehSave) this.els.btnVehSave.hidden = !edit;
      if (this.els.btnVehCancel) this.els.btnVehCancel.hidden = !edit;

      if (global.HotAssignLeft) {
        global.HotAssignLeft.render(this.state.vehicles, this.state.activeVehicleId, edit);
      }
    },

    getActiveVehicleLabel: function () {
      var vid = Number(this.state.activeVehicleId || 0);
      var v = (this.state.vehicles || []).find(function (x) { return Number(x.id || 0) === vid; });
      if (!v) return '未選取車輛';
      var parts = [];
      if (v.vehicle_code) parts.push(String(v.vehicle_code));
      if (v.plate_no) parts.push(String(v.plate_no));
      var s = parts.join('｜');
      if (Number(v.is_active || 0) === 0) s += '（停用中）';
      return s || '未選取車輛';
    },

    setActiveVehicle: function (vehicleId, loadTools) {
      vehicleId = Number(vehicleId || 0);
      if (!vehicleId) return;

      this.state.activeVehicleId = vehicleId;

      if (global.HotAssignLeft) {
        global.HotAssignLeft.render(this.state.vehicles, vehicleId, !!this.state.leftEditMode);
      }

      if (loadTools) this.loadTools(vehicleId);
    },

    /* ========== API ========== */

    loadAll: function (preferVehicleId) {
      var self = this;
      if (typeof global.apiGet !== 'function') {
        toast('danger', '系統錯誤', 'apiGet 不存在');
        return;
      }

      global.apiGet('/api/hot/assign?action=vehicles').then(function (j1) {
        if (!j1 || !j1.success) {
          self.state.vehicles = [];
          self.state.activeVehicleId = 0;
          self.state.assignedTools = [];
          if (global.HotAssignLeft) global.HotAssignLeft.render([], 0, false);
          if (global.HotAssignRight) global.HotAssignRight.render('未選取車輛', 0, []);
          toast('danger', '載入失敗', (j1 && j1.error) ? j1.error : '未知錯誤');
          return;
        }

        var vehicles = (j1.data && j1.data.vehicles) ? j1.data.vehicles : [];
        self.state.vehicles = vehicles;

        var activeId = Number(preferVehicleId || 0);
        if (!activeId && vehicles.length) activeId = Number(vehicles[0].id || 0);

        self.state.activeVehicleId = activeId || 0;

        // render left first
        if (global.HotAssignLeft) global.HotAssignLeft.render(self.state.vehicles, self.state.activeVehicleId, !!self.state.leftEditMode);

        // render right label + load tools
        if (!self.state.activeVehicleId) {
          if (global.HotAssignRight) global.HotAssignRight.render('未選取車輛', 0, []);
          self.syncLeftMode();
          return;
        }

        self.loadTools(self.state.activeVehicleId);
        self.syncLeftMode();
      });
    },

    loadTools: function (vehicleId) {
      var self = this;
      if (typeof global.apiGet !== 'function') return;

      vehicleId = Number(vehicleId || 0);
      if (!vehicleId) return;

      global.apiGet('/api/hot/assign?action=tools&vehicle_id=' + encodeURIComponent(String(vehicleId)))
        .then(function (j) {
          if (!j || !j.success) {
            self.state.assignedTools = [];
            if (global.HotAssignRight) global.HotAssignRight.render(self.getActiveVehicleLabel(), vehicleId, []);
            toast('danger', '載入失敗', (j && j.error) ? j.error : '未知錯誤');
            return;
          }
          self.state.assignedTools = (j.data && j.data.tools) ? j.data.tools : [];
          if (global.HotAssignRight) global.HotAssignRight.render(self.getActiveVehicleLabel(), vehicleId, self.state.assignedTools);
        });
    }
  };

  global.HotAssignApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
