/* Path: Public/assets/js/mat_stats_filter.js
 * 說明: 班別切換（ALL/A~F）+ 人員快捷按鈕（A-鄭建昇）
 * - 用事件委派，確保動態新增按鈕也能點
 * - 人員資料來源：/api/mat/personnel（回傳 shift_code, person_name）
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }

    var Mod = {
        app: null,
        el: null,

        init: function (app) {
            this.app = app;
            this.el = qs('#msShiftFilter');
            if (!this.el) return;

            var self = this;

            // ✅ 事件委派：只綁一次，動態新增的按鈕也有效
            this.el.addEventListener('click', function (e) {
                var btn = e.target && e.target.closest ? e.target.closest('.ms-filter__btn') : null;
                if (!btn || !self.el.contains(btn)) return;

                // UI active
                var all = self.el.querySelectorAll('.ms-filter__btn');
                for (var j = 0; j < all.length; j++) all[j].classList.remove('is-active');
                btn.classList.add('is-active');

                var shift = btn.getAttribute('data-shift') || 'all';
                shift = String(shift).toUpperCase();
                shift = (shift === 'ALL') ? 'ALL' : shift;

                if (self.app && self.app.setShift) self.app.setShift(shift);
            });

            // ✅ 初始化時載入人員快捷按鈕
            this.loadPersonnelButtons();
        },

        loadPersonnelButtons: function () {
            var self = this;
            if (!self.el) return;
            if (!global.apiGet) return;

            var url = '/api/mat/personnel';

            global.apiGet(url).then(function (j) {
                if (!j || !j.success) return;

                var data = j.data || {};
                var rows = Array.isArray(data.rows) ? data.rows : [];
                if (!rows.length) return;

                // 避免重複 append（如果 init 被呼叫多次）
                var existed = self.el.querySelectorAll('.ms-filter__btn--person');
                if (existed && existed.length) return;

                for (var i = 0; i < rows.length; i++) {
                    var p = rows[i];
                    if (!p || !p.shift_code) continue;

                    var shift = String(p.shift_code).toUpperCase();
                    var name = String(p.person_name);

                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'ms-filter__btn ms-filter__btn--person';
                    btn.setAttribute('data-shift', shift);
                    btn.setAttribute('data-person', name);
                    btn.textContent = shift + '-' + name;

                    // 不用綁 click（事件委派已處理）
                    self.el.appendChild(btn);
                }
            }).catch(function () {
                // 靜默失敗：不影響原本 ALL/A~F
            });
        }
    };

    global.MatStatsFilter = Mod;

})(window);
