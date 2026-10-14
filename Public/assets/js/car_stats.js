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
        type = (type || 'info').toLowerCase();
        title = title || '';
        msg = msg || '';

        // ✅ 全站共用：ui_toast.js
        if (global.Toast && typeof global.Toast.show === 'function') {
            global.Toast.show({
                type: type,
                title: title,
                message: msg
            });
            return;
        }

        // 最後保底（理論上不該發生，除非 ui_toast.js 沒載到）
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
            this.els.printMetaSummary = qs('#csPrintMetaSummary');
            this.els.printMetaAllDetails = qs('#csPrintMetaAllDetails');
            this.els.printMetaVehicle = qs('#csPrintMetaVehicle');

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
                if (!key || (key === self.state.activeKey && !self.state._loadError)) return;
                self.setActiveKey(key);
            });

            // Summary row click（委派）
            document.addEventListener('click', function (e) {
                var tr = e.target && e.target.closest ? e.target.closest('tr[data-vehicle-id]') : null;
                if (!tr) return;
                var vid = tr.getAttribute('data-vehicle-id');
                if (!vid) return;
                var id = parseInt(vid, 10);
                if (!id || (id === self.state.activeVehicleId && !self.state._detailError)) return;
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
            var summary = UI.motion.region.begin(this, 'summary', this.els.summaryBody);
            var detail = UI.motion.region.begin(this, 'detail', this.els.detailsBody);
            return apiGet('/api/car/car_stats', {}).then(function (j) {
                if (!summary.current() || !detail.current()) return;
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

                self.updateMeta(); summary.done(); detail.done();
            }).catch(function (err) {
                if (!summary.current() || !detail.current()) return;
                toast('error', '維修統計載入失敗', err && err.message ? err.message : String(err));
                self.renderEmpty();
            }).finally(function () { summary.done(false); detail.done(false); });
        },

    setActiveKey: function (key) {
      var self = this;
      this.state.activeKey = key;
      this.state._loadError = false;
      this.state._summaryPending = true;
      if (global.CarStatsCapsules) global.CarStatsCapsules.setActive(this.els.capsules, key);
      var summary = UI.motion.region.begin(this, 'summary', this.els.summaryBody);
      var detail = UI.motion.region.begin(this, 'detail', this.els.detailsBody);
      return apiGet('/api/car/car_stats_summary', { key: key }).then(function (j) {
        if (!summary.current()) return;
        if (!j || !j.success) throw new Error((j && j.error) || '載入彙總失敗');
        self.state.summaryRows = (j.data && j.data.rows) || [];
        var first = self.state.summaryRows[0];
        self.state.activeVehicleId = first ? first.vehicle_id : null;
        if (global.CarStatsSummary) global.CarStatsSummary.render(self.els.summaryBody, self.state.summaryRows, self.state.activeVehicleId, fmtInt);
        summary.done(); self.state._summaryPending = false; self.updateMeta();
        if (!self.state.activeVehicleId) {
          self.state.detailsRows = [];
          if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, [], fmtInt);
          detail.done(); self.updateMeta(); return;
        }
        return apiGet('/api/car/car_stats_details', { key: key, vehicle_id: self.state.activeVehicleId });
      }).then(function (j) {
        if (!j || !summary.current() || !detail.current()) return;
        if (!j.success) throw new Error(j.error || '載入明細失敗');
        self.state.detailsRows = (j.data && j.data.rows) || [];
        if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);
        self.updateMeta(); detail.done();
      }).catch(function (err) {
        if (!summary.current() || !detail.current()) return;
        self.state._loadError = true;
        if (self.state._summaryPending) {
          self.state.summaryRows = []; self.state.activeVehicleId = null;
          if (global.CarStatsSummary) global.CarStatsSummary.render(self.els.summaryBody, [], null, fmtInt);
        }
        if (detail.current()) {
          self.state.detailsRows = [];
          if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, [], fmtInt);
          detail.done(false);
        }
        self.updateMeta(); toast('error', '切換期間失敗', err && err.message ? err.message : String(err));
      }).finally(function () { if (summary.current()) { summary.done(false); self.state._summaryPending = false; } });
    },

    setActiveVehicle: function (recordId) {
      if (this.state._summaryPending) return;
      var self = this, key = this.state.activeKey;
      this.state.activeVehicleId = recordId; this.state._detailError = false;
      if (global.CarStatsSummary) global.CarStatsSummary.setActive(this.els.summaryBody, recordId);
      var request = UI.motion.region.begin(this, 'detail', this.els.detailsBody);
      return apiGet('/api/car/car_stats_details', { key: key, vehicle_id: recordId }).then(function (j) {
        if (!request.current()) return;
        if (!j || !j.success) throw new Error((j && j.error) || '載入明細失敗');
        self.state.detailsRows = (j.data && j.data.rows) || [];
        if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, self.state.detailsRows, fmtInt);
        self.updateMeta(); request.done();
      }).catch(function (err) {
        if (!request.current()) return;
        self.state._detailError = true; self.state.detailsRows = [];
        if (global.CarStatsDetails) global.CarStatsDetails.render(self.els.detailsBody, [], fmtInt);
        self.updateMeta(); toast('error', '切換明細失敗', err && err.message ? err.message : String(err));
      }).finally(function () { request.done(false); });
    },

        updateMeta: function () {
            var key = this.state.activeKey || '';
            // 用 capsules 的 label 顯示「期間」，不要直接用 key
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
            if (this.els.summaryMeta) this.els.summaryMeta.textContent = key ? ('期間：' + periodText + '｜車輛數：' + sN) : ('車輛數：' + sN);
            if (this.els.detailsMeta) this.els.detailsMeta.textContent = this.state.activeVehicleId ? ('明細筆數：' + dN) : '';
        },

        getActivePeriodLabel: function () {
            var key = this.state.activeKey || '';
            if (!key) return '';

            var caps = this.state.capsules || [];
            for (var i = 0; i < caps.length; i++) {
                if (caps[i] && String(caps[i].key) === String(key)) {
                    return String(caps[i].label || caps[i].key || key);
                }
            }
            return String(key);
        },

        getActiveVehicleLabel: function () {
            var vid = this.state.activeVehicleId;
            if (!vid) return '';

            // 從 summaryRows 找出目前車輛（不用再打 API）
            var rows = this.state.summaryRows || [];
            for (var i = 0; i < rows.length; i++) {
                var r = rows[i] || {};
                if (String(r.vehicle_id) === String(vid)) {
                    var code = r.vehicle_code || r.code || '';
                    var plate = r.plate_no || r.plate || '';
                    var s = (code ? String(code) : '');
                    if (plate) s += (s ? ' │ ' : '') + String(plate);
                    return s;
                }
            }
            return '';
        },

        updatePrintOptionMetas: function () {
            var period = this.getActivePeriodLabel();
            var vtxt = this.getActiveVehicleLabel();

            if (this.els.printMetaSummary) {
                this.els.printMetaSummary.textContent = period ? ('(' + period + ')') : '';
            }
            if (this.els.printMetaAllDetails) {
                this.els.printMetaAllDetails.textContent = period ? ('(' + period + ')') : '';
            }
            if (this.els.printMetaVehicle) {
                this.els.printMetaVehicle.textContent = vtxt ? ('(' + vtxt + ')') : '(尚未選擇車輛)';
            }
        },

        renderEmpty: function () {
            if (this.els.capsules) this.els.capsules.innerHTML = '';
            if (this.els.summaryBody) this.els.summaryBody.innerHTML = '<tr><td colspan="7" class="cs-empty">無資料</td></tr>';
            if (this.els.detailsBody) this.els.detailsBody.innerHTML = '<tr><td colspan="6" class="cs-empty">無資料</td></tr>';
        },

        openPrintModal: function () {
            if (!this.els.printModal) return;
            this.updatePrintOptionMetas();
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
