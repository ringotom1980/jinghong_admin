/* Path: Public/assets/js/mat_stats_print.js
 * 說明: 統計頁列印（只印 A-F 表格內容）
 * 需求（最新版）：
 * 1) A4 橫式：由 CSS @page 控制（mat_stats_print.css）
 * 2) 抬頭：放進 table thead（LOGO + 公司名 + 提領日期 + 班別 + 列印時間 + 班別標題），同班跨頁自動重複
 * 3) 每班新頁：由 CSS 對 .ms-section 控制（mat_stats_print.css）
 * 4) 頁碼：放棄（不做）
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

                _preloadLogo: function (logoSrc, cb) {
            // 目標：確保列印前 LOGO 已完成下載 / 快取，避免偶發空白
            // ✅ 但 callback 必須只觸發一次，避免 window.print() 被叫兩次
            var done = false;

            function finish(ok) {
                if (done) return;
                done = true;
                if (cb) cb(!!ok);
            }

            try {
                var img = new Image();
                img.onload = function () { finish(true); };
                img.onerror = function () { finish(false); };

                img.src = logoSrc;

                // 保底：避免某些情況 onload 沒觸發
                setTimeout(function () {
                    if (done) return;
                    if (img && img.naturalWidth > 0) finish(true);
                    else finish(false);
                }, 150);
            } catch (e) {
                finish(false);
            }
        },

        _insertHeaderIntoEachTableThead: function (contentRoot) {
            // 把抬頭塞進每個班別的 table thead 第一列，讓同班跨頁自動重複
            var base = (location.pathname.split('/')[1] === 'jinghong_admin') ? '/jinghong_admin' : '';
            var logoSrc = base + '/assets/img/brand/JH_logo.png?v=1';

            var dateText = this._escapeHtml(this._getDateText());
            var shiftText = this._escapeHtml(this._getShiftText());
            var nowText = this._escapeHtml(this._formatNow());

            var sections = qsa('.ms-section', contentRoot);

            for (var i = 0; i < sections.length; i++) {
                var sec = sections[i];

                var table = qs('table', sec);
                if (!table) continue;

                var thead = qs('thead', table);
                if (!thead) continue;

                // 班別標題（例如：A班－鄭建昇）
                var secTitleEl = qs('.ms-section__title', sec);
                var secTitle = secTitleEl ? String(secTitleEl.textContent || '').trim() : '';

                // 取 thead 每一列的「colspan 加總」，取最大值當實際欄數（可處理多層表頭）
                var colCount = 0;
                var headRows = thead ? thead.querySelectorAll('tr') : null;
                if (headRows && headRows.length) {
                    for (var ri = 0; ri < headRows.length; ri++) {
                        var cells = headRows[ri].querySelectorAll('th,td');
                        var sum = 0;
                        for (var ci = 0; ci < cells.length; ci++) {
                            var cs = parseInt(cells[ci].getAttribute('colspan') || '1', 10);
                            sum += (isFinite(cs) && cs > 0) ? cs : 1;
                        }
                        if (sum > colCount) colCount = sum;
                    }
                }
                if (!colCount) colCount = 1;

                // 移除舊的列印抬頭（避免重複插入）
                var old = qs('tr.ms-print-thead', thead);
                if (old && old.parentNode) old.parentNode.removeChild(old);

                var tr = document.createElement('tr');
                tr.className = 'ms-print-thead';

                var th = document.createElement('th');
                th.className = 'ms-print-thead-cell';
                th.colSpan = colCount;
                // 班別標題（例如：A班－鄭建昇）轉成 A-鄭建昇
                var secLabel = secTitle ? secTitle.replace(/^([A-F])班[－-]\s*/, '$1-') : '';
                var titleLine = '境宏工程有限公司領退料統計' + (secLabel ? ('(' + this._escapeHtml(secLabel) + ')') : '');

                th.innerHTML =
                    '<div class="ms-print-thead-wrap">' +
                    '  <img class="ms-print-logo" src="' + logoSrc + '" alt="LOGO" />' +
                    '  <div class="ms-print-thead-text">' +
                    '    <div class="ms-print-title">' + titleLine + '</div>' +
                    '    <div class="ms-print-meta">' +
                    '提領日期：' + dateText +
                    '　｜　班別：' + shiftText +
                    '　｜　列印時間：' + nowText +
                    '    </div>' +
                    '  </div>' +
                    '</div>';

                tr.appendChild(th);

                // 插在 thead 最前面：確保每頁重複抬頭
                thead.insertBefore(tr, thead.firstChild);
            }
        },

        _stripSectionCardTitle: function (contentRoot) {
            // 因為班別資訊已進入 thead 抬頭列，避免重複顯示「A班－xx」的卡片標題
            var heads = qsa('.ms-section__head', contentRoot);
            heads.forEach(function (h) {
                if (h && h.parentNode) h.parentNode.removeChild(h);
            });
        },

        print: function () {
            var src = qs('#msContent');
            if (!src) return;

            var self = this;

            // 先算出跟 _insertHeaderIntoEachTableThead 一樣的 logoSrc（必須一致）
            var base = (location.pathname.split('/')[1] === 'jinghong_admin') ? '/jinghong_admin' : '';
            // ✅ 建議加版本號避免某些快取狀態不穩（你也可改成 filemtime 版本）
            var logoSrc = base + '/assets/img/brand/JH_logo.png?v=1';

            // 先清掉舊列印區，避免殘留
            self._cleanup();

            // ✅ 核心：先預載 LOGO，載好才進列印
            self._preloadLogo(logoSrc, function () {

                var wrap = document.createElement('div');
                wrap.id = 'msPrintArea';

                // 只印表格內容：clone #msContent（A-F）
                var clone = src.cloneNode(true);

                // 1) 抬頭塞進每個 table thead（跨頁重複）
                self._insertHeaderIntoEachTableThead(clone);

                // 2) 移除原本卡片式班別標題，避免重複
                self._stripSectionCardTitle(clone);

                wrap.appendChild(clone);
                document.body.appendChild(wrap);

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
            });
        }
    };

    global.MatStatsPrint = Mod;

})(window);
