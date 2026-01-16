/* Path: Public/assets/js/car_base_detail.js
 * 說明: 右側基本資料（讀取/編輯模式/儲存/取消）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function setBtnLoading(btn, on) {
    if (!btn) return;
    btn.classList.toggle('is-loading', !!on);
    btn.disabled = !!on;
  }

  function toNumberOrNull(v) {
    if (v === '' || v === null || v === undefined) return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  var Mod = {
    app: null,
    form: null,
    dicts: null,
    _original: null,

    init: function (app) {
      this.app = app;
      this.form = qs('#carbDetailForm');
    },

    applyDicts: function (dicts) {
      this.dicts = dicts || {};
      // 若已選車，重填一次下拉
      this.fillSelects();
    },

    fillSelects: function () {
      var form = this.form;
      if (!form) return;

      var selType = qs('select[name="vehicle_type_id"]', form);
      var selBrand = qs('select[name="brand_id"]', form);
      var selBoom = qs('select[name="boom_type_id"]', form);

      function fill(sel, items, labelKey) {
        if (!sel) return;
        items = Array.isArray(items) ? items : [];
        var html = '<option value="">（未指定）</option>';
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          html += '<option value="' + String(it.id) + '">' + String(it.name || it[labelKey] || '') + '</option>';
        }
        sel.innerHTML = html;
      }

      fill(selType, (this.dicts && this.dicts.types) ? this.dicts.types : [], 'name');
      fill(selBrand, (this.dicts && this.dicts.brands) ? this.dicts.brands : [], 'name');
      fill(selBoom, (this.dicts && this.dicts.boom_types) ? this.dicts.boom_types : [], 'name');
    },

    bindData: function (payload) {
      payload = payload || {};
      var v = payload.vehicle || null;
      if (!v) return;

      this._original = JSON.parse(JSON.stringify(v));
      this.fillSelects();
      this.setForm(v);
      this.setEditMode(false);
    },

    reloadFromState: function () {
      var p = this.app && this.app.state ? this.app.state.active : null;
      if (!p || !p.vehicle) return;
      this._original = JSON.parse(JSON.stringify(p.vehicle));
      this.setForm(p.vehicle);
    },

    setForm: function (v) {
      var form = this.form;
      if (!form) return;

      function set(name, val) {
        var el = qs('[name="' + name + '"]', form);
        if (!el) return;

        if (el.type === 'checkbox') {
          el.checked = (String(val) === '1' || val === 1 || val === true);
          return;
        }

        el.value = (val === null || val === undefined) ? '' : String(val);
      }

      set('vehicle_code', v.vehicle_code);
      set('plate_no', v.plate_no);
      set('vehicle_type_id', v.vehicle_type_id);
      set('brand_id', v.brand_id);
      set('boom_type_id', v.boom_type_id);
      set('owner_name', v.owner_name);
      set('user_name', v.user_name);
      set('tonnage', v.tonnage);
      set('vehicle_year', v.vehicle_year);
      set('vehicle_price', v.vehicle_price);
      set('boom_price', v.boom_price);
      set('bucket_price', v.bucket_price);
      set('is_active', v.is_active);
      set('note', v.note);
    },

    clearForm: function () {
      this.fillSelects();
      this.setForm({
        vehicle_code: '',
        plate_no: '',
        vehicle_type_id: '',
        brand_id: '',
        boom_type_id: '',
        owner_name: '',
        user_name: '',
        tonnage: '',
        vehicle_year: '',
        vehicle_price: '',
        boom_price: '',
        bucket_price: '',
        is_active: 1,
        note: ''
      });
    },

    setMode: function (mode) {
      mode = String(mode || 'VIEW'); // VIEW | CREATE | EDIT
      var form = this.form;
      if (!form) return;

      var isCreate = (mode === 'CREATE');
      var isEdit = (mode === 'EDIT');
      var on = (isCreate || isEdit);

      // CREATE：vehicle_code 可輸入；EDIT：vehicle_code 永遠鎖
      var code = qs('[name="vehicle_code"]', form);
      if (code) code.disabled = !isCreate;

      var editable = [
        'plate_no', 'vehicle_type_id', 'brand_id', 'boom_type_id',
        'owner_name', 'user_name', 'tonnage', 'vehicle_year',
        'vehicle_price', 'boom_price', 'bucket_price', 'is_active', 'note'
      ];

      for (var i = 0; i < editable.length; i++) {
        var el = qs('[name="' + editable[i] + '"]', form);
        if (el) el.disabled = !on;
      }
    },

    collect: function () {
      var form = this.form;
      if (!form) return null;

      function val(name) {
        var el = qs('[name="' + name + '"]', form);
        if (!el) return null;

        if (el.type === 'checkbox') return el.checked ? 1 : 0;
        return el.value;
      }

      var mode = (this.app && this.app.state) ? String(this.app.state.mode || 'VIEW') : 'VIEW';

      var data = {
        // CREATE 不帶 id；EDIT 帶 id
        id: (mode === 'EDIT') ? Number(this.app.state.activeId) : null,

        // CREATE 必填：vehicle_code
        vehicle_code: (mode === 'CREATE') ? val('vehicle_code') : null,

        plate_no: val('plate_no'),
        vehicle_type_id: val('vehicle_type_id') || null,
        brand_id: val('brand_id') || null,
        boom_type_id: val('boom_type_id') || null,
        owner_name: val('owner_name'),
        user_name: val('user_name'),
        tonnage: toNumberOrNull(val('tonnage')),
        vehicle_year: toNumberOrNull(val('vehicle_year')),
        vehicle_price: toNumberOrNull(val('vehicle_price')),
        boom_price: toNumberOrNull(val('boom_price')),
        bucket_price: toNumberOrNull(val('bucket_price')),
        is_active: Number(val('is_active') || 0),
        note: val('note')
      };

      return data;
    },

    save: function () {
      var self = this;
      var app = this.app;
      var btn = app.els.saveBtn;

      var mode = (app && app.state) ? String(app.state.mode || 'VIEW') : 'VIEW';
      if (mode !== 'CREATE' && mode !== 'EDIT') return;

      var payload = this.collect();
      if (!payload) return;

      // CREATE 必填 vehicle_code
      if (mode === 'CREATE') {
        var vc = (payload.vehicle_code || '').trim();
        if (!vc) {
          Toast && Toast.show({ type: 'warning', title: '缺少車輛編號', message: '請輸入車輛編號（例：C-01）' });
          return;
        }
      }

      // EDIT 必須有 id
      if (mode === 'EDIT' && !payload.id) return;

      setBtnLoading(btn, true);

      var url = (mode === 'CREATE') ? '/api/car/car_create' : '/api/car/car_save';

      return apiPost(url, payload)
        .then(function (j) {
          setBtnLoading(btn, false);

          if (!j || !j.success) {
            Toast && Toast.show({ type: 'danger', title: '儲存失敗', message: (j && j.error) ? j.error : '未知錯誤' });
            return;
          }

          Toast && Toast.show({
            type: 'success',
            title: '已儲存',
            message: (mode === 'CREATE') ? '車輛已新增' : '基本資料已更新'
          });

          // CREATE：切回 VIEW + 選到新車
          if (mode === 'CREATE' && j.data && j.data.vehicle && j.data.vehicle.id) {
            var newId = Number(j.data.vehicle.id);

            app.loadList().then(function () {
              app.selectVehicle(newId);
            });

            return;
          }

          // EDIT：更新 state.active.vehicle（避免再次 get）
          if (mode === 'EDIT' && app.state.active && j.data && j.data.vehicle) {
            app.state.active.vehicle = j.data.vehicle;
            app.setActiveMeta();
            app.loadList();
            app.setMode('VIEW');
          }
        })
        .catch(function (e) {
          setBtnLoading(btn, false);
          Toast && Toast.show({ type: 'danger', title: '儲存失敗', message: (e && e.message) ? e.message : '未知錯誤' });
        });
    }
  };

  global.CarBaseDetail = Mod;

})(window);
