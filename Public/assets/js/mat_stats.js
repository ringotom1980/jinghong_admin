/* Path: Public/assets/js/mat_stats.js
 * 說明: 統計頁總控（init/state/reload）
 * - 只負責：狀態、呼叫 API、協調 capsules/filter/render/print
 * - API 路徑：一律不帶 .php（由 router 對應 /api/* → Public/api/*.php）
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }

    var App = {
        els: {},
        state: {
            withdraw_date: '',
            shift: 'ALL',
            payload: null,
            jumpHash: ''
        },

        init: function () {
            this.els.dateText = qs('#msSelectedDate');
            this.els.loading = qs('#msLoading');
            this.els.error = qs('#msError');
            this.els.content = qs('#msContent');

            // 子模組 init
            if (global.MatStatsCapsules) global.MatStatsCapsules.init(this);
            if (global.MatStatsFilter) global.MatStatsFilter.init(this);
            if (global.MatStatsPrint) global.MatStatsPrint.init(this);

            // 讀 hash（#A~#F）：進頁就切到該班（讓班別膠囊 + API shift 一致），並保留定位
            var h = (global.location && global.location.hash) ? String(global.location.hash) : '';
            h = h.replace('#', '').trim().toUpperCase();
            if (h && /^[A-F]$/.test(h)) {
                this.state.jumpHash = h;
                this.state.shift = h; // ✅ 讓第一次 reload 就用 shift=該班
            }
            // 先載入膠囊（取得可用日期，並選第一個）
            this.loadCapsules();

        },

        setLoading: function (on) {
            if (this.els.loading) this.els.loading.hidden = !on;
            if (on) this.setError('');
        },

        setError: function (msg) {
            if (!this.els.error) return;
            if (!msg) {
                this.els.error.hidden = true;
                this.els.error.textContent = '';
                return;
            }
            this.els.error.hidden = false;
            this.els.error.textContent = String(msg);
        },

        setSelectedDateText: function (d) {
            if (this.els.dateText) this.els.dateText.textContent = d || '--';
        },

        loadCapsules: function () {
            var self = this;
            self.setLoading(true);

            // 你可改成 /api/mat/stats_capsules（未來獨立），
            // 但目前也可直接沿用既有 issue_dates（有 withdraw_date 列表）
            var url = '/api/mat/stats_capsules';

            if (!global.apiGet) {
                self.setLoading(false);
                self.setError('缺少 api.js（apiGet 不存在）');
                return;
            }

            global.apiGet(url).then(function (j) {
                if (!j || !j.success) {
                    self.setLoading(false);
                    self.setError((j && j.error) ? j.error : '讀取日期膠囊失敗');
                    return;
                }

                var data = j.data || {};
                // 允許兩種格式：{dates:[...]} 或 {items:[{date,...}]}
                var dates = [];
                if (Array.isArray(data.dates)) dates = data.dates.slice();
                else if (Array.isArray(data.items)) dates = data.items.map(function (x) { return x && x.date ? String(x.date) : ''; }).filter(Boolean);

                // render capsules
                if (global.MatStatsCapsules) {
                    global.MatStatsCapsules.render(dates);
                }

                // 預設選第一個日期
                var first = dates[0] || '';
                self.state.withdraw_date = first;
                self.setSelectedDateText(first);

                // 初次載入統計
                self.reload();

            }).catch(function (e) {
                self.setLoading(false);
                self.setError((e && e.message) ? e.message : 'Network error');
            });
        },

        setDate: function (d) {
            d = String(d || '');
            if (!d) return;
            this.state.withdraw_date = d;
            this.setSelectedDateText(d);
            this.reload();
        },

        setShift: function (shift) {
            shift = String(shift || 'ALL').toUpperCase();
            this.state.shift = shift || 'ALL';
            this.reload();
        },

        reload: function () {
            var self = this;
            var d = self.state.withdraw_date;
            if (!d) {
                self.setLoading(false);
                self.setError('缺少查詢日期');
                return;
            }

            self.setLoading(true);

            // 統計總控 API（你現在 debug 回傳就是這包）
            var url = '/api/mat/stats?withdraw_date=' + encodeURIComponent(d) + '&shift=' + encodeURIComponent(self.state.shift || 'ALL');

            global.apiGet(url).then(function (j) {
                self.setLoading(false);

                if (!j || !j.success) {
                    self.setError((j && j.error) ? j.error : '載入統計失敗');
                    return;
                }

                self.state.payload = j.data || null;

                // 更新頁首日期（以回傳為準）
                if (self.state.payload && self.state.payload.withdraw_date) {
                    self.setSelectedDateText(String(self.state.payload.withdraw_date));
                }

                // 渲染
                if (global.MatStatsRender) {
                    global.MatStatsRender.render(self.state.payload, {
                        shift: self.state.shift || 'ALL'
                    });
                }
                // ✅ 若 URL 帶 #A/#D/#F...，render 後定位（找不到就短暫重試；找到才清空）
                if (self.state.jumpHash) {
                    (function () {
                        var id = self.state.jumpHash;
                        var tries = 0;

                        function tryScroll() {
                            tries++;

                            var el = document.getElementById(id);
                            if (!el) {
                                // DOM 可能尚未完成更新，最多重試 10 次（約 0.8 秒）
                                if (tries < 10) return setTimeout(tryScroll, 80);
                                return; // 放棄，但不清空 jumpHash，下一次 reload 還會再試
                            }

                            // ✅ 找到才清空，確保真的定位成功
                            self.state.jumpHash = '';

                            if (el.scrollIntoView) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                setTimeout(function () { global.scrollBy(0, -90); }, 50);
                            }
                        }

                        setTimeout(tryScroll, 0);
                    })();
                }

            }).catch(function (e) {
                self.setLoading(false);
                self.setError((e && e.message) ? e.message : 'Network error');
            });
        }
    };

    global.MatStatsApp = App;

    document.addEventListener('DOMContentLoaded', function () {
        App.init();

        // ✅ 桌機保留 sticky 狀態；手機改為查詢卡滑走後顯示薄型班別列
        (function () {
            var tb = document.querySelector('.page.mat-stats .ms-toolbar');
            if (!tb) return;
            var mobileDock = document.querySelector('#msMobileShiftDock');
            var mq = global.matchMedia ? global.matchMedia('(max-width: 900px), ((max-height: 560px) and (pointer: coarse))') : null;

            function isMobileStatsLayout() {
                return mq ? mq.matches : ((global.innerWidth || 9999) <= 900);
            }

            function setMobileDockVisible(on) {
                mobileDock = mobileDock || document.querySelector('#msMobileShiftDock');
                if (!mobileDock) return;

                var show = !!on && isMobileStatsLayout();
                mobileDock.hidden = !show;
                mobileDock.classList.toggle('is-visible', show);
            }

            function updateDockByToolbarPosition() {
                var topbarH = 0;
                try {
                    topbarH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
                } catch (e) {
                    topbarH = 0;
                }

                var rect = tb.getBoundingClientRect();
                var out = rect.bottom <= (topbarH + 2);

                tb.classList.toggle('is-stuck', !isMobileStatsLayout() && rect.top <= (topbarH + 1));
                setMobileDockVisible(out);
            }

            global.addEventListener('scroll', updateDockByToolbarPosition, { passive: true });
            global.addEventListener('resize', updateDockByToolbarPosition);
            setTimeout(updateDockByToolbarPosition, 0);
            if (mq && mq.addEventListener) {
                mq.addEventListener('change', updateDockByToolbarPosition);
            }
        })();
    });

})(window);
