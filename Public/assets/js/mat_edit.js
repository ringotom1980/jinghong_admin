/* Path: Public/assets/js/mat_edit.js
 * 說明: /mat/edit 入口總控（D 班管理）
 * - 初始化狀態與 DOM
 * - 協調各子模組 render / reload
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function todayYmd() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  var App = {
    els: {},
    state: {
      date: '',
      categories: [],
      reconMap: {},     // {catId: qty}
      cmMap: {},        // {catId: {codes:[], text:''}}
      editModeCats: false,
      editModeCM: false
    },

    init: function () {
      this.els.reconActions = qs('#meReconActions');
      this.els.reconTop = qs('#meReconTop');
      this.els.recon = qs('#meReconciliation');

      this.els.cmAction = qs('#meCMAction');
      this.els.cm = qs('#meCategoryMaterials');

      this.state.date = todayYmd();

      // init modules
      if (global.MatEditUI && global.MatEditUI.init) global.MatEditUI.init({ app: this });
      if (global.MatEditCategories && global.MatEditCategories.init) global.MatEditCategories.init(this);
      if (global.MatEditReconciliation && global.MatEditReconciliation.init) global.MatEditReconciliation.init(this);
      if (global.MatEditCategoryMaterials && global.MatEditCategoryMaterials.init) global.MatEditCategoryMaterials.init(this);

      this.reloadAll();
    },

    reloadAll: function () {
      var self = this;
      return this.loadCategories()
        .then(function () { return self.loadReconciliation(self.state.date); })
        .then(function () { return self.loadCategoryMaterials(); })
        .then(function () {
          self.renderAll();
        });
    },

    loadCategories: function () {
      var self = this;
      if (!global.apiGet) return Promise.resolve();
      return global.apiGet('/api/mat/edit_categories?action=list').then(function (j) {
        if (!j || !j.success) {
          if (global.Toast) global.Toast.show({ type: 'error', title: '載入失敗', message: (j && j.error) ? j.error : 'edit_categories list error' });
          return;
        }
        self.state.categories = (j.data && j.data.categories) ? j.data.categories : [];
      });
    },

    loadReconciliation: function (ymd) {
      var self = this;
      if (!global.apiGet) return Promise.resolve();
      return global.apiGet('/api/mat/edit_reconciliation?action=get&withdraw_date=' + encodeURIComponent(ymd)).then(function (j) {
        if (!j || !j.success) {
          if (global.Toast) global.Toast.show({ type: 'error', title: '載入失敗', message: (j && j.error) ? j.error : 'edit_reconciliation get error' });
          return;
        }
        self.state.reconMap = (j.data && j.data.recon_map) ? j.data.recon_map : {};
      });
    },

    loadCategoryMaterials: function () {
      var self = this;
      if (!global.apiGet) return Promise.resolve();
      return global.apiGet('/api/mat/edit_category_materials?action=list').then(function (j) {
        if (!j || !j.success) {
          if (global.Toast) global.Toast.show({ type: 'error', title: '載入失敗', message: (j && j.error) ? j.error : 'edit_category_materials list error' });
          return;
        }
        self.state.cmMap = (j.data && j.data.cm_map) ? j.data.cm_map : {};
      });
    },

    renderAll: function () {
      if (global.MatEditReconciliation && global.MatEditReconciliation.renderTop) global.MatEditReconciliation.renderTop();
      if (global.MatEditCategories && global.MatEditCategories.render) global.MatEditCategories.render();
      if (global.MatEditCategoryMaterials && global.MatEditCategoryMaterials.render) global.MatEditCategoryMaterials.render();
    }
  };

  global.MatEditApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
