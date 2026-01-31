/* Path: Public/assets/js/hot_assign.js
 * 說明: 活電工具配賦｜主控（左車輛 + 右明細 + modal）
 * - 首載：/api/hot/assign?action=init
 * - 左邊只顯示有配賦的車
 * - 新增車：候選清單排除已存在左表
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var App = {
    els: {},
    state: {
      vehicles: [],
      activeVehicleId: 0,
      assignedTools: [],
      vehicleCandidates: []
    },

    init: function () {
      this.els.leftWrap = qs('#haLeft');
      this.els.rightWrap = qs('#haRight');

      this.els.leftHint = qs('#haLeftHint');
      this.els.rightHint = qs('#haRightHint');

      this.els.btnAddVehicle = qs('#haAddVehicleBtn');
      this.els.btnEditAssign = qs('#haEditAssignBtn');
      this.els.btnClearAssign = qs('#haClearAssignBtn');

      if (global.HotAssignLeft) global.HotAssignLeft.init(this);
      if (global.HotAssignRight) global.HotAssignRight.init(this);
      if (global.HotAssignModals) global.HotAssignModals.init(this);

      this.bindEvents();
      this.loadInit(0);
    },

    bindEvents: function () {
      var self = this;

      if (this.els.btnAddVehicle) {
        this.els.btnAddVehicle.addEventListener('click', function () {
          if (!global.HotAssignModals) return;
          global.HotAssignModals.openCreateAssignModal();
        });
      }

      if (this.els.btnEditAssign) {
        this.els.btnEditAssign.addEventListener('click', function () {
          if (!self.state.activeVehicleId) return;
          if (!global.HotAssignModals) return;
          global.HotAssignModals.openEditAssignModal(self.state.activeVehicleId);
        });
      }

      if (this.els.btnClearAssign) {
        this.els.btnClearAssign.addEventListener('click', function () {
          if (!self.state.activeVehicleId) return;
          if (!global.HotAssignModals) return;
          global.HotAssignModals.openClearConfirm(self.state.activeVehicleId);
        });
      }
    },

    setLeftHint: function (text, show) {
      if (!this.els.leftHint) return;
      this.els.leftHint.textContent = text || '';
      this.els.leftHint.hidden = !show;
    },

    setRightHint: function (text, show) {
      if (!this.els.rightHint) return;
      this.els.rightHint.textContent = text || '';
      this.els.rightHint.hidden = !show;
    },

    setStateFromInit: function (d) {
      this.state.vehicles = d.vehicles || [];
      this.state.activeVehicleId = Number(d.active_vehicle_id || 0);
      this.state.assignedTools = d.assigned_tools || [];
      this.state.vehicleCandidates = d.vehicle_candidates || [];

      if (global.HotAssignLeft) global.HotAssignLeft.render(this.state.vehicles, this.state.activeVehicleId);
      if (global.HotAssignRight) global.HotAssignRight.render(this.state.activeVehicleId, this.state.assignedTools);
    },

    setActiveVehicle: function (vehicleId) {
      this.state.activeVehicleId = Number(vehicleId || 0);
      if (global.HotAssignLeft) global.HotAssignLeft.render(this.state.vehicles, this.state.activeVehicleId);
      if (global.HotAssignRight) global.HotAssignRight.render(this.state.activeVehicleId, this.state.assignedTools);
    },

    /* ========== API ========== */

    loadInit: function (vehicleId) {
      var self = this;
      if (!global.apiGet) return;

      self.setLeftHint('載入中…', true);
      self.setRightHint('載入中…', true);

      // 先抓左表 vehicles
      global.apiGet('/api/hot/assign?action=vehicles').then(function (j1) {
        if (!j1 || !j1.success) {
          self.setStateFromInit({ vehicles: [], active_vehicle_id: 0, assigned_tools: [], vehicle_candidates: [] });
          self.setLeftHint('載入失敗', true);
          self.setRightHint('載入失敗', true);
          Toast && Toast.show({ type: 'danger', title: '載入失敗', message: (j1 && j1.error) ? j1.error : '未知錯誤' });
          return;
        }

        var vehicles = (j1.data && j1.data.vehicles) ? j1.data.vehicles : [];

        // 決定 activeVehicleId：優先用傳入 vehicleId，否則第一筆
        var activeId = Number(vehicleId || 0);
        if (!activeId && vehicles.length) {
          // 你的 service 回傳欄位是 v.id（不是 vehicle_id）
          activeId = Number(vehicles[0].id || 0);
        }

        // 如果沒有 activeId，就直接渲染空
        if (!activeId) {
          self.state.vehicles = vehicles;
          self.state.activeVehicleId = 0;
          self.state.assignedTools = [];
          if (global.HotAssignLeft) global.HotAssignLeft.render(self.state.vehicles, 0);
          if (global.HotAssignRight) global.HotAssignRight.render(0, []);
          self.setLeftHint('', false);
          self.setRightHint('', false);
          return;
        }

        // 再抓右表 tools
        global.apiGet('/api/hot/assign?action=tools&vehicle_id=' + encodeURIComponent(String(activeId)))
          .then(function (j2) {
            if (!j2 || !j2.success) {
              self.state.vehicles = vehicles;
              self.state.activeVehicleId = activeId;
              self.state.assignedTools = [];
              if (global.HotAssignLeft) global.HotAssignLeft.render(self.state.vehicles, activeId);
              if (global.HotAssignRight) global.HotAssignRight.render(activeId, []);
              self.setLeftHint('', false);
              self.setRightHint('載入失敗', true);
              Toast && Toast.show({ type: 'danger', title: '載入失敗', message: (j2 && j2.error) ? j2.error : '未知錯誤' });
              return;
            }

            self.state.vehicles = vehicles;
            self.state.activeVehicleId = activeId;
            self.state.assignedTools = (j2.data && j2.data.tools) ? j2.data.tools : [];

            if (global.HotAssignLeft) global.HotAssignLeft.render(self.state.vehicles, activeId);
            if (global.HotAssignRight) global.HotAssignRight.render(activeId, self.state.assignedTools);

            self.setLeftHint('', false);
            self.setRightHint('', false);
          });
      });
    },

    loadVehicleTools: function (vehicleId) {
      var self = this;
      if (!global.apiGet) return;

      vehicleId = Number(vehicleId || 0);
      if (!vehicleId) return;

      self.setRightHint('載入中…', true);

      global.apiGet('/api/hot/assign?action=tools&vehicle_id=' + encodeURIComponent(String(vehicleId)))
        .then(function (j) {
          if (!j || !j.success) {
            Toast && Toast.show({ type: 'danger', title: '載入失敗', message: (j && j.error) ? j.error : '未知錯誤' });
            self.state.assignedTools = [];
            if (global.HotAssignRight) global.HotAssignRight.render(vehicleId, []);
            self.setRightHint('載入失敗', true);
            return;
          }
          var d = j.data || {};
          self.state.assignedTools = d.tools || [];
          if (global.HotAssignRight) global.HotAssignRight.render(vehicleId, self.state.assignedTools);
          self.setRightHint('', false);
        });
    },

    /* ========== mutations (給 modal 呼叫) ========== */

    createAssign: function (vehicleId, toolIds) {
      var self = this;
      if (!global.apiPost) return Promise.resolve(false);

      return global.apiPost('/api/hot/assign', {
        action: 'assign_more',
        vehicle_id: Number(vehicleId || 0),
        tool_ids: toolIds || []
      }).then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '新增失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          return false;
        }
        Toast && Toast.show({ type: 'success', title: '已新增', message: '已新增配賦' });
        self.loadInit(Number(vehicleId || 0));
        return true;
      });
    },

    updateAssign: function (vehicleId, addIds, removeIds) {
      var self = this;
      if (!global.apiPost) return Promise.resolve(false);

      return global.apiPost('/api/hot/assign', {
        action: 'update',
        vehicle_id: Number(vehicleId || 0),
        add_tool_ids: addIds || [],
        remove_tool_ids: removeIds || []
      }).then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '更新失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          return false;
        }
        Toast && Toast.show({ type: 'success', title: '已更新', message: '配賦已更新' });
        self.loadInit(Number(vehicleId || 0));
        return true;
      });
    },

    clearAssign: function (vehicleId) {
      var self = this;
      if (!global.apiPost) return Promise.resolve(false);

      return global.apiPost('/api/hot/assign', {
        action: 'vehicle_unassign_all',
        vehicle_id: Number(vehicleId || 0)
      }).then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '清空失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          return false;
        }
        Toast && Toast.show({ type: 'success', title: '已清空', message: '該車配賦已清空' });
        self.loadInit(0);
        return true;
      });
    },

    // 供 modal：取分類可用工具清單
    loadAvailableByItem: function (itemId) {
      if (!global.apiGet) return Promise.resolve(null);
      return global.apiGet('/api/hot/assign?action=unassigned_tools&item_id=' + encodeURIComponent(String(Number(itemId || 0))))
        .then(function (j) {
          if (!j || !j.success) return null;
          return j.data || null; // {tools: [...]}
        });
    }
  };

  global.HotAssignApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
