/* Path: Public/assets/js/car_repair_items.js
 * 說明: 維修明細 items 區塊（新增/刪除/同步/即時計算）
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

  var Mod = {
    modal: null,

    init: function (modal) {
      this.modal = modal;
    },

    bind: function (modal) {
      this.modal = modal;
      var wrap = modal.els && modal.els.itemsWrap ? modal.els.itemsWrap : null;
      if (!wrap) return;

      // 列上 input 變更
      wrap.addEventListener('input', this.onInput.bind(this));
      wrap.addEventListener('click', this.onClick.bind(this));
    },

    renderRows: function (items) {
      items = items || [];
      var wrap = this.modal && this.modal.els ? this.modal.els.itemsWrap : null;
      if (!wrap) return;

      if (!items.length) {
        wrap.innerHTML = '';
        return;
      }

      var html = '';
      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        html += this.rowHtml(i, it);
      }
      wrap.innerHTML = html;
    },

    rowHtml: function (idx, it) {
      var seq = (it.seq !== null && it.seq !== undefined) ? it.seq : (idx + 1);
      var content = it.content || '';
      var team = (it.team_amount !== null && it.team_amount !== undefined) ? it.team_amount : 0;
      var comp = (it.company_amount !== null && it.company_amount !== undefined) ? it.company_amount : 0;

      return ''
        + '<div class="crm-itemRow" data-idx="' + idx + '">'
        + '  <div class="crm-field">'
        + '    <label class="form-label">seq</label>'
        + '    <input class="input" type="number" data-f="seq" value="' + esc(seq) + '" />'
        + '  </div>'
        + '  <div class="crm-field">'
        + '    <label class="form-label">content</label>'
        + '    <input class="input" type="text" data-f="content" value="' + esc(content) + '" placeholder="例：更換機油" />'
        + '  </div>'
        + '  <div class="crm-field">'
        + '    <label class="form-label">工班負擔</label>'
        + '    <input class="input" type="number" step="0.01" data-f="team_amount" value="' + esc(team) + '" />'
        + '  </div>'
        + '  <div class="crm-field">'
        + '    <label class="form-label">公司負擔</label>'
        + '    <input class="input" type="number" step="0.01" data-f="company_amount" value="' + esc(comp) + '" />'
        + '  </div>'
        + '  <div class="crm-field">'
        + '    <label class="form-label">&nbsp;</label>'
        + '    <button type="button" class="crm-del" data-act="del" title="刪除此明細"><i class="fa-solid fa-xmark"></i></button>'
        + '  </div>'
        + '</div>';
    },

    addRow: function () {
      if (!this.modal || !this.modal.state || !this.modal.state.data) return;

      var items = this.modal.state.data.items || [];
      var nextSeq = items.length + 1;

      items.push({ seq: nextSeq, content: '', team_amount: 0, company_amount: 0 });
      this.modal.state.data.items = items;

      this.renderRows(items);
    },

    onInput: function () {
      this.syncRowsToState();
      if (this.modal && this.modal.recalcTotals) this.modal.recalcTotals();
    },

    onClick: function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[data-act="del"]') : null;
      if (!btn) return;

      var row = btn.closest('.crm-itemRow');
      var idx = row ? Number(row.getAttribute('data-idx') || 0) : -1;
      if (idx < 0) return;

      var self = this;
      Modal.confirmChoice(
        '刪除明細',
        '確定要刪除此筆明細嗎？',
        function () {
          self.deleteRow(idx);
        },
        null,
        { confirmText: '刪除', cancelText: '取消', allowCloseBtn: true, closeOnBackdrop: true, closeOnEsc: true }
      );
    },

    deleteRow: function (idx) {
      if (!this.modal || !this.modal.state || !this.modal.state.data) return;

      var items = this.modal.state.data.items || [];
      items.splice(idx, 1);

      // 重新編號 seq（維持整齊；也可不重排，但你規格偏向 seq 排序）
      for (var i = 0; i < items.length; i++) {
        if (!items[i]) continue;
        if (items[i].seq === null || items[i].seq === undefined) items[i].seq = i + 1;
      }

      this.modal.state.data.items = items;
      this.renderRows(items);
      this.syncRowsToState();
      if (this.modal && this.modal.recalcTotals) this.modal.recalcTotals();
    },

    syncRowsToState: function () {
      if (!this.modal || !this.modal.state || !this.modal.state.data) return;

      var wrap = this.modal.els && this.modal.els.itemsWrap ? this.modal.els.itemsWrap : null;
      if (!wrap) return;

      var rows = qsa('.crm-itemRow', wrap);
      var items = [];

      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var get = function (f) {
          var el = qs('[data-f="' + f + '"]', r);
          return el ? el.value : '';
        };

        items.push({
          seq: Number(get('seq') || (i + 1)),
          content: String(get('content') || '').trim(),
          team_amount: Number(get('team_amount') || 0),
          company_amount: Number(get('company_amount') || 0)
        });
      }

      // 依 seq 排序（你規格：seq（排序））
      items.sort(function (a, b) { return (a.seq || 0) - (b.seq || 0); });

      this.modal.state.data.items = items;
    }
  };

  global.CarRepairItems = Mod;

})(window);
