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
      this.bindVehicleCode();
      this.bindNewOptionToggles();
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
        html += '<option value="__NEW__">＋新增…</option>';
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
      this.setMode('VIEW');
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
      // ✅ setForm 是程式回填 select.value，不會觸發 change
      //    手動派發 change，讓 bindNewOptionToggles 的 sync() 重新判斷要不要顯示 *_new
      var s1 = qs('select[name="vehicle_type_id"]', form);
      var s2 = qs('select[name="brand_id"]', form);
      var s3 = qs('select[name="boom_type_id"]', form);
      if (s1) s1.dispatchEvent(new Event('change'));
      if (s2) s2.dispatchEvent(new Event('change'));
      if (s3) s3.dispatchEvent(new Event('change'));

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

    bindNewOptionToggles: function () {
      var form = this.form;
      if (!form) return;

      function wire(selectName, inputName) {
        var sel = qs('select[name="' + selectName + '"]', form);
        var inp = qs('input[name="' + inputName + '"]', form);
        if (!sel || !inp) return;

        function sync() {
          var isNew = (String(sel.value || '') === '__NEW__');
          inp.hidden = !isNew;
          inp.disabled = !isNew;

          if (!isNew) {
            inp.value = '';
          } else {
            // 進入新輸入模式時，自動 focus
            setTimeout(function () { try { inp.focus(); } catch (e) { } }, 0);
          }
        }

        sel.addEventListener('change', sync);
        sync();
      }

      wire('vehicle_type_id', 'vehicle_type_new');
      wire('brand_id', 'brand_new');
      wire('boom_type_id', 'boom_type_new');
    },

    bindVehicleCode: function () {
      var self = this;
      var form = this.form;
      if (!form) return;

      var el = qs('[name="vehicle_code"]', form);
      if (!el) return;

      // 建議：用 title 當最簡單的即時提示（不改版面、不加 HTML）
      var setHint = function (msg) {
        el.setCustomValidity(msg || '');
        el.title = msg || '';
      };

      // debounce 查重
      if (!this._vcTimer) this._vcTimer = null;

      el.addEventListener('input', function () {
        // 只有 CREATE 才處理
        var mode = (self.app && self.app.state) ? String(self.app.state.mode || 'VIEW') : 'VIEW';
        if (mode !== 'CREATE') { setHint(''); return; }

        var v = String(el.value || '');

        // 去空白
        v = v.replace(/\s+/g, '');

        // 第一碼處理：轉大寫 + 自動補 '-'
        if (v.length >= 1) {
          var c0 = v.charAt(0);
          if (!/[A-Za-z]/.test(c0)) {
            setHint('第一碼請輸入英文字母，例如 A-01');
          } else {
            setHint('');
            var up = c0.toUpperCase();
            v = up + v.slice(1);

            // 若目前只有一碼字母，直接補 '-'
            if (v.length === 1) v = up + '-';

            // 若是 A01 這種（第二碼是數字），自動補成 A-01
            if (v.length >= 2 && v.charAt(1) !== '-') {
              v = up + '-' + v.slice(1);
            }
          }
        }

        // 第二段只允許兩碼數字（但不要太激進刪除；先做提示）
        if (v.length >= 3) {
          var tail = v.slice(2);
          // 若出現字母，提示
          if (/[A-Za-z]/.test(tail)) {
            setHint('後兩碼請輸入數字，例如 A-01');
          } else {
            // 限制最多兩碼（多的先截斷，避免髒輸入）
            if (tail.length > 2) tail = tail.slice(0, 2);
            v = v.slice(0, 2) + tail;
            // 若剛好兩碼且都數字，清除格式提示
            if (/^[A-Z]-\d{2}$/.test(v)) setHint('');
          }
        }

        // 回寫（避免游標亂跳：只在值確實變了才回寫）
        if (el.value !== v) {
          el.value = v;
        }

        // 查重提示：只在完整格式才查 + debounce
        if (self._vcTimer) clearTimeout(self._vcTimer);
        self._vcTimer = setTimeout(function () {
          self.checkVehicleCodeDup();
        }, 350);
      });

      // blur 時再做一次完整正規化與查重
      el.addEventListener('blur', function () {
        var mode = (self.app && self.app.state) ? String(self.app.state.mode || 'VIEW') : 'VIEW';
        if (mode !== 'CREATE') return;
        self.checkVehicleCodeDup(true);
      });
    },

    checkVehicleCodeDup: function (force) {
      var form = this.form;
      if (!form) return;

      var el = qs('[name="vehicle_code"]', form);
      if (!el) return;

      var mode = (this.app && this.app.state) ? String(this.app.state.mode || 'VIEW') : 'VIEW';
      if (mode !== 'CREATE') { el.setCustomValidity(''); return; }

      var v = String(el.value || '').replace(/\s+/g, '');

      // 只有完整格式才查重（避免吵）
      if (!/^[A-Z]-\d{2}$/.test(v)) {
        // force 時（離開欄位）給一次總提示
        if (force && v !== '') el.setCustomValidity('格式需為 A-01（英文字母 + 兩碼）');
        else el.setCustomValidity('');
        return;
      }

      // 用 car_list 的結果查重：app.state.list
      var list = (this.app && this.app.state && Array.isArray(this.app.state.list)) ? this.app.state.list : [];
      var dup = false;
      for (var i = 0; i < list.length; i++) {
        var code = String(list[i].vehicle_code || '').trim().toUpperCase();
        if (code === v) { dup = true; break; }
      }

      if (dup) {
        el.setCustomValidity('此車輛編號已存在，請確認左邊列表編號');
      } else {
        el.setCustomValidity('');
      }
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
      // ✅ 新增文字欄位：跟著 CREATE/EDIT 解鎖（顯示/啟用仍由 bindNewOptionToggles 控制）
      var newFields = ['vehicle_type_new', 'brand_new', 'boom_type_new'];
      for (var k = 0; k < newFields.length; k++) {
        var nf = qs('[name="' + newFields[k] + '"]', form);
        if (nf) nf.disabled = !on;
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

      var typeId = val('vehicle_type_id') || null;
      var brandId = val('brand_id') || null;
      var boomId = val('boom_type_id') || null;

      var data = {
        id: (mode === 'EDIT') ? Number(this.app.state.activeId) : null,
        vehicle_code: (mode === 'CREATE') ? val('vehicle_code') : null,

        plate_no: val('plate_no'),

        // ✅ 若選「＋新增…」，id 不送（改走 *_new）
        vehicle_type_id: (typeId === '__NEW__') ? null : typeId,
        brand_id: (brandId === '__NEW__') ? null : brandId,
        boom_type_id: (boomId === '__NEW__') ? null : boomId,

        // ✅ 新增文字欄位一併送出（後端會負責寫入字典表並回填 id）
        vehicle_type_new: (typeId === '__NEW__') ? (val('vehicle_type_new') || '') : '',
        brand_new: (brandId === '__NEW__') ? (val('brand_new') || '') : '',
        boom_type_new: (boomId === '__NEW__') ? (val('boom_type_new') || '') : '',

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
        var vc = String(payload.vehicle_code || '').trim();

        if (!vc) {
          Toast && Toast.show({ type: 'warning', title: '缺少車輛編號', message: '請輸入車輛編號（例：A-01）' });
          return;
        }

        // 依前端定版：必須是 A-01
        if (!/^[A-Za-z]-?\d{2}$/.test(vc.replace(/\s+/g, ''))) {
          Toast && Toast.show({ type: 'warning', title: '車輛編號格式不正確', message: '格式需為 A-01（英文字母 + 兩碼）' });
          return;
        }

        // ✅ 讓 setCustomValidity 生效：#carbDetailForm 可能不是 <form>，所以改用欄位本身判斷
        var vcEl = this.form ? qs('[name="vehicle_code"]', this.form) : null;
        if (vcEl) {
          // 若有真正 <form> 才用 checkValidity
          var realForm = (vcEl.form && typeof vcEl.form.checkValidity === 'function') ? vcEl.form : null;
          var ok = true;

          if (realForm) {
            ok = realForm.checkValidity();
          } else {
            // 沒有 <form>：看欄位自己的 validity
            ok = !vcEl.validationMessage;
          }

          if (!ok) {
            Toast && Toast.show({
              type: 'warning',
              title: '請修正車輛編號',
              message: vcEl.validationMessage || '車輛編號不正確'
            });
            vcEl.focus();
            return;
          }
        }

      }

      // ✅ 必填欄位檢查（CREATE / EDIT 都要）
      var missing = [];

      function reqText(field, label) {
        var v = String(payload[field] || '').trim();
        if (!v) missing.push(label);
      }
      function reqSelect(field, label) {
        var v = String(payload[field] || '').trim();
        if (!v) missing.push(label);
      }
      function reqPositiveNumber(field, label) {
        var v = payload[field];
        if (v === null || v === '' || v === undefined) { missing.push(label); return; }
        var n = Number(v);
        if (!isFinite(n) || n <= 0) missing.push(label);
      }
      function reqYear(field, label) {
        var v = String(payload[field] || '').trim();
        if (!v) { missing.push(label); return; }
        // 只允許 4 碼年份，可自行調整範圍
        if (!/^\d{4}$/.test(v)) { missing.push(label); return; }
        var y = Number(v);
        if (y < 1980 || y > 2100) missing.push(label);
      }

      reqText('plate_no', '車牌號碼');
      function reqSelectOrNew(idField, newField, label) {
        var idv = String(payload[idField] || '').trim();
        var nv = String(payload[newField] || '').trim();
        if (!idv && !nv) missing.push(label);
      }

      reqSelectOrNew('vehicle_type_id', 'vehicle_type_new', '車輛類型');
      reqSelectOrNew('brand_id', 'brand_new', '廠牌');
      reqSelectOrNew('boom_type_id', 'boom_type_new', '吊臂型式');

      reqPositiveNumber('tonnage', '噸數');
      reqYear('vehicle_year', '出廠年份');
      reqText('owner_name', '車主');

      if (missing.length) {
        Toast && Toast.show({
          type: 'warning',
          title: '必填欄位未填',
          message: '請填寫：' + missing.join('、')
        });
        return;
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

            // ✅ 先等 dicts 更新（確保新 brand/type/boom 的 option 已存在）
            return app.loadDicts()
              .then(function () { return app.loadList(); })
              .then(function () { return app.selectVehicle(newId); });
          }

          // EDIT：更新 state.active.vehicle（避免再次 get）+ 同步表單（把 ＋新增… 收起來）
          if (mode === 'EDIT' && app.state.active && j.data && j.data.vehicle) {
            app.state.active.vehicle = j.data.vehicle;

            var usedNew =
              (payload && (payload.vehicle_type_new || payload.brand_new || payload.boom_type_new)) ? true : false;

            // ✅ 先更新列表/標題（不影響 select）
            app.setActiveMeta();
            app.loadList();

            if (usedNew && typeof app.loadDicts === 'function') {
              // ✅ 關鍵：等 dicts 更新完成（options 有新項目）後再回填表單
              return app.loadDicts().then(function () {
                self.fillSelects();         // 讓 select options 變成最新
                self.setForm(j.data.vehicle); // 再設定 select.value 才會成功
                app.setMode('VIEW');
                return true;
              });
            }

            // 未新增字典：直接回填即可
            self.setForm(j.data.vehicle);
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
