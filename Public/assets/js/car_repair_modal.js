/* Path: Public/assets/js/car_repair_modal.js
 * 說明: 維修紀錄 modal（新增/編輯同一套 UI）
 * - vendor 單欄位：可輸入 id（純數字）或 name（文字）
 * - totals 前端即時計算；存檔後以後端重算覆蓋（防竄改）
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

  function n2(v) {
    var x = Number(v || 0);
    return x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  var Mod = {
    app: null,
    state: {
      mode: 'CREATE', // CREATE | EDIT
      id: 0,
      vehicles: [],
      data: null
    },

    init: function (app) {
      this.app = app;
      if (global.CarRepairItems) global.CarRepairItems.init(this);
      if (global.CarRepairVendors) global.CarRepairVendors.init(this);
    },

    openCreate: function () {
      this.state.mode = 'CREATE';
      this.state.id = 0;
      this.state.data = {
        header: {
          vehicle_id: '',
          repair_date: todayStr(),
          vendor: '',
          repair_type: '維修',
          mileage: '',
          note: ''
        },
        items: [
          { seq: 1, content: '', team_amount: 0, company_amount: 0 }
        ]
      };
      this.ensureVehiclesAndOpen();
    },

    openEdit: function (id) {
      var self = this;
      this.state.mode = 'EDIT';
      this.state.id = Number(id || 0);

      if (!global.apiGet) return;

      global.apiGet('/api/car/car_repair_get?id=' + encodeURIComponent(String(this.state.id))).then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '讀取失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          return;
        }
        self.state.data = j.data || null;
        self.ensureVehiclesAndOpen();
      });
    },

    ensureVehiclesAndOpen: function () {
      var self = this;

      if (this.state.vehicles && this.state.vehicles.length) {
        self.openModal();
        return;
      }

      if (!global.apiGet) return;

      global.apiGet('/api/car/car_list').then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '載入車輛清單失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          return;
        }
        self.state.vehicles = (j.data && j.data.vehicles) ? j.data.vehicles : [];
        self.openModal();
      });
    },

    openModal: function () {
      var self = this;
      if (!global.Modal) return;

      var title = (this.state.mode === 'EDIT') ? '編輯維修紀錄' : '新增維修紀錄';

      var bd = Modal.open({
        title: title,
        html: this.buildHtml(),
        confirmText: '存檔',
        cancelText: '取消',
        allowCloseBtn: true,
        closeOnBackdrop: true,
        closeOnEsc: true,
        onConfirm: function () { return self.onSave(); },
        onCancel: function () { }
      });

      // ✅ 只標記「維修紀錄 modal」用（不影響其他頁的 modal）
      if (bd && bd.classList) bd.classList.add('modal--car-repair');

      setTimeout(function () {
        self.bindModalEvents();
        self.fillFormFromState();
        self.recalcTotals();
      }, 0);
    },

    buildHtml: function () {
      // 版型定版：
      // 第一列：車輛、維修日期、類別、維修廠商、里程數
      // 第二列：備註（全寬）
      return ''
        + '<div class="crm">'
        + '  <div class="crm-grid">'
        + '    <div class="crm-field">'
        + '      <label class="form-label">車輛</label>'
        + '      <select class="input" id="crmVehicle"></select>'
        + '    </div>'

        + '    <div class="crm-field">'
        + '      <label class="form-label">維修日期</label>'
        + '      <input class="input" type="date" id="crmRepairDate" />'
        + '    </div>'

        + '    <div class="crm-field">'
        + '      <label class="form-label">類別</label>'
        + '      <select class="input" id="crmRepairType">'
        + '        <option value="維修">維修</option>'
        + '        <option value="保養">保養</option>'
        + '      </select>'
        + '    </div>'

        + '    <div class="crm-field crm-vendorSuggest">'
        + '      <label class="form-label">維修廠商</label>'
        + '      <input class="input" type="text" id="crmVendor" placeholder="例：12 或 XX保養廠" autocomplete="off" />'
        + '      <div class="crm-suggestList" id="crmSuggest" hidden></div>'
        + '    </div>'

        + '    <div class="crm-field">'
        + '      <label class="form-label">里程數</label>'
        + '      <input class="input" type="number" id="crmMileage" placeholder="可空白" />'
        + '    </div>'

        + '    <div class="crm-field crm-field--full">'
        + '      <label class="form-label">備註</label>'
        + '      <textarea class="input" id="crmNote" rows="2" placeholder="備註"></textarea>'
        + '    </div>'
        + '  </div>'

        + '  <div class="crm-items">'
        + '    <div class="crm-items__head">'
        + '      <div class="crm-items__title">明細</div>'
        + '      <button type="button" class="btn btn--secondary" id="crmAddItem"><i class="fa-solid fa-plus"></i><span>新增明細</span></button>'
        + '    </div>'
        + '    <div class="crm-items__body" id="crmItems"></div>'
        + '  </div>'

        + '  <div class="crm-totals">'
        + '    <div class="crm-totalCard">'
        + '      <div class="crm-totalCard__label">工班負擔合計</div>'
        + '      <div class="crm-totalCard__value" id="crmTeamTotal">0.00</div>'
        + '    </div>'
        + '    <div class="crm-totalCard">'
        + '      <div class="crm-totalCard__label">公司負擔合計</div>'
        + '      <div class="crm-totalCard__value" id="crmCompanyTotal">0.00</div>'
        + '    </div>'
        + '    <div class="crm-totalCard">'
        + '      <div class="crm-totalCard__label">維修金額（總計）</div>'
        + '      <div class="crm-totalCard__value" id="crmGrandTotal">0.00</div>'
        + '    </div>'
        + '  </div>'
        + '</div>';
    },

    bindModalEvents: function () {
      var self = this;

      this.els = {
        vehicle: qs('#crmVehicle'),
        repairDate: qs('#crmRepairDate'),
        vendor: qs('#crmVendor'),
        suggest: qs('#crmSuggest'),
        repairType: qs('#crmRepairType'),
        mileage: qs('#crmMileage'),
        note: qs('#crmNote'),
        addItem: qs('#crmAddItem'),
        itemsWrap: qs('#crmItems'),
        teamTotal: qs('#crmTeamTotal'),
        companyTotal: qs('#crmCompanyTotal'),
        grandTotal: qs('#crmGrandTotal')
      };

      this.renderVehicleOptions();

      var sync = function () { self.syncHeaderFromForm(); self.recalcTotals(); };

      if (this.els.vehicle) this.els.vehicle.addEventListener('change', sync);
      if (this.els.repairDate) this.els.repairDate.addEventListener('change', sync);
      if (this.els.repairType) this.els.repairType.addEventListener('change', sync);
      if (this.els.mileage) this.els.mileage.addEventListener('input', sync);
      if (this.els.note) this.els.note.addEventListener('input', sync);

      if (global.CarRepairVendors) global.CarRepairVendors.bind(this);
      if (global.CarRepairItems) global.CarRepairItems.bind(this);

      if (this.els.addItem) {
        this.els.addItem.addEventListener('click', function () {
          if (!global.CarRepairItems) return;
          global.CarRepairItems.addRow();
          self.recalcTotals();
        });
      }

      // 點空白關閉 suggest
      document.addEventListener('click', function (e) {
        var v = self.els && self.els.vendor;
        var s = self.els && self.els.suggest;
        if (!v || !s) return;

        var box = e.target && e.target.closest ? e.target.closest('.crm-vendorSuggest') : null;
        if (!box) s.hidden = true;
      }, { once: true });
    },

    renderVehicleOptions: function () {
      var sel = this.els && this.els.vehicle;
      if (!sel) return;

      var vehicles = this.state.vehicles || [];
      var html = '<option value="">請選擇</option>';
      for (var i = 0; i < vehicles.length; i++) {
        var v = vehicles[i] || {};
        html += '<option value="' + esc(v.id) + '">'
          + esc(v.vehicle_code || '') + '｜' + esc(v.plate_no || '') + '｜' + esc(v.user_name || '')
          + '</option>';
      }
      sel.innerHTML = html;
    },

    fillFormFromState: function () {
      var d = this.state.data || {};
      var h = d.header || {};

      if (this.els.vehicle) this.els.vehicle.value = (h.vehicle_id !== null && h.vehicle_id !== undefined) ? String(h.vehicle_id) : '';
      if (this.els.repairDate) this.els.repairDate.value = h.repair_date || todayStr();
      if (this.els.vendor) this.els.vendor.value = h.vendor || '';
      if (this.els.repairType) this.els.repairType.value = h.repair_type || '維修';
      if (this.els.mileage) this.els.mileage.value = (h.mileage === null || h.mileage === undefined) ? '' : String(h.mileage);
      if (this.els.note) this.els.note.value = h.note || '';

      if (global.CarRepairItems) global.CarRepairItems.renderRows((d.items || []));
    },

    syncHeaderFromForm: function () {
      if (!this.state.data) this.state.data = { header: {}, items: [] };
      if (!this.state.data.header) this.state.data.header = {};

      var h = this.state.data.header;

      h.vehicle_id = this.els.vehicle ? (this.els.vehicle.value || '') : '';
      h.repair_date = this.els.repairDate ? (this.els.repairDate.value || '') : '';
      h.vendor = this.els.vendor ? (this.els.vendor.value || '') : '';
      h.repair_type = this.els.repairType ? (this.els.repairType.value || '維修') : '維修';
      h.mileage = this.els.mileage ? (this.els.mileage.value || '') : '';
      h.note = this.els.note ? (this.els.note.value || '') : '';
    },

    recalcTotals: function () {
      var d = this.state.data || {};
      var items = d.items || [];
      var team = 0;
      var comp = 0;

      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        team += Number(it.team_amount || 0);
        comp += Number(it.company_amount || 0);
      }

      var grand = team + comp;

      if (this.els.teamTotal) this.els.teamTotal.textContent = n2(team);
      if (this.els.companyTotal) this.els.companyTotal.textContent = n2(comp);
      if (this.els.grandTotal) this.els.grandTotal.textContent = n2(grand);
    },

    validate: function () {
      var d = this.state.data || {};
      var h = d.header || {};
      var items = d.items || [];

      if (!h.vehicle_id) return '請選擇車輛';
      if (!h.repair_date) return '請選擇維修日期';
      if (!h.repair_type) return '請選擇類別';
      if (!h.vendor) return '請輸入維修廠商（id 或名稱）';

      if (!items.length) return '請至少新增 1 筆明細';

      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        if (!String(it.content || '').trim()) return '明細第 ' + (i + 1) + ' 筆：維修內容不可空白';
        if (isNaN(Number(it.team_amount || 0))) return '明細第 ' + (i + 1) + ' 筆：工班負擔金額不正確';
        if (isNaN(Number(it.company_amount || 0))) return '明細第 ' + (i + 1) + ' 筆：公司負擔金額不正確';
      }

      return '';
    },

    onSave: function () {
      var self = this;
      if (!global.apiPost) return false;

      var err = this.validate();
      if (err) {
        Toast && Toast.show({ type: 'warning', title: '缺少資料', message: err });
        return false;
      }

      this.syncHeaderFromForm();
      if (global.CarRepairItems) global.CarRepairItems.syncRowsToState();

      var payload = {
        id: (this.state.mode === 'EDIT') ? this.state.id : 0,
        header: this.state.data.header,
        items: this.state.data.items
      };

      return global.apiPost('/api/car/car_repair_save', payload).then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '存檔失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          return false;
        }

        Toast && Toast.show({ type: 'success', title: '已存檔', message: '維修紀錄已更新' });
        if (self.app && self.app.loadList) self.app.loadList();
        return true;
      });
    }
  };

  global.CarRepairModal = Mod;

})(window);
