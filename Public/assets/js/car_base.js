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
      mode: 'VIEW',        // VIEW | CREATE | EDIT
      prevActiveId: null,  // 進入 CREATE 前記住原本選擇
      loading: false,
      rightLoading: false,
      reqSeq: 0
    },

    els: {},

    init: function () {
      this.cacheEls();
      this.ensureRightOverlay(); // ✅ 右側遮罩（載入中）
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
        .then(function () { })
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
      this.els.newBtn = qs('#carbNewBtn');

      this.els.tabs = qsa('.carb-tab');
      this.els.panels = qsa('.carb-panel');

      this.els.right = qs('.carb-right');
      this.els.rightOverlay = qs('#carbRightOverlay');

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

      if (this.els.newBtn) {
        this.els.newBtn.addEventListener('click', function () {
          self.enterCreateMode();
        });
      }

      if (this.els.editBtn) {
        this.els.editBtn.addEventListener('click', function () {
          if (!self.state.activeId) return;
          self.setMode('EDIT');
        });
      }

      if (this.els.cancelBtn) {
        this.els.cancelBtn.addEventListener('click', function () {
          if (self.state.mode === 'CREATE') {
            self.exitCreateMode();
            return;
          }
          if (self.state.mode === 'EDIT') {
            self.setMode('VIEW');
            if (global.CarBaseDetail) global.CarBaseDetail.reloadFromState();
          }
        });
      }

      if (this.els.saveBtn) {
        this.els.saveBtn.addEventListener('click', function () {
          if (!global.CarBaseDetail) return;
          global.CarBaseDetail.save(); // detail 依 mode 分流新增/更新
        });
      }
    },

    setMode: function (mode) {
      mode = String(mode || 'VIEW');
      if (['VIEW', 'CREATE', 'EDIT'].indexOf(mode) === -1) mode = 'VIEW';
      this.state.mode = mode;

      if (global.CarBaseDetail && global.CarBaseDetail.setMode) {
        global.CarBaseDetail.setMode(mode);
      }

      // CREATE/EDIT 不給切到檢查（避免混亂）
      var tabsEnabled = (mode === 'VIEW');
      qsa('.carb-tab').forEach(function (b) { b.disabled = !tabsEnabled; });
      if (!tabsEnabled) this.setTab('detail');

      var hasActive = !!this.state.activeId;

      // VIEW：顯示 新增/編輯
      if (this.els.newBtn) {
        this.els.newBtn.hidden = (mode !== 'VIEW');
        this.els.newBtn.disabled = (mode !== 'VIEW');
      }
      if (this.els.editBtn) {
        this.els.editBtn.hidden = (mode !== 'VIEW');
        this.els.editBtn.disabled = !hasActive || (mode !== 'VIEW');
      }

      // CREATE/EDIT：顯示 儲存/取消 + 文案
      if (this.els.saveBtn) {
        this.els.saveBtn.hidden = (mode === 'VIEW');
        this.els.saveBtn.disabled = (mode === 'VIEW');
        var t = this.els.saveBtn.querySelector('.btn__text');
        if (t) t.textContent = (mode === 'CREATE') ? '儲存新增' : '儲存更新';
      }
      if (this.els.cancelBtn) {
        this.els.cancelBtn.hidden = (mode === 'VIEW');
        this.els.cancelBtn.disabled = (mode === 'VIEW');
        this.els.cancelBtn.textContent = (mode === 'CREATE') ? '取消新增' : '取消更新';
      }

      // 照片：只有 EDIT 才能換（CREATE 尚未有 id）
      if (global.CarBasePhoto) global.CarBasePhoto.setEnabled(mode === 'EDIT');
    },

    enterCreateMode: function () {
      this.state.prevActiveId = this.state.activeId || null;

      this.state.activeId = null;
      this.state.active = null;

      this.setActiveMeta();

      if (global.CarBaseDetail && global.CarBaseDetail.clearForm) global.CarBaseDetail.clearForm();
      if (global.CarBasePhoto && global.CarBasePhoto.bindData) global.CarBasePhoto.bindData({ vehicle: null });

      this.setMode('CREATE');
    },

    exitCreateMode: function () {
      var backId = this.state.prevActiveId || null;

      this.setMode('VIEW');

      if (backId) {
        this.selectVehicle(backId);
      } else {
        this.state.activeId = null;
        this.state.active = null;
        this.setActiveMeta();
        this.enableWorkspace(false);
      }
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
      // 只有 VIEW 才讓「編輯本車」可用；CREATE/EDIT 由 setMode 控
      if (this.els.editBtn) this.els.editBtn.disabled = !enabled || (this.state.mode !== 'VIEW');

      if (global.CarBasePhoto) global.CarBasePhoto.setEnabled(enabled);
    },

    setLoading: function (loading) {
      this.state.loading = !!loading;
      if (this.els.loading) this.els.loading.hidden = !this.state.loading;
    },

    ensureRightOverlay: function () {
      if (!this.els.right) this.els.right = qs('.carb-right');
      if (!this.els.right) return;

      var exist = qs('#carbRightOverlay', this.els.right);
      if (exist) {
        this.els.rightOverlay = exist;
        return;
      }

      var div = document.createElement('div');
      div.id = 'carbRightOverlay';
      div.className = 'carb-overlay';
      div.hidden = true;
      div.innerHTML = ''
        + '<div class="carb-overlay__panel" role="status" aria-live="polite">'
        + '  <span class="carb-spinner" aria-hidden="true"></span>'
        + '  <span class="carb-overlay__text">載入中…</span>'
        + '</div>';

      this.els.right.appendChild(div);
      this.els.rightOverlay = div;
    },

    setRightLoading: function (loading) {
      loading = !!loading;
      this.state.rightLoading = loading;

      this.ensureRightOverlay();
      if (!this.els.rightOverlay) return;

      // ✅ 避免閃一下：延遲顯示（150ms）
      var self = this;
      if (!this._rightLoadingTimer) this._rightLoadingTimer = null;

      if (loading) {
        if (this._rightLoadingTimer) clearTimeout(this._rightLoadingTimer);
        this._rightLoadingTimer = setTimeout(function () {
          // 仍在 loading 才顯示
          if (!self.state.rightLoading) return;
          self.els.rightOverlay.hidden = false;
          self.els.right.classList.add('is-loading');
        }, 150);
      } else {
        if (this._rightLoadingTimer) {
          clearTimeout(this._rightLoadingTimer);
          this._rightLoadingTimer = null;
        }
        this.els.rightOverlay.hidden = true;
        if (this.els.right) this.els.right.classList.remove('is-loading');
      }
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
          /* ✅ 初始自動選第一台（僅在尚未選車時） */
          if (!self.state.activeId && self.state.list && self.state.list.length) {
            var first = self.state.list[0];
            // 依你的 list 資料結構，通常是 id 或 vehicle_id，兩者都防呆
            var firstId = Number(first.id || first.vehicle_id || 0);
            if (firstId) self.selectVehicle(firstId);
          }
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

      // ✅ request 序號，避免連點車輛時舊回應覆蓋新回應
      self.state.reqSeq = (self.state.reqSeq || 0) + 1;
      var seq = self.state.reqSeq;

      self.state.activeId = vehicleId;
      self.setMode('VIEW');
      self.enableWorkspace(false);     // 等 get 完再開
      self.setRightLoading(true);      // ✅ 右側遮罩轉圈

      return apiGet('/api/car/car_get?id=' + encodeURIComponent(vehicleId))
        .then(function (j) {
          // 若這個回應已經不是最新選車，直接忽略
          if (seq !== self.state.reqSeq) return true;

          if (!j || !j.success) throw new Error((j && j.error) ? j.error : 'car_get 失敗');

          self.state.active = j.data || null;
          self.setActiveMeta();

          if (global.CarBaseDetail) global.CarBaseDetail.bindData(self.state.active);
          if (global.CarBaseInspections) global.CarBaseInspections.bindData(self.state.active);

          // ✅ 等照片載入完成再關遮罩
          var photoReady = Promise.resolve(true);
          if (global.CarBasePhoto && global.CarBasePhoto.bindData) {
            photoReady = global.CarBasePhoto.bindData(self.state.active) || Promise.resolve(true);
          }

          self.enableWorkspace(true);

          return photoReady.then(function () {
            // 若這個回應已經不是最新選車，直接忽略（避免連點造成遮罩亂跳）
            if (seq !== self.state.reqSeq) return true;
            self.setRightLoading(false);
            return true;
          });

        })
        .catch(function (e) {
          // 若不是最新選車的錯誤，也不要跳錯誤 toast（避免連點造成干擾）
          if (seq !== self.state.reqSeq) return;

          self.setRightLoading(false);
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
