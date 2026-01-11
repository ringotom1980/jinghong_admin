/* Path: Public/assets/js/mat_stats_print.js
 * 說明: 統計頁列印（只印 A-F 表格內容）
 * 需求：
 * 1) A4 橫式：由 CSS @page 控制（mat_stats_print.css）
 * 2) 抬頭：每頁重複（每一班頁首插入 LOGO + 境宏工程有限公司領退料統計）
 * 3) 每班新頁：由 CSS 對 .ms-section 控制（mat_stats_print.css）
 * 4) 頁碼 1/6：以「每班一頁」=「第 i / 總班數」
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    var Mod = {
        app: null,

        init: function (app) {
            this.app = app || null;

            var btn = qs('#msBtnPrint');
            if (!btn) return;

            var self = this;
            btn.addEventListener('click', function () {
                self.print();
            });
        },

        _formatNow: function () {
            var d = new Date();
            var pad = function (n) { return n < 10 ? ('0' + n) : String(n); };
            return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
                ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
        },

        _getShiftText: function () {
            var b = qs('#msShiftFilter .ms-filter__btn.is-active');
            var t = b ? (b.textContent || '') : '';
            t = String(t).trim();
            return t || '全部';
        },

        _getDateText: function () {
            var el = qs('#msSelectedDate');
            var t = el ? (el.textContent || '') : '';
            t = String(t).trim();
            return t || '--';
        },

        _escapeHtml: function (s) {
            s = (s === null || s === undefined) ? '' : String(s);
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        _cleanup: function () {
            var old = qs('#msPrintArea');
            if (old && old.parentNode) old.parentNode.removeChild(old);
        },

        _buildPrintHeaderHtml: function (pageNoText) {
            // LOGO 路徑：依你現況
            var base = (location.pathname.split('/')[1] === 'jinghong_admin') ? '/jinghong_admin' : '';
            var logoSrc = base + '/assets/img/brand/JH_logo.png';

            var dateText = this._escapeHtml(this._getDateText());
            var shiftText = this._escapeHtml(this._getShiftText());
            var nowText = this._escapeHtml(this._formatNow());
            var pageText = this._escapeHtml(pageNoText || '');

            return ''
                + '<img class="ms-print-logo" src="' + logoSrc + '" alt="LOGO" />'
                + '<div>'
                + '  <div class="ms-print-title">境宏工程有限公司領退料統計</div>'
                + '  <div class="ms-print-meta">'
                + '查詢日期：' + dateText
                + '　｜　班別：' + shiftText
                + '　｜　列印時間：' + nowText
                + (pageText ? ('　｜　頁次：' + pageText) : '')
                + '</div>'
                + '</div>';
        },

        _insertHeaderPerSection: function (contentRoot) {
            // 對印出來的每個班別區塊（.ms-section），插入一份頁首（達成每頁重複）
            var sections = qsa('.ms-section', contentRoot);
            var total = sections.length;

            for (var i = 0; i < sections.length; i++) {
                var sec = sections[i];

                // 若之前印過殘留（理論上不會，保險）
                var exist = qs('.ms-print-head', sec);
                if (exist && exist.parentNode) exist.parentNode.removeChild(exist);

                var head = document.createElement('div');
                head.className = 'ms-print-head';
                head.innerHTML = this._buildPrintHeaderHtml((i + 1) + '/' + total);

                // 插在每一班最前面 → 每頁都有相同頁首
                sec.insertBefore(head, sec.firstChild);
            }
        },

        print: function () {
            var src = qs('#msContent');
            if (!src) return;

            // 先清一次避免殘留
            this._cleanup();

            // 建列印容器
            var wrap = document.createElement('div');
            wrap.id = 'msPrintArea';

            // 只印表格內容：clone #msContent（A-F）
            var clone = src.cloneNode(true);

            // ✅ 每班插入頁首（LOGO+標題+日期/班別/時間+頁次）
            this._insertHeaderPerSection(clone);

            wrap.appendChild(clone);
            document.body.appendChild(wrap);

            // afterprint 清理（保底）
            var self = this;
            var done = false;

            function finish() {
                if (done) return;
                done = true;
                self._cleanup();
                global.removeEventListener('afterprint', finish);
            }

            global.addEventListener('afterprint', finish);
            setTimeout(finish, 2500);

            global.print();
        }
    };

    global.MatStatsPrint = Mod;

})(window);
