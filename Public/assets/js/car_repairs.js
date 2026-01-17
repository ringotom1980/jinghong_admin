/* Path: Public/assets/js/car_repairs.js
 * 說明: 維修紀錄頁主控（初始化、膠囊、事件、協調 list + modal）
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

  var App = {
    els: {},
    state: {
      list: [],
      loading: false,
      capsules: [],
      activeKey: ''
    },

    init: function () {
      this.els.tbody = qs('#crTbody');
      this.els.empty = qs('#crEmpty');
      this.els.loading = qs('#crLoading');
      this.els.totalCount = qs('#crTotalCount');
      this.els.addBtn = qs('#crAddBtn');

      this.els.caps = qs('#crCapsules');
      this.els.capsHint = qs('#crCapsulesHint');

      if (this.els.addBtn) {
        this.els.addBtn.addEventListener('click', function () {
          if (!global.CarRepairModal) return;
          global.CarRepairModal.openCreate();
        });
      }

      if (this.els.caps) {
        this.els.caps.addEventListener('click', this.onCapsClick.bind(this));
      }

      // 子模組 init
      if (global.CarRepairsList) global.CarRepairsList.init(this);
      if (global.CarRepairModal) global.CarRepairModal.init(this);

      // ✅ 先載入膠囊，再載入列表（依 default key）
      this.loadCapsules();
    },

    setLoading: function (on) {
      this.state.loading = !!on;
      if (this.els.loading) this.els.loading.hidden = !this.state.loading;
    },

    setEmpty: function (on) {
      if (this.els.empty) this.els.empty.hidden = !on;
    },

    setCapsHint: function (text, show) {
      if (!this.els.capsHint) return;
      this.els.capsHint.textContent = text || '';
      this.els.capsHint.hidden = !show;
    },

    renderCapsules: function () {
      var el = this.els.caps;
      if (!el) return;

      var caps = this.state.capsules || [];
      if (!caps.length) {
        el.innerHTML = '';
        return;
      }

      var html = '';
      for (var i = 0; i < caps.length; i++) {
        var c = caps[i] || {};
        var key = String(c.key || '');
        var active = (key && key === this.state.activeKey) ? ' is-active' : '';
        var label = esc(c.label || key);
        var count = (typeof c.count === 'number') ? c.count : Number(c.count || 0);

        html += ''
          + '<button type="button" class="cr-cap' + active + '" data-key="' + esc(key) + '">'
          + '  <span class="cr-cap__label">' + label + '</span>'
          + '  <span class="cr-cap__count">' + esc(String(count)) + ' 筆</span>'
          + '</button>';
      }

      el.innerHTML = html;
    },

    pickDefaultKey: function (caps) {
      caps = caps || [];
      for (var i = 0; i < caps.length; i++) {
        if (caps[i] && caps[i].is_default) return String(caps[i].key || '');
      }
      return caps[0] ? String(caps[0].key || '') : '';
    },

    loadCapsules: function () {
      var self = this;
      if (!global.apiGet) return;

      self.setCapsHint('載入中…', true);

      global.apiGet('/api/car/car_repair_capsules').then(function (j) {
        if (!j || !j.success) {
          self.state.capsules = [];
          self.state.activeKey = '';
          self.renderCapsules();
          self.setCapsHint('載入失敗', true);

          // fallback：仍可載全列表
          self.loadList('');
          return;
        }

        var caps = (j.data && j.data.capsules) ? j.data.capsules : [];
        self.state.capsules = caps;

        var defKey = self.pickDefaultKey(caps);
        self.state.activeKey = defKey;

        self.renderCapsules();
        self.setCapsHint('', false);

        self.loadList(defKey);
      }).catch(function () {
        self.setCapsHint('載入失敗', true);
        self.loadList('');
      });
    },

    onCapsClick: function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[data-key]') : null;
      if (!btn) return;

      var key = btn.getAttribute('data-key') || '';
      if (!key) return;
      if (key === this.state.activeKey) return;

      this.state.activeKey = key;
      this.renderCapsules();
      this.loadList(key);
    },

    loadList: function (key) {
      var self = this;
      if (!global.apiGet) return;
      // ✅ 修正：未傳 key 時，沿用目前膠囊 activeKey（避免載到全量而混在一起）
      if (key === undefined || key === null) {
        key = self.state.activeKey || '';
      }
      self.setLoading(true);
      self.setEmpty(false);

      var url = '/api/car/car_repair_list';
      if (key) url += '?key=' + encodeURIComponent(key);

      global.apiGet(url).then(function (j) {
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
