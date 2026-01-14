/* Path: Public/assets/js/car_base.js
 * 說明: 車輛基本資料頁總控（只做：初始化/全域狀態/分頁切換/協調子模組）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var App = {
    state: {
      dicts: null,
      list: [],
      activeId: null,
      active: null, // { vehicle, inspections, rules }
      editMode: false,
      loading: false
    },

    els: {},

    init: function () {
      this.cacheEls();
      this.bindTabs();
      this.bindHeaderActions();

      // 子模組 init（各自只管自己的區塊）
      if (global.CarBaseList) global.CarBaseList.init(this);
      if (global.CarBaseDetail) global.CarBaseDetail.init(this);
      if (global.CarBaseInspections) global.CarBaseInspections.init(this);
      if (global.CarBasePhoto) global.CarBasePhoto.init(this);

      // 先載字典 → 再載清單
      this.loadDicts()
        .then(this.loadList.bind(this))
        .then(function () {})
        .catch(function (e) {
          Toast && Toast.show({ type: 'danger', title: '初始化失敗', message: (e && e.message) ? e.message : '未知錯誤' });
        });
    },

    cacheEls: function () {
      this.els.search = qs('#carbSearch');
      this.els.sort = qs('#carbSort');

      this.els.list = qs('#carbList');
      this.els.empty = qs('#carbEmpty');
      this.els.loading = qs('#carbLoading');

      this.els.titleMain = qs('#carbTitleMain');
      this.els.titleSub = qs('#carbTitleSub');

      this.els.editBtn = qs('#carbEditBtn');
      this.els.saveBtn = qs('#carbSaveBtn');
      this.els.cancelBtn = qs('#carbCancelBtn');

      this.els.tabs = qsa('.carb-tab');
      this.els.panels = qsa('.carb-panel');
    },

    bindTabs: function () {
      var self = this;
      qsa('.carb-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tab = btn.getAttribute('data-tab');
          self.setTab(tab);
        });
      });
    },

    setTab: function (tab) {
      tab = tab || 'detail';
      qsa('.carb-tab').forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-tab') === tab);
      });
      qsa('.carb-panel').forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-panel') === tab);
      });
    },

    bindHeaderActions: function () {
      var self = this;

      if (this.els.editBtn) {
        this.els.editBtn.addEventListener('click', function () {
          if (!self.state.activeId) return;
          self.setEditMode(true);
        });
      }

      if (this.els.cancelBtn) {
        this.els.cancelBtn.addEventListener('click', function () {
          if (!self.state.activeId) return;
          self.setEditMode(false);
          if (global.CarBaseDetail) global.CarBaseDetail.reloadFromState();
        });
      }

      if (this.els.saveBtn) {
        this.els.saveBtn.addEventListener('click', function () {
          if (!self.state.activeId) return;
          if (!global.CarBaseDetail) return;
          global.CarBaseDetail.save();
        });
      }
    },

    setEditMode: function (on) {
      on = !!on;
      this.state.editMode = on;

      if (global.CarBaseDetail) global.CarBaseDetail.setEditMode(on);

      if (this.els.editBtn) this.els.editBtn.disabled = !this.state.activeId || on;
      if (this.els.saveBtn) this.els.saveBtn.disabled = !this.state.activeId || !on;
      if (this.els.cancelBtn) this.els.cancelBtn.disabled = !this.state.activeId || !on;
    },

    setActiveMeta: function () {
      var v = this.state.active && this.state.active.vehicle ? this.state.active.vehicle : null;
      if (!v) {
        if (this.els.titleMain) this.els.titleMain.textContent = '請先從左側選擇車輛';
        if (this.els.titleSub) this.els.titleSub.textContent = '';
        return;
      }

      var main = (v.vehicle_code || '') + (v.plate_no ? ('｜' + v.plate_no) : '');
      if (this.els.titleMain) this.els.titleMain.textContent = main || '車輛';
      if (this.els.titleSub) {
        var parts = [];
        if (v.type_name) parts.push(v.type_name);
        if (v.brand_name) parts.push(v.brand_name);
        if (v.boom_type_name) parts.push(v.boom_type_name);
        this.els.titleSub.textContent = parts.join('｜');
      }
    },

    enableWorkspace: function (enabled) {
      enabled = !!enabled;
      qsa('.carb-tab').forEach(function (b) { b.disabled = !enabled; });
      if (this.els.editBtn) this.els.editBtn.disabled = !enabled || this.state.editMode;
      if (this.els.saveBtn) this.els.saveBtn.disabled = !enabled || !this.state.editMode;
      if (this.els.cancelBtn) this.els.cancelBtn.disabled = !enabled || !this.state.editMode;

      if (global.CarBasePhoto) global.CarBasePhoto.setEnabled(enabled);
    },

    setLoading: function (loading) {
      this.state.loading = !!loading;
      if (this.els.loading) this.els.loading.hidden = !this.state.loading;
    },

    loadDicts: function () {
      var self = this;
      return apiGet('/api/car/car_dicts')
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : 'car_dicts 失敗');
          self.state.dicts = j.data || {};
          if (global.CarBaseDetail) global.CarBaseDetail.applyDicts(self.state.dicts);
          return true;
        });
    },

    loadList: function () {
      var self = this;
      self.setLoading(true);

      return apiGet('/api/car/car_list')
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : 'car_list 失敗');

          self.state.list = (j.data && j.data.vehicles) ? j.data.vehicles : [];
          if (global.CarBaseList) global.CarBaseList.render(self.state.list);

          self.setLoading(false);
          return true;
        })
        .catch(function (e) {
          self.setLoading(false);
          throw e;
        });
    },

    selectVehicle: function (vehicleId) {
      var self = this;
      vehicleId = Number(vehicleId || 0);
      if (!vehicleId) return;

      self.state.activeId = vehicleId;
      self.setEditMode(false);
      self.enableWorkspace(false); // 等 get 完再開

      return apiGet('/api/car/car_get?id=' + encodeURIComponent(vehicleId))
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : 'car_get 失敗');

          self.state.active = j.data || null;
          self.setActiveMeta();
          self.enableWorkspace(true);

          if (global.CarBaseDetail) global.CarBaseDetail.bindData(self.state.active);
          if (global.CarBaseInspections) global.CarBaseInspections.bindData(self.state.active);
          if (global.CarBasePhoto) global.CarBasePhoto.bindData(self.state.active);

          // 預設留在目前 tab；若沒 active tab 就回 detail
          return true;
        })
        .catch(function (e) {
          Toast && Toast.show({ type: 'danger', title: '載入車輛失敗', message: (e && e.message) ? e.message : '未知錯誤' });
          throw e;
        });
    }
  };

  global.CarBaseApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
