/* Path: Public/assets/js/car_repair_items.js
 * 說明: 維修明細 items 區塊（新增/刪除/同步/即時計算）
 * 定版：
 * - 表頭只顯示一次（不在每列重複 label）
 * - 項次由前端自動給值，不可編輯
 * - seq/content 改中文：項次、維修內容
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

      // ✅ 先確保 seq 連號（且不可由使用者輸入）
      for (var i = 0; i < items.length; i++) {
        if (!items[i]) items[i] = {};
        items[i].seq = i + 1;
      }
      if (this.modal && this.modal.state && this.modal.state.data) {
        this.modal.state.data.items = items;
      }

      var html = '';
      html += this.headerHtml(); // ✅ 表頭只一次

      for (var k = 0; k < items.length; k++) {
        html += this.rowHtml(k, items[k] || {});
      }

      wrap.innerHTML = html;
    },

    headerHtml: function () {
      return ''
        + '<div class="crm-itemsHeadRow" aria-hidden="true">'
        + '  <div class="crm-itemsHeadCell">項次</div>'
        + '  <div class="crm-itemsHeadCell">維修內容</div>'
        + '  <div class="crm-itemsHeadCell">工班負擔</div>'
        + '  <div class="crm-itemsHeadCell">公司負擔</div>'
        + '  <div class="crm-itemsHeadCell">&nbsp;</div>'
        + '</div>';
    },

    rowHtml: function (idx, it) {
      var seq = (idx + 1);
      var content = it.content || '';
      var team = (it.team_amount !== null && it.team_amount !== undefined) ? it.team_amount : 0;
      var comp = (it.company_amount !== null && it.company_amount !== undefined) ? it.company_amount : 0;

      return ''
        + '<div class="crm-itemRow" data-idx="' + idx + '">'
        + '  <div class="crm-seq" data-f="seq">' + esc(seq) + '</div>'
        + '  <div class="crm-field">'
        + '    <input class="input" type="text" data-f="content" value="' + esc(content) + '" placeholder="例：更換機油" />'
        + '  </div>'
        + '  <div class="crm-field">'
        + '    <input class="input" type="number" step="0.01" data-f="team_amount" value="' + esc(team) + '" />'
        + '  </div>'
        + '  <div class="crm-field">'
        + '    <input class="input" type="number" step="0.01" data-f="company_amount" value="' + esc(comp) + '" />'
        + '  </div>'
        + '  <div class="crm-field">'
        + '    <button type="button" class="crm-del" data-act="del" title="刪除此明細"><i class="fa-solid fa-xmark"></i></button>'
        + '  </div>'
        + '</div>';
    },

    addRow: function () {
      if (!this.modal || !this.modal.state || !this.modal.state.data) return;

      var items = this.modal.state.data.items || [];
      items.push({ seq: items.length + 1, content: '', team_amount: 0, company_amount: 0 });

      // ✅ 重新連號
      for (var i = 0; i < items.length; i++) items[i].seq = i + 1;

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
        function () { self.deleteRow(idx); },
        null,
        { confirmText: '刪除', cancelText: '取消', allowCloseBtn: true, closeOnBackdrop: true, closeOnEsc: true }
      );
    },

    deleteRow: function (idx) {
      if (!this.modal || !this.modal.state || !this.modal.state.data) return;

      var items = this.modal.state.data.items || [];
      items.splice(idx, 1);

      // ✅ 重新連號（符合「項次前端賦予」）
      for (var i = 0; i < items.length; i++) items[i].seq = i + 1;

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
          seq: i + 1, // ✅ 固定由前端決定
          content: String(get('content') || '').trim(),
          team_amount: Number(get('team_amount') || 0),
          company_amount: Number(get('company_amount') || 0)
        });
      }

      this.modal.state.data.items = items;
    }
  };

  global.CarRepairItems = Mod;

})(window);
