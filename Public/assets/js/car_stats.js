/* Path: Public/assets/js/car_stats.js
 * 說明: 維修統計頁總控（唯一入口）
 * - state: activeKey, activeVehicleId, summaryRows, detailsRows
 * - 首載：打 /api/car/car_stats.php 一次拿 capsules + summary + default details
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function apiGet(url, params) {
    // 優先用你全站 api.js（若存在）
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
    // 你全站有 ui_toast.js；但我不假設它的 API，做 fallback
    if (global.UIToast && typeof global.UIToast.show === 'function') {
      global.UIToast.show(type || 'info', title || '', msg || '');
      return;
    }
    if (global.toast && typeof global.toast === 'function') {
      global.toast(type || 'info', title || '', msg || '');
      return;
    }
    alert((title ? title + '\n' : '') + (msg || ''));
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
      activeVehicleId: null,
      summaryRows: [],
      detailsRows: []
    },

    els: {},

    init: function () {
      this.els.capsules = qs('#csCapsules');
      this.els.summaryBody = qs('#csSummaryBody');
      this.els.detailsBody = qs('#csDetailsBody');
      this.els.summaryMeta = qs('#csSummaryMeta');
      this.els.detailsMeta = qs('#csDetailsMeta');
      this.els.printBtn = qs('#csPrintBtn');
      this.els.printModal = qs('#csPrintModal');
      this.els.printConfirm = qs('#csPrintConfirm');

      this.bindUI();
      this.loadInit();
    },

    bindUI: function () {
      var self = this;

      // Capsules click（委派）
      document.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-cs-key]') : null;
        if (!btn) return;
        e.preventDefault();
        var key = btn.getAttribute('data-cs-key') || '';
        if (!key || key === self.state.activeKey) return;
        self.setActiveKey(key);
      });

      // Summary row click（委派）
      document.addEventListener('click', function (e) {
        var tr = e.target && e.target.closest ? e.target.closest('tr[data-vehicle-id]') : null;
        if (!tr) return;
        var vid = tr.getAttribute('data-vehicle-id');
        if (!vid) return;
        var id = parseInt(vid, 10);
        if (!id || id === self.state.activeVehicleId) return;
        self.setActiveVehicle(id);
      });

      // Print modal
      if (this.els.printBtn) {
        this.els.printBtn.addEventListener('click', function () {
          self.openPrintModal();
        });
      }

      // modal close
      if (this.els.printModal) {
        this.els.printModal.addEventListener('click', function (e) {
          var el = e.target;
          if (!el) return;
          if (el.getAttribute && el.getAttribute('data-close') === '1') {
            self.closePrintModal();
          }
          if (el.closest && el.closest('[data-close="1"]')) self.closePrintModal();
        });
        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape' && self.els.printModal && self.els.printModal.getAttribute('aria-hidden') === 'false') {
            self.closePrintModal();
          }
        });
      }

      if (this.els.printConfirm) {
        this.els.printConfirm.addEventListener('click', function () {
          self.doPrint();
        });
      }
    },

    loadInit: function () {
      var self = this;
      apiGet('/api/car/car_stats.php', {}).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入失敗');
        var d = j.data || {};

        self.state.capsules = d.capsules || [];
        self.state.defaultKey = d.defaultKey || '';
        self.state.activeKey = self.state.defaultKey || '';

        self.state.summaryRows = d.summaryRows || [];
        self.state.activeVehicleId = d.activeVehicleId || null;
        self.state.detailsRows = d.detailsRows || [];

        if (global.CarStatsCapsules) global.CarStatsCapsules.render(self.els.capsules, self.state.capsules, self.state.activeKey);
        if (global.CarStatsSummary) global.CarStatsSummary.render(self.els.summaryBody, self.state.summaryRows, self.state.activeVehicleId, fmtInt);
        if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);

        self.updateMeta();
      }).catch(function (err) {
        toast('error', '維修統計載入失敗', err && err.message ? err.message : String(err));
        self.renderEmpty();
      });
    },

    setActiveKey: function (key) {
      var self = this;
      this.state.activeKey = key;

      if (global.CarStatsCapsules) global.CarStatsCapsules.setActive(this.els.capsules, key);
      this.els.summaryBody.innerHTML = '<tr><td colspan="7" class="cs-empty">載入中…</td></tr>';
      this.els.detailsBody.innerHTML = '<tr><td colspan="6" class="cs-empty">載入中…</td></tr>';

      apiGet('/api/car/car_stats_summary.php', { key: key }).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入彙總失敗');
        var rows = (j.data && j.data.rows) ? j.data.rows : [];
        self.state.summaryRows = rows;

        var first = rows && rows.length ? rows[0] : null;
        self.state.activeVehicleId = first ? (first.vehicle_id || null) : null;

        if (global.CarStatsSummary) global.CarStatsSummary.render(self.els.summaryBody, self.state.summaryRows, self.state.activeVehicleId, fmtInt);
        self.updateMeta();

        if (!self.state.activeVehicleId) {
          self.state.detailsRows = [];
          if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, [], fmtInt);
          self.updateMeta();
          return;
        }

        return apiGet('/api/car/car_stats_details.php', { key: key, vehicle_id: self.state.activeVehicleId });
      }).then(function (j2) {
        if (!j2) return;
        if (!j2.success) throw new Error(j2.error || '載入明細失敗');
        var rows2 = (j2.data && j2.data.rows) ? j2.data.rows : [];
        self.state.detailsRows = rows2;
        if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);
        self.updateMeta();
      }).catch(function (err) {
        toast('error', '切換期間失敗', err && err.message ? err.message : String(err));
      });
    },

    setActiveVehicle: function (vehicleId) {
      var self = this;
      this.state.activeVehicleId = vehicleId;

      if (global.CarStatsSummary) global.CarStatsSummary.setActive(this.els.summaryBody, vehicleId);
      this.els.detailsBody.innerHTML = '<tr><td colspan="6" class="cs-empty">載入中…</td></tr>';

      apiGet('/api/car/car_stats_details.php', { key: this.state.activeKey, vehicle_id: vehicleId }).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入明細失敗');
        var rows = (j.data && j.data.rows) ? j.data.rows : [];
        self.state.detailsRows = rows;
        if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);
        self.updateMeta();
      }).catch(function (err) {
        toast('error', '切換車輛失敗', err && err.message ? err.message : String(err));
      });
    },

    updateMeta: function () {
      var key = this.state.activeKey || '';
      var sN = (this.state.summaryRows || []).length;
      var dN = (this.state.detailsRows || []).length;
      if (this.els.summaryMeta) this.els.summaryMeta.textContent = key ? ('期間：' + key + '｜車輛數：' + sN) : ('車輛數：' + sN);
      if (this.els.detailsMeta) this.els.detailsMeta.textContent = this.state.activeVehicleId ? ('明細筆數：' + dN) : '';
    },

    renderEmpty: function () {
      if (this.els.capsules) this.els.capsules.innerHTML = '';
      if (this.els.summaryBody) this.els.summaryBody.innerHTML = '<tr><td colspan="7" class="cs-empty">無資料</td></tr>';
      if (this.els.detailsBody) this.els.detailsBody.innerHTML = '<tr><td colspan="6" class="cs-empty">無資料</td></tr>';
    },

    openPrintModal: function () {
      if (!this.els.printModal) return;
      this.els.printModal.setAttribute('aria-hidden', 'false');
    },

    closePrintModal: function () {
      if (!this.els.printModal) return;
      this.els.printModal.setAttribute('aria-hidden', 'true');
    },

    doPrint: function () {
      if (!global.CarStatsPrint) return;
      global.CarStatsPrint.run({
        activeKey: this.state.activeKey,
        activeVehicleId: this.state.activeVehicleId
      }, apiGet, toast, this.closePrintModal.bind(this));
    }
  };

  global.CarStatsApp = App;

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });

})(window);
