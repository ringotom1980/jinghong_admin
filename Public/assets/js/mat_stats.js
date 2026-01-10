/* Path: Public/assets/js/mat_stats.js
 * 說明: Mat Stats 總控（init / state / reload）
 * - 不做 DOM 細節，交給 capsules/filter/render/print
 * - 所有 API 路徑集中在這裡，避免各檔硬寫
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }

    var MatStatsApp = {
        els: {},
        state: {
            selectedDate: '',     // YYYY-MM-DD
            selectedShift: 'all', // all/A/B/C/D/E/F
            capsules: []          // ['2026-01-10', ...]
        },

        api: {
            capsules: 'api/mat/stats_capsules.php',
            stats: 'api/mat/stats.php'
        },

        init: function () {
            this.els.selectedDate = qs('#msSelectedDate');
            this.els.capsules = qs('#msCapsules');
            this.els.filter = qs('#msShiftFilter');
            this.els.content = qs('#msContent');
            this.els.loading = qs('#msLoading');
            this.els.error = qs('#msError');
            this.els.btnPrint = qs('#msBtnPrint');

            // bind modules
            if (global.MatStatsCapsules) global.MatStatsCapsules.init(this);
            if (global.MatStatsFilter) global.MatStatsFilter.init(this);
            if (global.MatStatsRender) global.MatStatsRender.init(this);
            if (global.MatStatsPrint) global.MatStatsPrint.init(this);

            // initial load
            this.loadCapsulesAndDefault();
        },

        setLoading: function (on) {
            if (this.els.loading) this.els.loading.hidden = !on;
        },

        setError: function (msg) {
            if (!this.els.error) return;
            if (!msg) {
                this.els.error.hidden = true;
                this.els.error.textContent = '';
                return;
            }
            this.els.error.hidden = false;
            this.els.error.textContent = msg;
        },

        setSelectedDate: function (ymd) {
            this.state.selectedDate = ymd || '';
            if (this.els.selectedDate) this.els.selectedDate.textContent = this.state.selectedDate || '--';
        },

        setSelectedShift: function (shift) {
            this.state.selectedShift = shift || 'all';
        },

        apiGet: function (url, params) {
            // ✅ 對齊你的共用 api.js：apiGet(url) 不吃 params，所以這裡自行組 querystring
            params = params || {};

            var qsArr = [];
            Object.keys(params).forEach(function (k) {
                if (params[k] === undefined || params[k] === null) return;
                var v = String(params[k]);
                if (v === '') return;
                qsArr.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
            });

            var u = String(url || '');
            if (qsArr.length) {
                u += (u.indexOf('?') >= 0 ? '&' : '?') + qsArr.join('&');
            }

            // ✅ 優先走你共用的 apiGet
            if (global.apiGet) return global.apiGet(u);

            // fallback：直接用 apiRequest（也走 BASE_URL + same-origin）
            if (global.apiRequest) return global.apiRequest({ url: u, method: 'GET' });

            // 最後 fallback：fetch（極少用到）
            return fetch(u, { credentials: 'same-origin' })
                .then(function (r) { return r.json(); })
                .catch(function (e) {
                    return { success: false, data: null, error: (e && e.message) ? e.message : 'Network error' };
                });
        },

        loadCapsulesAndDefault: function () {
            var self = this;
            self.setError('');
            self.setLoading(true);

            self.apiGet(self.api.capsules, {})
                .then(function (j) {
                    if (!j || j.success !== true) throw new Error((j && j.error) || '載入日期失敗');

                    var dates = [];
                    // 允許 data.dates 或 data.capsules
                    if (j.data && Array.isArray(j.data.dates)) dates = j.data.dates;
                    if (j.data && Array.isArray(j.data.capsules)) dates = j.data.capsules;

                    self.state.capsules = dates || [];
                    if (global.MatStatsCapsules) global.MatStatsCapsules.render(self.state.capsules);

                    // 預設日期：第一顆膠囊（通常是最新）
                    var d0 = (self.state.capsules && self.state.capsules.length) ? self.state.capsules[0] : '';
                    self.setSelectedDate(d0);

                    // 預設 shift：all
                    self.setSelectedShift('all');
                    if (global.MatStatsFilter) global.MatStatsFilter.setActive('all');

                    // 只要有日期就載入統計
                    if (d0) return self.reload();
                    self.setLoading(false);
                    self.clearContent();
                })
                .catch(function (e) {
                    self.setLoading(false);
                    self.setError(e && e.message ? e.message : '載入失敗');
                });
        },

        reload: function () {
            var self = this;
            var d = self.state.selectedDate;
            var s = self.state.selectedShift || 'all';
            if (!d) {
                self.clearContent();
                return Promise.resolve();
            }

            self.setError('');
            self.setLoading(true);

            return self.apiGet(self.api.stats, { withdraw_date: d, shift: s })
                .then(function (j) {
                    self.setLoading(false);

                    if (!j || j.success !== true) throw new Error((j && j.error) || '載入統計失敗');

                    // 交給 render 模組
                    if (global.MatStatsRender) {
                        global.MatStatsRender.render(j.data || {});
                    }
                })
                .catch(function (e) {
                    self.setLoading(false);
                    self.setError(e && e.message ? e.message : '載入失敗');
                });
        },

        clearContent: function () {
            if (this.els.content) this.els.content.innerHTML = '';
        },

        onCapsuleSelected: function (ymd) {
            this.setSelectedDate(ymd);
            this.reload();
        },

        onShiftChanged: function (shift) {
            this.setSelectedShift(shift);
            this.reload();
        }
    };

    global.MatStatsApp = MatStatsApp;

    document.addEventListener('DOMContentLoaded', function () {
        MatStatsApp.init();
    });

})(window);
