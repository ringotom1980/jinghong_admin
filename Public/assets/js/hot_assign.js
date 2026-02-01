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
      leftEditMode: false,

      rightEditMode: false,         // ✅ 右表：VIEW/EDIT
      rightDirty: false,            // ✅ 是否有改過檢驗日期（有就提示）
      rightDraftDates: {}           // ✅ {toolId: 'YYYY-MM-DD'} 只存使用者改過的
    },

    init: function () {
      this.els.leftActions = qs('#hotAssignLeftActions');
      this.els.rightActions = qs('#hotAssignRightActions');

      this.els.btnVehAdd = qs('#btnVehAdd');
      this.els.btnVehEdit = qs('#btnVehEdit');
      this.els.btnVehSave = qs('#btnVehSave');
      this.els.btnVehCancel = qs('#btnVehCancel');

      this.els.btnAssignBatchDate = qs('#btnAssignBatchDate');
      this.els.btnAssignAdd = qs('#btnAssignAdd');
      this.els.btnAssignEdit = qs('#btnAssignEdit');
      this.els.btnAssignSave = qs('#btnAssignSave');
      this.els.btnAssignCancel = qs('#btnAssignCancel');

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
          if (!global.HotAssignModals || typeof global.HotAssignModals.openVehAdd !== 'function') {
            toast('danger', '系統錯誤', 'HotAssignModals 尚未就緒');
            return;
          }
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

      // 右表：整批更新檢驗日期（VIEW）
      if (this.els.btnAssignBatchDate) {
        this.els.btnAssignBatchDate.addEventListener('click', function () {
          var vid = Number(self.state.activeVehicleId || 0);
          if (!vid) return toast('warning', '尚未選車', '請先選取左側車輛');
          if (!global.HotAssignModals || typeof global.HotAssignModals.openBatchInspectDate !== 'function') {
            return toast('danger', '系統錯誤', 'HotAssignModals.openBatchInspectDate 尚未就緒');
          }
          global.HotAssignModals.openBatchInspectDate(vid, self.getActiveVehicleLabel());
        });
      }

      // 右表：新增（VIEW）
      if (this.els.btnAssignAdd) {
        this.els.btnAssignAdd.addEventListener('click', function () {
          var vid = Number(self.state.activeVehicleId || 0);
          if (!vid) return toast('warning', '尚未選車', '請先選取左側車輛');
          if (!global.HotAssignModals || typeof global.HotAssignModals.openAssignAddForVehicle !== 'function') {
            return toast('danger', '系統錯誤', 'HotAssignModals.openAssignAddForVehicle 尚未就緒');
          }
          global.HotAssignModals.openAssignAddForVehicle(vid, self.getActiveVehicleLabel());
        });
      }

      // 右表：進入 EDIT
      if (this.els.btnAssignEdit) {
        this.els.btnAssignEdit.addEventListener('click', function () {
          var vid = Number(self.state.activeVehicleId || 0);
          if (!vid) return toast('warning', '尚未選車', '請先選取左側車輛');
          self.state.rightEditMode = true;
          self.state.rightDirty = false;
          self.state.rightDraftDates = {};
          self.syncRightMode();
        });
      }

      // 右表：取消 EDIT
      if (this.els.btnAssignCancel) {
        this.els.btnAssignCancel.addEventListener('click', function () {
          self.state.rightEditMode = false;
          self.state.rightDirty = false;
          self.state.rightDraftDates = {};
          self.syncRightMode();
          // 回到 server 狀態
          self.loadTools(self.state.activeVehicleId);
        });
      }

      // 右表：儲存 EDIT（只存變更過的檢驗日期）
      if (this.els.btnAssignSave) {
        this.els.btnAssignSave.addEventListener('click', function () {
          var vid = Number(self.state.activeVehicleId || 0);
          if (!vid) return;

          var draft = self.state.rightDraftDates || {};
          var ids = Object.keys(draft);
          if (!ids.length) {
            toast('info', '無變更', '沒有需要儲存的檢驗日期變更');
            self.state.rightEditMode = false;
            self.syncRightMode();
            return;
          }

          if (!global.apiPost) return toast('danger', '系統錯誤', 'apiPost 不存在');

          var rows = ids.map(function (k) { return { tool_id: Number(k), inspect_date: String(draft[k] || '') }; });

          global.apiPost('/api/hot/assign', { action: 'inspect_dates_update', vehicle_id: vid, rows: rows })
            .then(function (j) {
              if (!j || !j.success) {
                toast('danger', '儲存失敗', (j && j.error) ? j.error : '未知錯誤');
                return;
              }
              toast('success', '已儲存', '檢驗日期已更新');
              self.state.rightEditMode = false;
              self.state.rightDirty = false;
              self.state.rightDraftDates = {};
              self.syncRightMode();
              self.loadTools(vid);
              self.loadAll(vid); // 左表件數可能變（通常不會，但安全）
            });
        });
      }
    },

    syncLeftMode: function () {
      var edit = !!this.state.leftEditMode;

      // VIEW：新增/編輯顯示；取消隱藏
      // EDIT：新增/編輯隱藏；取消顯示
      if (this.els.btnVehAdd) this.els.btnVehAdd.hidden = edit;
      if (this.els.btnVehEdit) this.els.btnVehEdit.hidden = edit;

      // ✅ 取消：只在 EDIT 顯示
      if (this.els.btnVehCancel) this.els.btnVehCancel.hidden = !edit;

      // ✅ 儲存：本流程不需要，永遠隱藏（砍廢物）
      if (this.els.btnVehSave) this.els.btnVehSave.hidden = true;

      // 左表列的「解除」按鈕由 editMode 控制
      if (global.HotAssignLeft) {
        global.HotAssignLeft.render(this.state.vehicles, this.state.activeVehicleId, edit);
      }
    },

    syncRightMode: function () {
      var edit = !!this.state.rightEditMode;

      // VIEW 顯示：批次/新增/編輯
      if (this.els.btnAssignBatchDate) this.els.btnAssignBatchDate.hidden = edit;
      if (this.els.btnAssignAdd) this.els.btnAssignAdd.hidden = edit;
      if (this.els.btnAssignEdit) this.els.btnAssignEdit.hidden = edit;

      // EDIT 顯示：儲存/取消
      if (this.els.btnAssignSave) this.els.btnAssignSave.hidden = !edit;
      if (this.els.btnAssignCancel) this.els.btnAssignCancel.hidden = !edit;

      // 右表 render 要吃 editMode + draftDates
      if (global.HotAssignRight) {
        global.HotAssignRight.render(
          this.getActiveVehicleLabel(),
          this.state.activeVehicleId,
          this.state.assignedTools,
          edit,
          this.state.rightDraftDates || {}
        );
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
      // ✅ 右表 EDIT 中不允許切車（避免跨車誤改）
      if (this.state.rightEditMode) {
        var self = this;
        if (global.Modal && typeof global.Modal.confirmChoice === 'function') {
          global.Modal.confirmChoice(
            '尚未儲存',
            '右表仍在編輯模式，請先「儲存」或「取消」後再切換車輛。',
            null,
            null,
            { confirmText: '知道了', cancelText: '' }
          );
        } else {
          toast('warning', '尚未儲存', '右表仍在編輯模式，請先儲存或取消');
        }
        return;
      }

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
            // ✅ 依模式渲染
            if (self.state.rightEditMode) self.syncRightMode();
            else if (global.HotAssignRight) global.HotAssignRight.render(self.getActiveVehicleLabel(), vehicleId, self.state.assignedTools, false, {});
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
