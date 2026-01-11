/* Path: Public/assets/js/mat_stats_print.js
 * 說明: 統計頁列印（只印 A-F 表格內容）
 * - 點 #msBtnPrint 時：
 *   1) 建立 #msPrintArea
 *   2) 塞入列印抬頭
 *   3) clone #msContent（A-F 表格）進去
 *   4) window.print()
 *   5) afterprint 清掉 #msPrintArea
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

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
      // 你目前 shift filter 會標 .is-active
      var b = qs('#msShiftFilter .ms-filter__btn.is-active');
      var t = b ? (b.textContent || '') : '';
      t = String(t).trim();
      return t || '全部';
    },

    _getDateText: function () {
      // 你的工具列日期是 #msSelectedDate
      var el = qs('#msSelectedDate');
      var t = el ? (el.textContent || '') : '';
      t = String(t).trim();
      return t || '--';
    },

    _cleanup: function () {
      var old = qs('#msPrintArea');
      if (old && old.parentNode) old.parentNode.removeChild(old);
    },

    print: function () {
      var src = qs('#msContent');
      if (!src) return;

      // 先清一次避免殘留
      this._cleanup();

      // 建列印容器
      var wrap = document.createElement('div');
      wrap.id = 'msPrintArea';

      // 列印抬頭
      var head = document.createElement('div');
      head.className = 'ms-print-head';
      head.innerHTML = ''
        + '<div class="ms-print-title">材料領退統計</div>'
        + '<div class="ms-print-meta">'
        + '查詢日期：' + this._escapeHtml(this._getDateText())
        + '　｜　班別：' + this._escapeHtml(this._getShiftText())
        + '　｜　列印時間：' + this._escapeHtml(this._formatNow())
        + '</div>';

      wrap.appendChild(head);

      // 只印表格內容：clone #msContent
      var clone = src.cloneNode(true);
      wrap.appendChild(clone);

      document.body.appendChild(wrap);

      // afterprint 清理
      var self = this;
      var done = false;

      function finish() {
        if (done) return;
        done = true;
        self._cleanup();
        global.removeEventListener('afterprint', finish);
      }

      global.addEventListener('afterprint', finish);

      // 部分瀏覽器 afterprint 不穩，保底清除（不影響列印）
      setTimeout(finish, 2000);

      global.print();
    },

    _escapeHtml: function (s) {
      s = (s === null || s === undefined) ? '' : String(s);
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  global.MatStatsPrint = Mod;

})(window);
