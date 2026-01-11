/* Path: Public/assets/js/mat_stats_print.js
 * 說明: 統計頁列印（只印 A-F 表格內容）
 * 需求：
 * 1) A4 橫式：由 CSS @page 控制
 * 2) 抬頭：LOGO + 境宏工程有限公司領退料統計
 * 3) 每班新頁：由 CSS 對 .ms-section 控制
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

    _buildPrintHeader: function () {
      // LOGO 路徑：你可依實際檔案調整
      // 建議放在：Public/assets/img/logo128.png
      var logoSrc = 'assets/img/logo128.png';

      var dateText = this._escapeHtml(this._getDateText());
      var shiftText = this._escapeHtml(this._getShiftText());
      var nowText = this._escapeHtml(this._formatNow());

      var wrap = document.createElement('div');
      wrap.className = 'ms-print-head';

      wrap.innerHTML = ''
        + '<img class="ms-print-logo" src="' + logoSrc + '" alt="LOGO" />'
        + '<div>'
        + '  <div class="ms-print-title">境宏工程有限公司領退料統計</div>'
        + '  <div class="ms-print-meta">查詢日期：' + dateText + '　｜　班別：' + shiftText + '　｜　列印時間：' + nowText + '</div>'
        + '</div>';

      return wrap;
    },

    _stampSectionPageNo: function (contentRoot) {
      // 只對印出來的班別區塊（.ms-section）做 1/N 標記
      var sections = qsa('.ms-section', contentRoot);
      var total = sections.length;

      sections.forEach(function (sec, idx) {
        var head = qs('.ms-section__head', sec) || sec;
        var badge = qs('.ms-print-page', head);
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'ms-print-page';
          head.appendChild(badge);
        }
        badge.textContent = (idx + 1) + '/' + total;
      });
    },

    print: function () {
      var src = qs('#msContent');
      if (!src) return;

      // 先清一次避免殘留
      this._cleanup();

      // 建列印容器
      var wrap = document.createElement('div');
      wrap.id = 'msPrintArea';

      // 抬頭：LOGO + 標題
      wrap.appendChild(this._buildPrintHeader());

      // 只印表格內容：clone #msContent（A-F）
      var clone = src.cloneNode(true);
      wrap.appendChild(clone);

      // 對 clone 內每班蓋上 1/N
      this._stampSectionPageNo(clone);

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
