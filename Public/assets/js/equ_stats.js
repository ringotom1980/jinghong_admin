/* Path: Public/assets/js/equ_stats.js
 * 說明: 工具維修統計頁總控（唯一入口）
 * - state: activeKey, activeToolId, summaryRows, detailsRows
 * - 首載：打 /api/equ/equ_stats.php 一次拿 capsules + summary + default details
 * - 列印：不出 modal，直接列印 summary
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
      activeToolId: null,
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
        if (!key || key === self.state.activeKey) return;
        self.setActiveKey(key);
      });

      // Summary row click（委派）
      document.addEventListener('click', function (e) {
        var tr = e.target && e.target.closest ? e.target.closest('tr[data-tool-id]') : null;
        if (!tr) return;
        var tid = tr.getAttribute('data-tool-id');
        if (!tid) return;
        var id = parseInt(tid, 10);
        if (!id || id === self.state.activeToolId) return;
        self.setActiveTool(id);
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

      apiGet('/api/equ/equ_stats', {}).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入失敗');
        var d = j.data || {};

        self.state.capsules = d.capsules || [];
        self.state.defaultKey = d.defaultKey || '';
        self.state.activeKey = self.state.defaultKey || '';

        self.state.summaryRows = d.summaryRows || [];
        self.state.activeToolId = d.activeToolId || null;
        self.state.detailsRows = d.detailsRows || [];

        if (global.EquStatsCapsules) global.EquStatsCapsules.render(self.els.capsules, self.state.capsules, self.state.activeKey);
        if (global.EquStatsSummary) global.EquStatsSummary.render(self.els.summaryBody, self.state.summaryRows, self.state.activeToolId, fmtInt);
        if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);

        self.updateMeta();
      }).catch(function (err) {
        toast('error', '工具維修統計載入失敗', err && err.message ? err.message : String(err));
        self.renderEmpty();
      });
    },

    setActiveKey: function (key) {
      var self = this;
      this.state.activeKey = key;

      if (global.EquStatsCapsules) global.EquStatsCapsules.setActive(this.els.capsules, key);
      this.els.summaryBody.innerHTML = '<tr><td colspan="6" class="es-empty">載入中…</td></tr>';
      this.els.detailsBody.innerHTML = '<tr><td colspan="8" class="es-empty">載入中…</td></tr>';

      apiGet('/api/equ/equ_stats_summary', { key: key }).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入彙總失敗');
        var rows = (j.data && j.data.rows) ? j.data.rows : [];
        self.state.summaryRows = rows;

        var first = rows && rows.length ? rows[0] : null;
        self.state.activeToolId = first ? (first.tool_id || null) : null;

        if (global.EquStatsSummary) global.EquStatsSummary.render(self.els.summaryBody, self.state.summaryRows, self.state.activeToolId, fmtInt);
        self.updateMeta();

        if (!self.state.activeToolId) {
          self.state.detailsRows = [];
          if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, [], fmtInt);
          self.updateMeta();
          return;
        }

        return apiGet('/api/equ/equ_stats_details', { key: key, tool_id: self.state.activeToolId });
      }).then(function (j2) {
        if (!j2) return;
        if (!j2.success) throw new Error(j2.error || '載入明細失敗');
        var rows2 = (j2.data && j2.data.rows) ? j2.data.rows : [];
        self.state.detailsRows = rows2;
        if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);
        self.updateMeta();
      }).catch(function (err) {
        toast('error', '切換期間失敗', err && err.message ? err.message : String(err));
      });
    },

    setActiveTool: function (toolId) {
      var self = this;
      this.state.activeToolId = toolId;

      if (global.EquStatsSummary) global.EquStatsSummary.setActive(this.els.summaryBody, toolId);
      this.els.detailsBody.innerHTML = '<tr><td colspan="8" class="es-empty">載入中…</td></tr>';

      apiGet('/api/equ/equ_stats_details', { key: this.state.activeKey, tool_id: toolId }).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '載入明細失敗');
        var rows = (j.data && j.data.rows) ? j.data.rows : [];
        self.state.detailsRows = rows;
        if (global.EquStatsDetails) global.EquStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);
        self.updateMeta();
      }).catch(function (err) {
        toast('error', '切換工具失敗', err && err.message ? err.message : String(err));
      });
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

      if (this.els.summaryMeta) this.els.summaryMeta.textContent = key ? ('期間：' + periodText + '｜工具數：' + sN) : ('工具數：' + sN);
      if (this.els.detailsMeta) this.els.detailsMeta.textContent = this.state.activeToolId ? ('明細筆數：' + dN) : '';
    },

    renderEmpty: function () {
      if (this.els.capsules) this.els.capsules.innerHTML = '';
      if (this.els.summaryBody) this.els.summaryBody.innerHTML = '<tr><td colspan="6" class="es-empty">無資料</td></tr>';
      if (this.els.detailsBody) this.els.detailsBody.innerHTML = '<tr><td colspan="8" class="es-empty">無資料</td></tr>';
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
