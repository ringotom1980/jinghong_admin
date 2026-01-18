/* Path: Public/assets/js/equ_repairs_modal.js
 * 說明: 工具紀錄 modal（新增/編輯同一套 UI）
 * - 使用頁面內既有 modal DOM：#equModal（不是共用 Modal.open）
 * - datalist：#equToolDatalist / #equVendorDatalist 由 /api/equ/equ_dicts.php 的 dicts 填入（若有）
 * - items：序號前端自動給值，不可編輯；即時計算 totals；存檔後以後端回傳 totals 覆蓋（防竄改）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function n0(v) {
    var x = Number(v || 0);
    x = Math.round(x);
    return x.toLocaleString('en-US', { maximumFractionDigits: 0 });
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
    els: null,

    state: {
      mode: 'CREATE', // CREATE | EDIT
      id: 0,
      data: null
    },

    init: function (app) {
      this.app = app;
      this.cacheEls();
      this.bindStaticEvents();
    },

    cacheEls: function () {
      this.els = {
        modal: qs('#equModal'),
        backdrop: qs('#equModal .equ-modal__backdrop'),
        closeBtns: qsa('#equModal [data-close="1"]'),
        title: qs('#equModalTitle'),

        id: qs('#equId'),
        date: qs('#equDate'),
        repairType: qs('#equRepairType'),
        tool: qs('#equToolName'),
        vendor: qs('#equVendorName'),
        note: qs('#equNote'),

        toolDatalist: qs('#equToolDatalist'),
        vendorDatalist: qs('#equVendorDatalist'),

        addItemBtn: qs('#equAddItemBtn'),
        itemsWrap: qs('#equItemsWrap'),

        sumCompany: qs('#equSumCompany'),
        sumTeam: qs('#equSumTeam'),
        sumGrand: qs('#equSumGrand'),

        saveBtn: qs('#equSaveBtn')
      };
    },

    bindStaticEvents: function () {
      var self = this;
      if (!this.els || !this.els.modal) return;

      // 關閉
      if (this.els.backdrop) {
        this.els.backdrop.addEventListener('click', function () { self.close(); });
      }
      (this.els.closeBtns || []).forEach(function (b) {
        b.addEventListener('click', function () { self.close(); });
      });

      // 新增明細
      if (this.els.addItemBtn) {
        this.els.addItemBtn.addEventListener('click', function () {
          self.addItemRow();
          self.recalcTotals();
        });
      }

      // 明細 input / 刪除（div-grid）
      if (this.els.itemsWrap) {
        this.els.itemsWrap.addEventListener('input', function () {
          self.syncItemsFromDom();
          self.recalcTotals();
        });
        this.els.itemsWrap.addEventListener('click', function (e) {
          var del = e.target && e.target.closest ? e.target.closest('button[data-act="del-item"]') : null;
          if (!del) return;
          var row = del.closest('.crm-itemRow');
          var idx = row ? Number(row.getAttribute('data-idx') || 0) : -1;
          if (idx < 0) return;

          self.deleteItemRow(idx);
          self.recalcTotals();
        });
      }

      // header 變動 → 同步 totals
      var sync = function () { self.syncHeaderFromForm(); };
      if (this.els.date) this.els.date.addEventListener('change', sync);
      if (this.els.repairType) this.els.repairType.addEventListener('change', sync);
      if (this.els.tool) this.els.tool.addEventListener('input', sync);
      if (this.els.vendor) this.els.vendor.addEventListener('input', sync);
      if (this.els.note) this.els.note.addEventListener('input', sync);

      // 存檔
      if (this.els.saveBtn) {
        this.els.saveBtn.addEventListener('click', function () { self.onSave(); });
      }

      // Esc 關閉（只在 modal 開啟時）
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (!self.isOpen()) return;
        self.close();
      });
    },

    isOpen: function () {
      return !!(this.els && this.els.modal && this.els.modal.getAttribute('aria-hidden') === 'false');
    },

    openCreate: function () {
      this.state.mode = 'CREATE';
      this.state.id = 0;
      this.state.data = {
        header: {
          repair_date: todayStr(),
          repair_type: '維修',
          tool: '',
          vendor: '',
          note: ''
        },
        items: [
          { seq: 1, content: '', company_amount: 0, team_amount: 0 }
        ]
      };
      this.open();
    },

    openEdit: function (id) {
      var self = this;
      if (!global.apiGet) return;

      this.state.mode = 'EDIT';
      this.state.id = Number(id || 0);

      global.apiGet('/api/equ/equ_repair_get?id=' + encodeURIComponent(String(this.state.id))).then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '讀取失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          return;
        }
        self.state.data = j.data || null;
        self.open();
      });
    },

    open: function () {
      if (!this.els || !this.els.modal) return;

      // 標題
      if (this.els.title) {
        this.els.title.textContent = (this.state.mode === 'EDIT') ? '編輯紀錄' : '新增紀錄';
      }

      // 填 datalist（若 app 已載入 dicts）
      this.fillDatalistsFromApp();

      // 開啟
      this.els.modal.setAttribute('aria-hidden', 'false');

      // 填表單
      this.fillFormFromState();
      this.recalcTotals();
    },

    close: function () {
      if (!this.els || !this.els.modal) return;
      this.els.modal.setAttribute('aria-hidden', 'true');
    },

    fillDatalistsFromApp: function () {
      var dicts = this.app && this.app.state ? (this.app.state.dicts || null) : null;
      if (!dicts) return;

      // tools datalist
      if (this.els.toolDatalist) {
        var tools = dicts.tools || [];
        var htmlT = '';
        for (var i = 0; i < tools.length; i++) {
          var t = tools[i] || {};
          // 支援 {id,name} or {name}
          var name = t.name || t.tool_name || '';
          if (!name) continue;
          htmlT += '<option value="' + esc(name) + '"></option>';
        }
        this.els.toolDatalist.innerHTML = htmlT;
      }

      // vendors datalist
      if (this.els.vendorDatalist) {
        var vendors = dicts.vendors || [];
        var htmlV = '';
        for (var k = 0; k < vendors.length; k++) {
          var v = vendors[k] || {};
          var vn = v.name || v.vendor_name || '';
          if (!vn) continue;
          htmlV += '<option value="' + esc(vn) + '"></option>';
        }
        this.els.vendorDatalist.innerHTML = htmlV;
      }
    },

    fillFormFromState: function () {
      var d = this.state.data || {};
      var h = d.header || {};
      var items = d.items || [];

      if (this.els.id) this.els.id.value = (this.state.mode === 'EDIT') ? String(this.state.id || 0) : '0';
      if (this.els.date) this.els.date.value = h.repair_date || todayStr();
      if (this.els.repairType) this.els.repairType.value = h.repair_type || '維修';
      if (this.els.tool) this.els.tool.value = h.tool || h.tool_name || '';
      if (this.els.vendor) this.els.vendor.value = h.vendor || h.vendor_name || '';
      if (this.els.note) this.els.note.value = h.note || '';

      this.renderItems(items);
    },

    syncHeaderFromForm: function () {
      if (!this.state.data) this.state.data = { header: {}, items: [] };
      if (!this.state.data.header) this.state.data.header = {};
      var h = this.state.data.header;

      h.repair_date = this.els.date ? (this.els.date.value || '') : '';
      h.repair_type = this.els.repairType ? (this.els.repairType.value || '維修') : '維修';
      h.tool = this.els.tool ? (this.els.tool.value || '') : '';
      h.vendor = this.els.vendor ? (this.els.vendor.value || '') : '';
      h.note = this.els.note ? (this.els.note.value || '') : '';
    },

    ensureSeq: function (items) {
      items = items || [];
      for (var i = 0; i < items.length; i++) {
        if (!items[i]) items[i] = {};
        items[i].seq = i + 1;
      }
      return items;
    },

    renderItems: function (items) {
      items = this.ensureSeq(items || []);
      if (!this.state.data) this.state.data = { header: {}, items: [] };
      this.state.data.items = items;

      var wrap = this.els && this.els.itemsWrap;
      if (!wrap) return;

      if (!items.length) {
        wrap.innerHTML = '';
        return;
      }

      var html = '';
      // 表頭只顯示一次（同 car）
      html += ''
        + '<div class="crm-itemsHeadRow">'
        + '  <div class="crm-itemsHeadCell">項次</div>'
        + '  <div class="crm-itemsHeadCell">項目內容</div>'
        + '  <div class="crm-itemsHeadCell" style="text-align:right;">公司負擔</div>'
        + '  <div class="crm-itemsHeadCell" style="text-align:right;">工班負擔</div>'
        + '  <div class="crm-itemsHeadCell" style="text-align:center;">刪除</div>'
        + '</div>';

      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        var seq = i + 1;
        var content = it.content || '';
        var comp = (it.company_amount !== null && it.company_amount !== undefined) ? it.company_amount : 0;
        var team = (it.team_amount !== null && it.team_amount !== undefined) ? it.team_amount : 0;

        html += ''
          + '<div class="crm-itemRow" data-idx="' + i + '">'
          + '  <div class="crm-seq">' + esc(seq) + '</div>'
          + '  <div class="crm-field">'
          + '    <input class="input" type="text" data-f="content" value="' + esc(content) + '" placeholder="例：更換零件" />'
          + '  </div>'
          + '  <div class="crm-field">'
          + '    <input class="input" type="number" step="0.01" data-f="company_amount" value="' + esc(comp) + '" style="text-align:right;" />'
          + '  </div>'
          + '  <div class="crm-field">'
          + '    <input class="input" type="number" step="0.01" data-f="team_amount" value="' + esc(team) + '" style="text-align:right;" />'
          + '  </div>'
          + '  <button type="button" class="crm-del" data-act="del-item" title="刪除"><i class="fa-solid fa-xmark"></i></button>'
          + '</div>';
      }

      wrap.innerHTML = html;
    },

    addItemRow: function () {
      if (!this.state.data) this.state.data = { header: {}, items: [] };
      var items = this.state.data.items || [];
      items.push({ seq: items.length + 1, content: '', company_amount: 0, team_amount: 0 });
      this.state.data.items = this.ensureSeq(items);
      this.renderItems(this.state.data.items);
    },

    deleteItemRow: function (idx) {
      if (!this.state.data) return;
      var items = this.state.data.items || [];
      items.splice(idx, 1);
      this.state.data.items = this.ensureSeq(items);
      this.renderItems(this.state.data.items);
      this.syncItemsFromDom();
    },

    syncItemsFromDom: function () {
      if (!this.state.data) this.state.data = { header: {}, items: [] };

      var wrap = this.els && this.els.itemsWrap;
      if (!wrap) return;

      // 以 itemsWrap 當 root（不是 itemsTbody）
      var rows = qsa('.crm-itemRow[data-idx]', wrap);
      var items = [];

      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var get = function (f) {
          var el = qs('[data-f="' + f + '"]', r);
          return el ? el.value : '';
        };

        items.push({
          seq: i + 1,
          content: String(get('content') || '').trim(),
          company_amount: Number(get('company_amount') || 0),
          team_amount: Number(get('team_amount') || 0)
        });
      }

      this.state.data.items = items;
    },

    recalcTotals: function () {
      var d = this.state.data || {};
      var items = d.items || [];
      var comp = 0;
      var team = 0;

      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        comp += Number(it.company_amount || 0);
        team += Number(it.team_amount || 0);
      }

      var grand = comp + team;

      if (this.els.sumCompany) this.els.sumCompany.textContent = n0(comp);
      if (this.els.sumTeam) this.els.sumTeam.textContent = n0(team);
      if (this.els.sumGrand) this.els.sumGrand.textContent = n0(grand);
    },

    validate: function () {
      var d = this.state.data || {};
      var h = d.header || {};
      var items = d.items || [];

      if (!h.repair_date) return '請選擇日期';
      if (!h.repair_type) return '請選擇類型';
      if (!String(h.tool || '').trim()) return '請輸入工具';
      if (!String(h.vendor || '').trim()) return '請輸入廠商';

      if (!items.length) return '請至少新增 1 筆明細';

      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        if (!String(it.content || '').trim()) return '明細第 ' + (i + 1) + ' 筆：項目內容不可空白';
        if (isNaN(Number(it.company_amount || 0))) return '明細第 ' + (i + 1) + ' 筆：公司金額不正確';
        if (isNaN(Number(it.team_amount || 0))) return '明細第 ' + (i + 1) + ' 筆：工班金額不正確';
      }

      return '';
    },

    onSave: function () {
      var self = this;
      if (!global.apiPost) return;

      // 同步狀態
      this.syncHeaderFromForm();
      this.syncItemsFromDom();

      var err = this.validate();
      if (err) {
        Toast && Toast.show({ type: 'warning', title: '缺少資料', message: err });
        return;
      }

      var payload = {
        id: (this.state.mode === 'EDIT') ? this.state.id : 0,
        header: this.state.data.header,
        items: this.state.data.items
      };

      // 送出
      return global.apiPost('/api/equ/equ_repair_save', payload).then(function (j) {
        if (!j || !j.success) {
          Toast && Toast.show({ type: 'danger', title: '存檔失敗', message: (j && j.error) ? j.error : '未知錯誤' });
          return false;
        }

        Toast && Toast.show({ type: 'success', title: '已存檔', message: '紀錄已更新' });

        // 關閉 modal
        self.close();

        // ✅ 存檔後重載膠囊（與 car 同步）
        if (self.app && self.app.loadCapsules) self.app.loadCapsules();
        else if (self.app && self.app.loadList) self.app.loadList(self.app.state ? self.app.state.activeKey : '');

        return true;
      });
    }
  };

  global.EquRepairsModal = Mod;

})(window);
