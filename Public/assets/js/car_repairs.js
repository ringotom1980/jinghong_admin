/* Path: Public/assets/js/car_repairs.js
 * 說明: 維修紀錄頁主控（初始化、事件、協調 list + modal）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var App = {
    els: {},
    state: {
      list: [],
      loading: false
    },

    init: function () {
      this.els.tbody = qs('#crTbody');
      this.els.empty = qs('#crEmpty');
      this.els.loading = qs('#crLoading');
      this.els.totalCount = qs('#crTotalCount');
      this.els.addBtn = qs('#crAddBtn');

      if (this.els.addBtn) {
        this.els.addBtn.addEventListener('click', function () {
          if (!global.CarRepairModal) return;
          global.CarRepairModal.openCreate();
        });
      }

      // 子模組 init
      if (global.CarRepairsList) global.CarRepairsList.init(this);
      if (global.CarRepairModal) global.CarRepairModal.init(this);

      this.loadList();
    },

    setLoading: function (on) {
      this.state.loading = !!on;
      if (this.els.loading) this.els.loading.hidden = !this.state.loading;
    },

    setEmpty: function (on) {
      if (this.els.empty) this.els.empty.hidden = !on;
    },

    loadList: function () {
      var self = this;
      if (!global.apiGet) return;

      self.setLoading(true);
      self.setEmpty(false);

      global.apiGet('/api/car/car_repair_list.php').then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '載入失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          self.state.list = [];
          if (global.CarRepairsList) global.CarRepairsList.render([]);
          if (self.els.totalCount) self.els.totalCount.textContent = '0';
          self.setEmpty(true);
          return;
        }

        var rows = (j.data && j.data.rows) ? j.data.rows : [];
        self.state.list = rows;
        if (self.els.totalCount) self.els.totalCount.textContent = String(rows.length || 0);

        if (global.CarRepairsList) global.CarRepairsList.render(rows);
        self.setEmpty(!rows.length);
      }).finally(function () {
        self.setLoading(false);
      });
    }
  };

  global.CarRepairsApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
