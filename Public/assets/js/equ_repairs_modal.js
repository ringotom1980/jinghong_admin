/* Path: Public/assets/js/equ_repairs_modal.js
 * 說明: 新增/編輯 modal（含明細增刪、合計）
 * 對齊：apiPost（回 Promise）
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

  function num(v) {
    var n = Number(v || 0);
    if (!isFinite(n)) n = 0;
    return n;
  }

  function fmtInt(n) {
    n = Math.round(num(n));
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  var Mod = {
    els: {},
    dicts: { tools: [], vendors: [] },

    ensure: function () {
      if (this.els.modal) return;

      this.els.modal = qs('#equModal');
      this.els.title = qs('#equModalTitle');
      this.els.id = qs('#equId');
      this.els.date = qs('#equDate');
      this.els.type = qs('#equRepairType');
      this.els.toolName = qs('#equToolName');
      this.els.vendorName = qs('#equVendorName');
      this.els.note = qs('#equNote');

      this.els.toolsDl = qs('#equToolDatalist');
      this.els.vendorsDl = qs('#equVendorDatalist');

      this.els.itemsTbody = qs('#equItemsTbody');
      this.els.addItemBtn = qs('#equAddItemBtn');
      this.els.saveBtn = qs('#equSaveBtn');

      this.els.sumCompany = qs('#equSumCompany');
      this.els.sumTeam = qs('#equSumTeam');
      this.els.sumGrand = qs('#equSumGrand');

      var self = this;

      this.els.modal.addEventListener('click', function (e) {
        var close = e.target.closest('[data-close="1"]');
        if (close) self.close();
      });

      this.els.addItemBtn.addEventListener('click', function () {
        self.addItemRow({ content: '', company_amount: 0, team_amount: 0 });
        self.renumber();
        self.recalc();
      });

      this.els.itemsTbody.addEventListener('input', function () { self.recalc(); });

      this.els.itemsTbody.addEventListener('click', function (e) {
        var del = e.target.closest('[data-del="1"]');
        if (!del) return;
        var tr = del.closest('tr');
        if (tr) tr.remove();
        self.renumber();
        self.recalc();
      });

      this.els.saveBtn.addEventListener('click', function () { self.save(); });
    },

    applyDicts: function (dicts) {
      this.ensure();
      this.dicts = dicts || this.dicts;

      var tools = (this.dicts.tools || []);
      var vendors = (this.dicts.vendors || []);

      this.els.toolsDl.innerHTML = tools.map(function (t) {
        return '<option value="' + esc(t.name) + '"></option>';
      }).join('');

      this.els.vendorsDl.innerHTML = vendors.map(function (v) {
        return '<option value="' + esc(v.name) + '"></option>';
      }).join('');
    },

    openCreate: function (dicts) {
      this.ensure();
      this.applyDicts(dicts);

      this.els.title.textContent = '新增紀錄';
      this.els.id.value = '0';

      var today = new Date();
      var d = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      this.els.date.value = d;

      this.els.type.value = '維修';
      this.els.toolName.value = '';
      this.els.vendorName.value = '';
      this.els.note.value = '';

      this.els.itemsTbody.innerHTML = '';
      this.addItemRow({ content: '', company_amount: 0, team_amount: 0 });

      this.renumber();
      this.recalc();
      this.show();
    },

    openEdit: function (dicts, data) {
      this.ensure();
      this.applyDicts(dicts);

      data = data || {};
      this.els.title.textContent = '編輯紀錄';
      this.els.id.value = String(data.id || 0);
      this.els.date.value = data.repair_date || '';
      this.els.type.value = data.repair_type || '維修';
      this.els.toolName.value = data.tool_name || '';
      this.els.vendorName.value = data.vendor_name || '';
      this.els.note.value = data.note || '';

      this.els.itemsTbody.innerHTML = '';
      (data.items || []).forEach(this.addItemRow.bind(this));
      if (!this.els.itemsTbody.children.length) this.addItemRow({ content: '', company_amount: 0, team_amount: 0 });

      this.renumber();
      this.recalc();
      this.show();
    },

    addItemRow: function (it) {
      it = it || {};
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="ta-r"><span class="equ-seq">1</span></td>' +
        '<td><input type="text" class="equ-it-content" value="' + esc(it.content || '') + '" /></td>' +
        '<td class="ta-r"><input type="number" step="1" class="equ-it-company ta-r" value="' + esc(it.company_amount || 0) + '" /></td>' +
        '<td class="ta-r"><input type="number" step="1" class="equ-it-team ta-r" value="' + esc(it.team_amount || 0) + '" /></td>' +
        '<td><button type="button" class="btn btn--danger" data-del="1">刪除</button></td>';
      this.els.itemsTbody.appendChild(tr);
    },

    renumber: function () {
      qsa('tr', this.els.itemsTbody).forEach(function (tr, idx) {
        var s = tr.querySelector('.equ-seq');
        if (s) s.textContent = String(idx + 1);
      });
    },

    recalc: function () {
      var sumC = 0, sumT = 0;
      qsa('tr', this.els.itemsTbody).forEach(function (tr) {
        var c = tr.querySelector('.equ-it-company');
        var t = tr.querySelector('.equ-it-team');
        sumC += num(c ? c.value : 0);
        sumT += num(t ? t.value : 0);
      });
      var grand = sumC + sumT;
      this.els.sumCompany.textContent = fmtInt(sumC);
      this.els.sumTeam.textContent = fmtInt(sumT);
      this.els.sumGrand.textContent = fmtInt(grand);
    },

    collect: function () {
      var items = [];
      qsa('tr', this.els.itemsTbody).forEach(function (tr) {
        var content = (tr.querySelector('.equ-it-content') || {}).value || '';
        content = String(content).trim();
        if (!content) return;

        items.push({
          content: content,
          company_amount: num((tr.querySelector('.equ-it-company') || {}).value),
          team_amount: num((tr.querySelector('.equ-it-team') || {}).value)
        });
      });

      return {
        id: Number(this.els.id.value || 0),
        header: {
          repair_date: (this.els.date.value || '').trim(),
          repair_type: (this.els.type.value || '維修').trim(),
          tool_name: (this.els.toolName.value || '').trim(),
          vendor_name: (this.els.vendorName.value || '').trim(),
          note: (this.els.note.value || '').trim()
        },
        items: items
      };
    },

    setSaving: function (saving) {
      var b = this.els.saveBtn;
      if (!b) return;
      b.disabled = !!saving;
      if (saving) b.classList.add('is-loading');
      else b.classList.remove('is-loading');
    },

    save: function () {
      if (typeof global.apiPost !== 'function') return;

      var body = this.collect();

      if (!body.header.repair_date) return alert('缺少日期');
      if (!body.header.tool_name) return alert('缺少工具名稱');
      if (!body.header.vendor_name) return alert('缺少廠商名稱');
      if (!body.items.length) return alert('至少要有一筆明細（內容不可空白）');

      var self = this;
      self.setSaving(true);

      global.apiPost('/api/equ/equ_repair_save.php', body)
        .then(function (j) {
          self.setSaving(false);

          if (!j || !j.success) {
            alert((j && j.error) ? j.error : '儲存失敗');
            return;
          }
          self.close();
          if (global.EquRepairsApp) global.EquRepairsApp.search();
        });
    },

    show: function () {
      this.els.modal.setAttribute('aria-hidden', 'false');
    },

    close: function () {
      this.els.modal.setAttribute('aria-hidden', 'true');
    }
  };

  global.EquRepairsModal = Mod;

})(window);
