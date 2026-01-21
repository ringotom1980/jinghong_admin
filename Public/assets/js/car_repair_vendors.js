/* Path: Public/assets/js/car_repair_vendors.js
 * 說明: vendor 建議清單（輸入文字即建議）
 * - 只做建議；存檔時後端仍會依規格處理 id/name
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

  var Mod = {
    modal: null,
    _timer: null,

    init: function (modal) {
      this.modal = modal;
    },

    bind: function (modal) {
      this.modal = modal;
      var input = modal.els && modal.els.vendor ? modal.els.vendor : null;
      var list = modal.els && modal.els.suggest ? modal.els.suggest : null;
      if (!input || !list) return;

      input.addEventListener('input', this.onInput.bind(this));
      list.addEventListener('click', this.onPick.bind(this));
      input.addEventListener('focus', this.onFocus.bind(this));
    },

    onFocus: function () {
      if (!this.modal || !this.modal.els || !this.modal.els.vendor) return;

      var q = String(this.modal.els.vendor.value || '').trim();
      // 純數字視為 id，不彈清單（避免干擾）
      if (/^\d+$/.test(q)) return;

      // focus：不管有沒有字，都抓一次（空字=常用Top10）
      this.fetchSuggest(q);
    },

    onInput: function () {
      var self = this;
      if (!this.modal || !this.modal.els || !this.modal.els.vendor) return;

      var q = String(this.modal.els.vendor.value || '').trim();
      var list = this.modal.els.suggest;

      // 純數字：視為 vendor_id，不做 suggest
      if (/^\d+$/.test(q)) {
        list.hidden = true;
        return;
      }

      if (q.length < 1) {
        self.fetchSuggest(''); // 空字串 => 常用 Top10
        return;
      }

      if (this._timer) window.clearTimeout(this._timer);
      this._timer = window.setTimeout(function () {
        self.fetchSuggest(q);
      }, 180);
    },

    fetchSuggest: function (q) {
      var self = this;
      if (!global.apiGet || !this.modal || !this.modal.els || !this.modal.els.suggest) return;

      global.apiGet('/api/car/car_vendor_suggest?q=' + encodeURIComponent(q)).then(function (j) {
        if (!j || !j.success) return;

        var rows = (j.data && j.data.rows) ? j.data.rows : [];
        self.renderSuggest(rows);
      });
    },

    renderSuggest: function (rows) {
      rows = rows || [];
      var list = this.modal && this.modal.els ? this.modal.els.suggest : null;
      if (!list) return;

      if (!rows.length) {
        list.hidden = true;
        list.innerHTML = '';
        return;
      }

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i] || {};
        html += ''
          + '<div class="crm-suggestItem" data-name="' + esc(r.name || '') + '">'
          + '  <div class="crm-suggestName">' + esc(r.name || '') + '</div>'
          + '  <div class="crm-suggestMeta">使用 ' + esc(r.use_count || 0) + ' 次</div>'
          + '</div>';
      }

      list.innerHTML = html;
      list.hidden = false;
    },

    onPick: function (e) {
      var item = e.target && e.target.closest ? e.target.closest('.crm-suggestItem') : null;
      if (!item) return;

      var name = item.getAttribute('data-name') || '';
      if (this.modal && this.modal.els && this.modal.els.vendor) {
        this.modal.els.vendor.value = name;
      }

      if (this.modal && this.modal.els && this.modal.els.suggest) {
        this.modal.els.suggest.hidden = true;
      }
    }
  };

  global.CarRepairVendors = Mod;

})(window);
