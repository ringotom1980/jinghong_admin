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

      return global.apiGet('/api/mat/edit_reconciliation?action=get&withdraw_date=' + encodeURIComponent(ymd))
        .then(function (j) {
          if (!j || !j.success) {
            if (global.Toast) global.Toast.show({
              type: 'error',
              title: '載入失敗',
              message: (j && j.error) ? j.error : 'edit_reconciliation get error'
            });
            return;
          }

          // ✅ API 回傳：data.values = { "1":"20", "2":"50" }
          var values = (j.data && j.data.values) ? j.data.values : {};
          if (!values || typeof values !== 'object') values = {};

          // ✅ normalize：轉成 number（允許負數、小數；空值視為 0）
          var norm = {};
          Object.keys(values).forEach(function (k) {
            var v = values[k];
            var n = (v === '' || v === null || v === undefined) ? 0 : Number(v);
            if (!isFinite(n)) n = 0;
            norm[String(k)] = n;
          });

          self.state.reconMap = norm;
        });
    },

    loadCategoryMaterials: function () {
      var self = this;
      if (!global.apiGet) return Promise.resolve();

      var cats = self.state.categories || [];
      if (!cats.length) {
        self.state.cmMap = {};
        return Promise.resolve();
      }

      // 逐分類打 list&category_id，組回 cmMap={catId:{codes:[], text:''}}
      var jobs = cats.map(function (c) {
        var id = (c && c.id !== undefined && c.id !== null) ? String(c.id) : '';
        if (!id) return Promise.resolve({ id: '', codes: [] });

        return global.apiGet('/api/mat/edit_category_materials?action=list&category_id=' + encodeURIComponent(id))
          .then(function (j) {
            if (!j || !j.success) {
              // 單一分類失敗不要中斷整體
              return { id: id, codes: [] };
            }
            var codes = (j.data && j.data.material_numbers) ? j.data.material_numbers : [];
            if (!Array.isArray(codes)) codes = [];
            return { id: id, codes: codes };
          });
      });

      return Promise.all(jobs).then(function (rows) {
        var map = {};
        rows.forEach(function (r) {
          if (!r || !r.id) return;
          var codes = Array.isArray(r.codes) ? r.codes : [];
          map[r.id] = {
            codes: codes,
            text: codes.join(', ')
          };
        });
        self.state.cmMap = map;
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
