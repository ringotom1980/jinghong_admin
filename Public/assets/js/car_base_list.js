/* Path: Public/assets/js/car_base_list.js
 * 說明: 左側車輛清單（載入後渲染、搜尋、排序、高亮、切換）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function normalize(s) {
    return (s === null || s === undefined) ? '' : String(s).toLowerCase();
  }

  var Mod = {
    app: null,
    _raw: [],
    _view: [],

    init: function (app) {
      this.app = app;

      var search = app.els.search;
      if (search) {
        search.addEventListener('input', this.apply.bind(this));
      }

      var sort = app.els.sort;
      if (sort) {
        sort.addEventListener('change', this.apply.bind(this));
      }

      // 委派點擊
      if (app.els.list) {
        app.els.list.addEventListener('click', function (e) {
          var item = e.target;
          while (item && item !== app.els.list && !item.classList.contains('carb-item')) {
            item = item.parentNode;
          }
          if (!item || item === app.els.list) return;

          var id = item.getAttribute('data-id');
          if (!id) return;

          Mod.setActive(id);
          app.selectVehicle(id);
        });
      }
    },

    render: function (vehicles) {
      this._raw = Array.isArray(vehicles) ? vehicles : [];
      this.apply();
    },

    apply: function () {
      var app = this.app;
      var search = normalize(app.els.search ? app.els.search.value : '');
      var sort = app.els.sort ? String(app.els.sort.value || 'vehicle_code_asc') : 'vehicle_code_asc';

      var rows = this._raw.slice();

      // filter
      if (search) {
        rows = rows.filter(function (v) {
          var hay = [
            v.vehicle_code, v.plate_no, v.owner_name, v.user_name,
            v.type_name, v.brand_name, v.boom_type_name
          ].map(normalize).join(' ');
          return hay.indexOf(search) !== -1;
        });
      }

      // sort
      rows.sort(function (a, b) {
        function cmp(x, y) {
          x = (x === null || x === undefined) ? '' : x;
          y = (y === null || y === undefined) ? '' : y;
          if (x < y) return -1;
          if (x > y) return 1;
          return 0;
        }

        if (sort === 'vehicle_code_desc') return -cmp(a.vehicle_code || '', b.vehicle_code || '');
        if (sort === 'plate_no_asc') return cmp(a.plate_no || '', b.plate_no || '');
        if (sort === 'plate_no_desc') return -cmp(a.plate_no || '', b.plate_no || '');
        if (sort === 'ins_overdue_desc') return (Number(b.overdue_count || 0) - Number(a.overdue_count || 0));
        if (sort === 'updated_desc') return (Number(b.updated_ts || 0) - Number(a.updated_ts || 0));
        return cmp(a.vehicle_code || '', b.vehicle_code || '');
      });

      this._view = rows;
      this.draw();
    },

    draw: function () {
      var app = this.app;
      var listEl = app.els.list;
      if (!listEl) return;

      if (app.els.empty) app.els.empty.hidden = (this._view.length !== 0);

      var html = '';
      for (var i = 0; i < this._view.length; i++) {
        var v = this._view[i];

        var badges = [];
        if (Number(v.overdue_count || 0) > 0) badges.push('<span class="badge badge--over">已逾期 ' + Number(v.overdue_count) + '</span>');
        if (Number(v.soon_count || 0) > 0) badges.push('<span class="badge badge--soon">快到期 ' + Number(v.soon_count) + '</span>');
        if (Number(v.ok_count || 0) > 0) badges.push('<span class="badge badge--ok">正常 ' + Number(v.ok_count) + '</span>');
        if (Number(v.na_count || 0) > 0) badges.push('<span class="badge badge--na">不需檢查 ' + Number(v.na_count) + '</span>');

        html += ''
          + '<div class="carb-item" data-id="' + esc(v.id) + '">'
          + '  <div class="carb-item__top">'
          + '    <div class="carb-item__code">' + esc(v.vehicle_code || '') + '</div>'
          + '    <div class="carb-item__plate">' + esc(v.plate_no || '') + '</div>'
          + '  </div>'
          + '  <div class="carb-item__meta">'
          + badges.join('')
          + '  </div>'
          + '</div>';
      }

      listEl.innerHTML = html;
      this.setActive(app.state.activeId);
    },

    setActive: function (id) {
      id = String(id || '');
      var listEl = this.app && this.app.els ? this.app.els.list : null;
      if (!listEl) return;

      var nodes = listEl.querySelectorAll('.carb-item');
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].classList.toggle('is-active', nodes[i].getAttribute('data-id') === id);
      }
    }
  };

  global.CarBaseList = Mod;

})(window);
