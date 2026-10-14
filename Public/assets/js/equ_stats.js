/* Path: Public/assets/js/equ_stats.js
 * 說明: 工具維修統計頁總控（唯一入口）
 * - state: activeKey, activeVendorId, summaryRows, detailsRows
 * - 首載：/api/equ/equ_stats.php 一次拿 capsules + summary + default details
 * - 期間切換：/api/equ/equ_stats_summary.php
 * - 明細載入：/api/equ/equ_stats_details.php (key + vendor_id)
 * - 列印：直接列印（equ_stats_print.js /api/equ/equ_stats_print）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function apiGet(url, params) {
    if (typeof global.apiGet === 'function') return global.apiGet(url, params);

    var base = (global.BASE_URL || '');
    var u = (base ? base.replace(/\/$/, '') : '') + url;
    if (params && typeof params === 'object') {
      var sp = new URLSearchParams();
      Object.keys(params).forEach(function (k) {
        if (params[k] === undefined || params[k] === null || params[k] === '') return;
        sp.append(k, String(params[k]));
      });
      var qs2 = sp.toString();
      if (qs2) u += (u.indexOf('?') >= 0 ? '&' : '?') + qs2;
    }
    return fetch(u, { credentials: 'same-origin' }).then(function (r) { return r.json(); });
  }

  function toast(type, title, msg) {
    type = (type || 'info').toLowerCase();
    title = title || '';
    msg = msg || '';

    if (global.Toast && typeof global.Toast.show === 'function') {
      global.Toast.show({ type: type, title: title, message: msg });
      return;
    }
    alert((title ? title + '\n' : '') + msg);
  }

  function fmtInt(v) {
    var n = Number(v || 0);
    if (!isFinite(n)) n = 0;
    return String(Math.round(n));
  }

  var App = {
    state: {
      capsules: [],
      defaultKey: '',
      activeKey: '',
      activeVendorId: null,
      summaryRows: [],
      detailsRows: []
    },
    els: {},

    init: function () {
      this.els.capsules = qs('#esCapsules');
      this.els.summaryBody = qs('#esSummaryBody');
      this.els.detailsBody = qs('#esDetailsBody');
      this.els.summaryMeta = qs('#esSummaryMeta');
      this.els.detailsMeta = qs('#esDetailsMeta');
      this.els.printBtn = qs('#esPrintBtn');

      this.bindUI();
      this.loadInit();
    },

    bindUI: function () {
      var self = this;

      // Capsules click（委派）
      document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-es-key]') : null;
        if (!btn) return;
        e.preventDefault();
        var key = btn.getAttribute('data-es-key') || '';
        if (!key || (key === self.state.activeKey && !self.state._loadError)) return;
        self.setActiveKey(key);
      });

      // Summary row click（委派）：vendor
      document.addEventListener('click', function (e) {
        var tr = e.target && e.target.closest ? e.target.closest('tr[data-vendor-id]') : null;
        if (!tr) return;
        var vid = tr.getAttribute('data-vendor-id');
        if (!vid) return;
        var id = parseInt(vid, 10);
        if (!id || (id === self.state.activeVendorId && !self.state._detailError)) return;
        self.setActiveVendor(id);
      });

      // Print（直接列印）
      if (this.els.printBtn) {
        this.els.printBtn.addEventListener('click', function () {
          self.doPrint();
        });
      }
    },

    loadInit: function () {
      var self = this;
      var summary = UI.motion.region.begin(this, 'summary', this.els.summaryBody);
      var detail = UI.motion.region.begin(this, 'detail', this.els.detailsBody);

      return apiGet('/api/equ/equ_stats', {}).then(function (j) {
        if (!summary.current() || !detail.current()) return;
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入失敗');
        var d = j.data || {};

        self.state.capsules = d.capsules || [];
        self.state.defaultKey = d.defaultKey || '';
        self.state.activeKey = self.state.defaultKey || '';

        self.state.summaryRows = d.summaryRows || [];
        self.state.activeVendorId = d.activeVendorId || null;
        self.state.detailsRows = d.detailsRows || [];

        if (global.EquStatsCapsules) global.EquStatsCapsules.render(self.els.capsules, self.state.capsules, self.state.activeKey);
        if (global.EquStatsSummary) global.EquStatsSummary.render(self.els.summaryBody, self.state.summaryRows, self.state.activeVendorId, fmtInt);
        if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);

        self.updateMeta(); summary.done(); detail.done();
      }).catch(function (err) {
        if (!summary.current() || !detail.current()) return;
        toast('error', '工具維修統計載入失敗', err && err.message ? err.message : String(err));
        self.renderEmpty();
      }).finally(function () { summary.done(false); detail.done(false); });
    },

    setActiveKey: function (key) {
      var self = this;
      this.state.activeKey = key;
      this.state._loadError = false;
      this.state._summaryPending = true;
      if (global.EquStatsCapsules) global.EquStatsCapsules.setActive(this.els.capsules, key);
      var summary = UI.motion.region.begin(this, 'summary', this.els.summaryBody);
      var detail = UI.motion.region.begin(this, 'detail', this.els.detailsBody);
      return apiGet('/api/equ/equ_stats_summary', { key: key }).then(function (j) {
        if (!summary.current()) return;
        if (!j || !j.success) throw new Error((j && j.error) || '載入彙總失敗');
        self.state.summaryRows = (j.data && j.data.rows) || [];
        var first = self.state.summaryRows[0];
        self.state.activeVendorId = first ? first.vendor_id : null;
        if (global.EquStatsSummary) global.EquStatsSummary.render(self.els.summaryBody, self.state.summaryRows, self.state.activeVendorId, fmtInt);
        summary.done(); self.state._summaryPending = false; self.updateMeta();
        if (!self.state.activeVendorId) {
          self.state.detailsRows = [];
          if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, [], fmtInt);
          detail.done(); self.updateMeta(); return;
        }
        return apiGet('/api/equ/equ_stats_details', { key: key, vendor_id: self.state.activeVendorId });
      }).then(function (j) {
        if (!j || !summary.current() || !detail.current()) return;
        if (!j.success) throw new Error(j.error || '載入明細失敗');
        self.state.detailsRows = (j.data && j.data.rows) || [];
        if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);
        self.updateMeta(); detail.done();
      }).catch(function (err) {
        if (!summary.current() || !detail.current()) return;
        self.state._loadError = true;
        if (self.state._summaryPending) {
          self.state.summaryRows = []; self.state.activeVendorId = null;
          if (global.EquStatsSummary) global.EquStatsSummary.render(self.els.summaryBody, [], null, fmtInt);
        }
        if (detail.current()) {
          self.state.detailsRows = [];
          if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, [], fmtInt);
          detail.done(false);
        }
        self.updateMeta(); toast('error', '切換期間失敗', err && err.message ? err.message : String(err));
      }).finally(function () { if (summary.current()) { summary.done(false); self.state._summaryPending = false; } });
    },

    setActiveVendor: function (recordId) {
      if (this.state._summaryPending) return;
      var self = this, key = this.state.activeKey;
      this.state.activeVendorId = recordId; this.state._detailError = false;
      if (global.EquStatsSummary) global.EquStatsSummary.setActive(this.els.summaryBody, recordId);
      var request = UI.motion.region.begin(this, 'detail', this.els.detailsBody);
      return apiGet('/api/equ/equ_stats_details', { key: key, vendor_id: recordId }).then(function (j) {
        if (!request.current()) return;
        if (!j || !j.success) throw new Error((j && j.error) || '載入明細失敗');
        self.state.detailsRows = (j.data && j.data.rows) || [];
        if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);
        self.updateMeta(); request.done();
      }).catch(function (err) {
        if (!request.current()) return;
        self.state._detailError = true; self.state.detailsRows = [];
        if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, [], fmtInt);
        self.updateMeta(); toast('error', '切換明細失敗', err && err.message ? err.message : String(err));
      }).finally(function () { request.done(false); });
    },

    updateMeta: function () {
      var key = this.state.activeKey || '';
      var periodText = key;
      var caps = this.state.capsules || [];
      for (var i = 0; i < caps.length; i++) {
        if (caps[i] && String(caps[i].key) === String(key)) {
          periodText = caps[i].label || caps[i].key || key;
          break;
        }
      }

      var sN = (this.state.summaryRows || []).length;
      var dN = (this.state.detailsRows || []).length;

      if (this.els.summaryMeta) this.els.summaryMeta.textContent = key ? ('期間：' + periodText + '｜廠商數：' + sN) : ('廠商數：' + sN);
      if (this.els.detailsMeta) this.els.detailsMeta.textContent = this.state.activeVendorId ? ('明細筆數：' + dN) : '';
    },

    renderEmpty: function () {
      if (this.els.capsules) this.els.capsules.innerHTML = '';
      if (this.els.summaryBody) this.els.summaryBody.innerHTML = '<tr><td colspan="6" class="es-empty">無資料</td></tr>';
      if (this.els.detailsBody) this.els.detailsBody.innerHTML = '<tr><td colspan="6" class="es-empty">無資料</td></tr>';
    },

    doPrint: function () {
      if (!global.EquStatsPrint) return;
      global.EquStatsPrint.run({ activeKey: this.state.activeKey }, apiGet, toast);
    }
  };

  global.EquStatsApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
