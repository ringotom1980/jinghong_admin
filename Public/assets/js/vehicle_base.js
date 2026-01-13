/* Path: Public/assets/js/vehicle_base.js
 * 說明: 車輛基本資料頁前端控制器（Orchestrator）
 * - 依賴：api.js / ui_toast.js / ui_modal.js
 * - 子模組：vehicle_base_list / detail / inspections / photo
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function n(v) {
    if (v === null || v === undefined || v === '') return null;
    var num = Number(v);
    return isNaN(num) ? null : num;
  }

  function trim(v) {
    return String(v === null || v === undefined ? '' : v).trim();
  }

  function setBtnLoading(btn, yes) {
    if (!btn) return;
    btn.classList.toggle('is-loading', !!yes);
    btn.disabled = !!yes;
  }

  var App = {
    els: {},
    dicts: {
      vehicle_types: [],
      brands: [],
      boom_types: [],
      inspection_types: []
    },
    state: {
      rows: [],
      currentId: null,
      current: null,
      inspections: [],
      rules: []
    },

    init: function () {
      this.cacheEls();
      this.bindUI();
      this.initTabs();

      // init sub modules
      if (global.VehicleBaseList && global.VehicleBaseList.init) global.VehicleBaseList.init(this);
      if (global.VehicleBaseDetail && global.VehicleBaseDetail.init) global.VehicleBaseDetail.init(this);
      if (global.VehicleBaseInspections && global.VehicleBaseInspections.init) global.VehicleBaseInspections.init(this);
      if (global.VehicleBasePhoto && global.VehicleBasePhoto.init) global.VehicleBasePhoto.init(this);

      this.bootstrap();
    },

    cacheEls: function () {
      this.els.q = qs('#vbQ');
      this.els.activeOnly = qs('#vbActiveOnly');
      this.els.btnReload = qs('#vbBtnReload');
      this.els.btnNew = qs('#vbBtnNew');

      this.els.countBadge = qs('#vbCountBadge');
      this.els.listTbody = qs('#vbListTbody');

      this.els.detailTitle = qs('#vbDetailTitle');
      this.els.detailMeta = qs('#vbDetailMeta');
      this.els.btnReset = qs('#vbBtnReset');
      this.els.btnSave = qs('#vbBtnSave');

      this.els.btnSaveInspections = qs('#vbBtnSaveInspections');
      this.els.inspectionsWrap = qs('#vbInspectionsWrap');

      this.els.photoFile = qs('#vbPhotoFile');
      this.els.btnUploadPhoto = qs('#vbBtnUploadPhoto');
      this.els.photoImg = qs('#vbPhotoImg');
      this.els.photoEmpty = qs('#vbPhotoEmpty');

      // form fields
      this.els.id = qs('#vbId');
      this.els.vehicle_code = qs('#vbVehicleCode');
      this.els.plate_no = qs('#vbPlateNo');
      this.els.vehicle_type_id = qs('#vbVehicleTypeId');
      this.els.brand_id = qs('#vbBrandId');
      this.els.boom_type_id = qs('#vbBoomTypeId');
      this.els.owner_name = qs('#vbOwnerName');
      this.els.user_name = qs('#vbUserName');
      this.els.tonnage = qs('#vbTonnage');
      this.els.vehicle_year = qs('#vbVehicleYear');
      this.els.vehicle_price = qs('#vbVehiclePrice');
      this.els.boom_price = qs('#vbBoomPrice');
      this.els.bucket_price = qs('#vbBucketPrice');
      this.els.is_active = qs('#vbIsActive');
      this.els.note = qs('#vbNote');
    },

    bindUI: function () {
      var self = this;

      if (this.els.btnReload) {
        this.els.btnReload.addEventListener('click', function () {
          self.loadList();
        });
      }

      if (this.els.btnNew) {
        this.els.btnNew.addEventListener('click', function () {
          self.newVehicle();
        });
      }

      if (this.els.q) {
        var t = null;
        this.els.q.addEventListener('input', function () {
          if (t) window.clearTimeout(t);
          t = window.setTimeout(function () {
            self.loadList();
          }, 220);
        });
      }

      if (this.els.activeOnly) {
        this.els.activeOnly.addEventListener('change', function () {
          self.loadList();
        });
      }

      if (this.els.btnSave) {
        this.els.btnSave.addEventListener('click', function () {
          self.saveVehicle();
        });
      }

      if (this.els.btnReset) {
        this.els.btnReset.addEventListener('click', function () {
          self.resetDetail();
        });
      }

      if (this.els.btnSaveInspections) {
        this.els.btnSaveInspections.addEventListener('click', function () {
          self.saveInspections();
        });
      }

      if (this.els.btnUploadPhoto) {
        this.els.btnUploadPhoto.addEventListener('click', function () {
          self.uploadPhoto();
        });
      }
    },

    initTabs: function () {
      qsa('.vb-tab').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tab = btn.getAttribute('data-tab') || 'detail';

          qsa('.vb-tab').forEach(function (b) { b.classList.toggle('is-active', b === btn); });
          qsa('.vb-panel').forEach(function (p) {
            p.classList.toggle('is-active', (p.getAttribute('data-panel') === tab));
          });
        });
      });
    },

    bootstrap: function () {
      var self = this;
      self.loadDicts()
        .then(function () {
          self.renderDictsToSelects();
          return self.loadList();
        })
        .catch(function (e) {
          self.toast('danger', '初始化失敗', (e && e.message) ? e.message : 'unknown error');
        });
    },

    toast: function (type, title, message, duration) {
      if (!global.Toast || !global.Toast.show) return;
      global.Toast.show({
        type: type || 'info',
        title: title || '',
        message: message || '',
        duration: (duration === 0) ? 0 : (duration || 2600)
      });
    },

    loadDicts: function () {
      var self = this;
      return global.apiGet('/api/vehicle/vehicle_dicts')
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入字典失敗');
          self.dicts = j.data || self.dicts;
        });
    },

    renderDictsToSelects: function () {
      var self = this;

      function fillSelect(sel, rows, idKey, nameKey) {
        if (!sel) return;
        sel.innerHTML = '';
        var opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = '（未指定）';
        sel.appendChild(opt0);

        (rows || []).forEach(function (r) {
          var opt = document.createElement('option');
          opt.value = String(r[idKey]);
          opt.textContent = String(r[nameKey]);
          sel.appendChild(opt);
        });
      }

      fillSelect(this.els.vehicle_type_id, self.dicts.vehicle_types, 'id', 'name');
      fillSelect(this.els.brand_id, self.dicts.brands, 'id', 'name');
      fillSelect(this.els.boom_type_id, self.dicts.boom_types, 'id', 'name');
    },

    loadList: function () {
      var self = this;
      var q = trim(self.els.q ? self.els.q.value : '');
      var activeOnly = !!(self.els.activeOnly && self.els.activeOnly.checked);

      setBtnLoading(self.els.btnReload, true);

      var url = '/api/vehicle/vehicle_list?q=' + encodeURIComponent(q) + '&active_only=' + (activeOnly ? '1' : '0');

      return global.apiGet(url)
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入列表失敗');

          self.state.rows = (j.data && j.data.rows) ? j.data.rows : [];
          if (global.VehicleBaseList && global.VehicleBaseList.render) {
            global.VehicleBaseList.render(self.state.rows);
          }

          if (self.els.countBadge) self.els.countBadge.textContent = String(self.state.rows.length || 0);

          // auto select
          if (!self.state.currentId && self.state.rows.length) {
            self.selectVehicle(self.state.rows[0].id);
          } else if (self.state.currentId) {
            // 若目前車輛不在列表中（例如切 active_only），則改選第一筆或清空
            var still = self.state.rows.some(function (r) { return String(r.id) === String(self.state.currentId); });
            if (!still) {
              if (self.state.rows.length) self.selectVehicle(self.state.rows[0].id);
              else self.clearDetail();
            }
          } else if (!self.state.rows.length) {
            self.clearDetail();
          }
        })
        .catch(function (e) {
          self.toast('danger', '載入失敗', (e && e.message) ? e.message : 'unknown');
          if (global.VehicleBaseList && global.VehicleBaseList.renderError) {
            global.VehicleBaseList.renderError('載入失敗');
          }
        })
        .finally(function () {
          setBtnLoading(self.els.btnReload, false);
        });
    },

    selectVehicle: function (id) {
      var self = this;
      if (!id) return;

      self.state.currentId = id;

      if (global.VehicleBaseList && global.VehicleBaseList.setActive) {
        global.VehicleBaseList.setActive(id);
      }

      return global.apiGet('/api/vehicle/vehicle_get?id=' + encodeURIComponent(String(id)))
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入明細失敗');

          var data = j.data || {};
          self.state.current = data.vehicle || null;
          self.state.inspections = data.inspections || [];
          self.state.rules = data.rules || [];

          if (global.VehicleBaseDetail && global.VehicleBaseDetail.fill) {
            global.VehicleBaseDetail.fill(self.state.current);
          }

          if (global.VehicleBaseInspections && global.VehicleBaseInspections.render) {
            global.VehicleBaseInspections.render(self.dicts.inspection_types || [], self.state.inspections, self.state.rules);
          }

          if (global.VehicleBasePhoto && global.VehicleBasePhoto.render) {
            global.VehicleBasePhoto.render(self.state.current);
          }

          self.updateDetailTitle();
        })
        .catch(function (e) {
          self.toast('danger', '載入明細失敗', (e && e.message) ? e.message : 'unknown');
        });
    },

    updateDetailTitle: function () {
      var v = this.state.current;
      if (!v) {
        if (this.els.detailTitle) this.els.detailTitle.textContent = '車輛明細';
        if (this.els.detailMeta) this.els.detailMeta.textContent = '';
        return;
      }
      if (this.els.detailTitle) this.els.detailTitle.textContent = '車輛明細｜' + (v.vehicle_code || '');
      var meta = [];
      if (v.plate_no) meta.push('車牌：' + v.plate_no);
      meta.push('ID：' + v.id);
      if (this.els.detailMeta) this.els.detailMeta.textContent = meta.join('　');
    },

    readForm: function () {
      var self = this;
      return {
        id: trim(self.els.id ? self.els.id.value : '') || null,
        vehicle_code: trim(self.els.vehicle_code ? self.els.vehicle_code.value : ''),
        plate_no: trim(self.els.plate_no ? self.els.plate_no.value : ''),
        vehicle_type_id: trim(self.els.vehicle_type_id ? self.els.vehicle_type_id.value : '') || null,
        brand_id: trim(self.els.brand_id ? self.els.brand_id.value : '') || null,
        boom_type_id: trim(self.els.boom_type_id ? self.els.boom_type_id.value : '') || null,
        owner_name: trim(self.els.owner_name ? self.els.owner_name.value : ''),
        user_name: trim(self.els.user_name ? self.els.user_name.value : ''),
        tonnage: (self.els.tonnage ? self.els.tonnage.value : ''),
        vehicle_year: (self.els.vehicle_year ? self.els.vehicle_year.value : ''),
        vehicle_price: (self.els.vehicle_price ? self.els.vehicle_price.value : ''),
        boom_price: (self.els.boom_price ? self.els.boom_price.value : ''),
        bucket_price: (self.els.bucket_price ? self.els.bucket_price.value : ''),
        is_active: !!(self.els.is_active && self.els.is_active.checked),
        note: trim(self.els.note ? self.els.note.value : '')
      };
    },

    validateForm: function (p) {
      if (!p.vehicle_code) return '車輛編號不可空白';
      if (String(p.vehicle_code).length > 10) return '車輛編號長度不可超過 10';
      if (p.plate_no && String(p.plate_no).length > 30) return '車牌號碼長度不可超過 30';

      // number fields normalize
      var yr = trim(p.vehicle_year);
      if (yr) {
        var y = Number(yr);
        if (isNaN(y) || y < 1900 || y > 2200) return '出廠年份格式不正確';
      }
      return '';
    },

    saveVehicle: function () {
      var self = this;
      var payload = self.readForm();
      var err = self.validateForm(payload);
      if (err) {
        self.toast('warning', '請確認', err);
        return;
      }

      // normalize numeric
      payload.tonnage = n(payload.tonnage);
      payload.vehicle_year = payload.vehicle_year ? Number(payload.vehicle_year) : null;
      payload.vehicle_price = n(payload.vehicle_price);
      payload.boom_price = n(payload.boom_price);
      payload.bucket_price = n(payload.bucket_price);

      // ids numeric
      payload.id = payload.id ? Number(payload.id) : null;
      payload.vehicle_type_id = payload.vehicle_type_id ? Number(payload.vehicle_type_id) : null;
      payload.brand_id = payload.brand_id ? Number(payload.brand_id) : null;
      payload.boom_type_id = payload.boom_type_id ? Number(payload.boom_type_id) : null;

      setBtnLoading(self.els.btnSave, true);

      global.apiPost('/api/vehicle/vehicle_save', payload)
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : '儲存失敗');

          var data = j.data || {};
          self.toast('success', '已儲存', '車輛資料已更新');

          // reload list and reselect
          var savedId = data.id;
          return self.loadList().then(function () {
            if (savedId) self.selectVehicle(savedId);
          });
        })
        .catch(function (e) {
          self.toast('danger', '儲存失敗', (e && e.message) ? e.message : 'unknown');
        })
        .finally(function () {
          setBtnLoading(self.els.btnSave, false);
        });
    },

    resetDetail: function () {
      var self = this;
      if (!self.state.currentId) {
        self.newVehicle();
        return;
      }
      self.selectVehicle(self.state.currentId);
      self.toast('info', '已重置', '已還原為伺服器最新資料', 1800);
    },

    clearDetail: function () {
      this.state.currentId = null;
      this.state.current = null;
      this.state.inspections = [];
      this.state.rules = [];

      if (global.VehicleBaseList && global.VehicleBaseList.setActive) global.VehicleBaseList.setActive(null);
      if (global.VehicleBaseDetail && global.VehicleBaseDetail.fill) global.VehicleBaseDetail.fill(null);
      if (global.VehicleBaseInspections && global.VehicleBaseInspections.renderEmpty) global.VehicleBaseInspections.renderEmpty();
      if (global.VehicleBasePhoto && global.VehicleBasePhoto.render) global.VehicleBasePhoto.render(null);

      this.updateDetailTitle();
    },

    newVehicle: function () {
      this.state.currentId = null;
      this.state.current = {
        id: null,
        vehicle_code: '',
        plate_no: '',
        vehicle_type_id: null,
        brand_id: null,
        boom_type_id: null,
        owner_name: '',
        user_name: '',
        tonnage: null,
        vehicle_year: null,
        vehicle_price: null,
        boom_price: null,
        bucket_price: null,
        is_active: 1,
        note: '',
        photo_path: null
      };

      if (global.VehicleBaseList && global.VehicleBaseList.setActive) global.VehicleBaseList.setActive(null);
      if (global.VehicleBaseDetail && global.VehicleBaseDetail.fill) global.VehicleBaseDetail.fill(this.state.current);
      if (global.VehicleBaseInspections && global.VehicleBaseInspections.renderNew) {
        global.VehicleBaseInspections.renderNew(this.dicts.inspection_types || []);
      } else if (global.VehicleBaseInspections && global.VehicleBaseInspections.render) {
        global.VehicleBaseInspections.render(this.dicts.inspection_types || [], [], []);
      }
      if (global.VehicleBasePhoto && global.VehicleBasePhoto.render) global.VehicleBasePhoto.render(this.state.current);

      this.updateDetailTitle();
      this.toast('info', '新增模式', '請輸入基本資料後按「儲存」', 2200);
    },

    saveInspections: function () {
      var self = this;
      var id = self.state.currentId || (self.els.id ? trim(self.els.id.value) : '');
      if (!id) {
        self.toast('warning', '請先儲存車輛', '新增車輛需先建立主檔後才能設定檢查');
        return;
      }

      if (!global.VehicleBaseInspections || !global.VehicleBaseInspections.collect) {
        self.toast('danger', '缺少模組', 'vehicle_base_inspections.js 未載入');
        return;
      }

      var pack = global.VehicleBaseInspections.collect();
      var payload = {
        vehicle_id: Number(id),
        inspections: pack.inspections || [],
        rules: pack.rules || []
      };

      setBtnLoading(self.els.btnSaveInspections, true);

      global.apiPost('/api/vehicle/vehicle_inspection_save', payload)
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : '儲存失敗');
          self.toast('success', '已儲存', '檢查設定已更新');

          // reload detail
          return self.selectVehicle(Number(id));
        })
        .catch(function (e) {
          self.toast('danger', '儲存失敗', (e && e.message) ? e.message : 'unknown');
        })
        .finally(function () {
          setBtnLoading(self.els.btnSaveInspections, false);
        });
    },

    uploadPhoto: function () {
      var self = this;
      var id = self.state.currentId || (self.els.id ? trim(self.els.id.value) : '');
      if (!id) {
        self.toast('warning', '請先儲存車輛', '新增車輛需先建立主檔後才能上傳照片');
        return;
      }

      var fileEl = self.els.photoFile;
      if (!fileEl || !fileEl.files || !fileEl.files.length) {
        self.toast('warning', '未選檔案', '請先選擇圖片檔');
        return;
      }

      var f = fileEl.files[0];
      var fd = new FormData();
      fd.append('vehicle_id', String(id));
      fd.append('photo', f);

      setBtnLoading(self.els.btnUploadPhoto, true);

      global.apiPostForm('/api/vehicle/vehicle_photo_upload', fd)
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.error) ? j.error : '上傳失敗');

          self.toast('success', '已上傳', '照片已更新');
          fileEl.value = '';

          // refresh detail
          return self.selectVehicle(Number(id));
        })
        .catch(function (e) {
          self.toast('danger', '上傳失敗', (e && e.message) ? e.message : 'unknown');
        })
        .finally(function () {
          setBtnLoading(self.els.btnUploadPhoto, false);
        });
    }
  };

  global.VehicleBaseApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    try { App.init(); } catch (e) {}
  });

})(window);
