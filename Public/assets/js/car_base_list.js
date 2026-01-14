/* Path: Public/assets/js/car_base_list.js
 * 說明: 左側車輛清單（載入後渲染、搜尋、篩選、高亮、切換）
 * 定版：
 * - 左側不提供排序 UI（仍用 vehicle_code_asc 當預設排序）
 * - 篩選膠囊：all / soon / overdue / na
 * - 清單 badge 僅顯示：快到期、已逾期
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function normalize(s) {
    return (s === null || s === undefined) ? '' : String(s).toLowerCase();
  }

  function n(v) { return Number(v || 0); }

  var Mod = {
    app: null,
    _raw: [],
    _view: [],
    _filter: 'all', // all | soon | overdue | na

    init: function (app) {
      this.app = app;

      var search = app.els.search;
      if (search) {
        search.addEventListener('input', this.apply.bind(this));
      }

      // 篩選膠囊
      var filterHost = qs('.carb-filters');
      if (filterHost) {
        filterHost.addEventListener('click', function (e) {
          var btn = e.target;
          while (btn && btn !== filterHost && !(btn.matches && btn.matches('.carb-pill'))) {
            btn = btn.parentNode;
          }
          if (!btn || btn === filterHost) return;

          var f = String(btn.getAttribute('data-filter') || 'all');
          Mod.setFilter(f);
        });
      }

      // 委派點擊（選車）
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

    setFilter: function (f) {
      f = String(f || 'all');
      if (['all', 'soon', 'overdue', 'na'].indexOf(f) === -1) f = 'all';
      this._filter = f;

      // 更新 UI active
      var host = qs('.carb-filters');
      if (host) {
        qsa('.carb-pill', host).forEach(function (b) {
          b.classList.toggle('is-active', (b.getAttribute('data-filter') || 'all') === f);
        });
      }

      this.apply();
    },

    render: function (vehicles) {
      this._raw = Array.isArray(vehicles) ? vehicles : [];
      this.apply();
    },

    apply: function () {
      var app = this.app;

      var search = normalize(app.els.search ? app.els.search.value : '');

      // 預設排序（沒有 UI）
      var sortEl = document.getElementById('carbSort');
      var sort = sortEl ? String(sortEl.value || 'vehicle_code_asc') : 'vehicle_code_asc';

      var rows = this._raw.slice();

      // search filter
      if (search) {
        rows = rows.filter(function (v) {
          var hay = [
            v.vehicle_code, v.plate_no, v.owner_name, v.user_name,
            v.type_name, v.brand_name, v.boom_type_name
          ].map(normalize).join(' ');
          return hay.indexOf(search) !== -1;
        });
      }

      // pill filter（依「有沒有該狀態」做篩選）
      var f = this._filter;
      if (f === 'soon') {
        rows = rows.filter(function (v) { return n(v.soon_count) > 0; });
      } else if (f === 'overdue') {
        rows = rows.filter(function (v) { return n(v.overdue_count) > 0; });
      } else if (f === 'na') {
        // 解讀：「不需檢查」= 只有不需檢查，且沒有快到期/逾期
        rows = rows.filter(function (v) {
          return n(v.na_count) > 0 && n(v.overdue_count) === 0 && n(v.soon_count) === 0;
        });
      }

      // sort（保留既有規則）
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
        if (sort === 'ins_overdue_desc') return (n(b.overdue_count) - n(a.overdue_count));
        if (sort === 'updated_desc') return (n(b.updated_ts) - n(a.updated_ts));
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
        if (n(v.overdue_count) > 0) badges.push('<span class="badge badge--over">已逾期 ' + n(v.overdue_count) + '</span>');
        if (n(v.soon_count) > 0) badges.push('<span class="badge badge--soon">快到期 ' + n(v.soon_count) + '</span>');

        html += ''
          + '<div class="carb-item" data-id="' + esc(v.id) + '">'
          + '  <div class="carb-item__row">'
          + '    <div class="carb-item__code">' + esc(v.vehicle_code || '') + '</div>'
          + '    <div class="carb-item__meta">' + (badges.length ? badges.join('') : '') + '</div>'
          + '    <div class="carb-item__plate">' + esc(v.plate_no || '') + '</div>'
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
