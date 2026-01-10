/* Path: Public/assets/js/mat_stats_print.js
 * 說明: 列印（window.print）
 * - 你已定版「不要 PDF」，所以只做瀏覽器列印
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,
    btn: null,

    init: function (app) {
      this.app = app;
      this.btn = qs('#msBtnPrint');
      this.bind();
    },

    bind: function () {
      var self = this;
      if (!self.btn) return;

      self.btn.addEventListener('click', function () {
        // 若你想在列印前做任何「狀態提示/清理」，放這裡
        window.print();
      });
    }
  };

  global.MatStatsPrint = Mod;

})(window);
