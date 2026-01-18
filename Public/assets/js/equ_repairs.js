/* Path: Public/assets/js/equ_repairs.js
 * 說明: 工具維修模組總控（初始化/查詢/協調列表與 modal）
 * 對齊：Public/assets/js/api.js（apiGet/apiPost 回 Promise）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var App = {
    els: {},
    dicts: { tools: [], vendors: [] },

    init: function () {
      this.els.tbody = qs('#equTbody');
      this.els.month = qs('#equMonth');
      this.els.type = qs('#equType');
      this.els.q = qs('#equQ');
      this.els.searchBtn = qs('#equSearchBtn');
      this.els.addBtn = qs('#equAddBtn');

      // 預設本月
      var now = new Date();
      var ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      this.els.month.value = ym;

      this.bind();
      this.loadDicts();
      this.search();
    },

    bind: function () {
      var self = this;

      this.els.searchBtn.addEventListener('click', function () { self.search(); });

      this.els.addBtn.addEventListener('click', function () {
        global.EquRepairsModal.openCreate(self.dicts);
      });

      // 列表事件委派
      this.els.tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act]');
        if (!btn) return;

        var act = btn.getAttribute('data-act');
        var id = Number(btn.getAttribute('data-id') || 0);
        if (!id) return;

        if (act === 'edit') self.openEdit(id);
        if (act === 'del') self.del(id);
      });
    },

    loadDicts: function () {
      var self = this;
      if (typeof global.apiGet !== 'function') return;

      global.apiGet('/api/equ/equ_dicts.php', {})
        .then(function (j) {
          if (!j || !j.success) return;
          self.dicts = j.data || self.dicts;
          global.EquRepairsModal.applyDicts(self.dicts);
        });
    },

    search: function () {
      var self = this;
      if (typeof global.apiGet !== 'function') return;

      var month = (this.els.month.value || '').trim(); // YYYY-MM
      var type = (this.els.type.value || '').trim();
      var q = (this.els.q.value || '').trim();

      // loading
      if (self.els.tbody) self.els.tbody.innerHTML = '<tr><td colspan="9" class="cs-empty">載入中…</td></tr>';

      global.apiGet('/api/equ/equ_repair_list.php', { month: month, repair_type: type, q: q })
        .then(function (j) {
          if (!j || !j.success) {
            global.EquRepairsList.renderEmpty(self.els.tbody, (j && j.error) ? j.error : '載入失敗');
            return;
          }
          global.EquRepairsList.render(self.els.tbody, j.data || []);
        });
    },

    openEdit: function (id) {
      var self = this;
      if (typeof global.apiGet !== 'function') return;

      global.apiGet('/api/equ/equ_repair_get.php', { id: id })
        .then(function (j) {
          if (!j || !j.success) {
            alert((j && j.error) ? j.error : '載入失敗');
            return;
          }
          global.EquRepairsModal.openEdit(self.dicts, j.data);
        });
    },

    del: function (id) {
      if (typeof global.apiPost !== 'function') return;
      if (!confirm('確定刪除此筆紀錄？')) return;

      var self = this;

      global.apiPost('/api/equ/equ_repair_delete.php', { id: id })
        .then(function (j) {
          if (!j || !j.success) {
            alert((j && j.error) ? j.error : '刪除失敗');
            return;
          }
          self.search();
        });
    }
  };

  global.EquRepairsApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
