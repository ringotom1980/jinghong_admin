/* Path: Public/assets/js/mat_stats_print.js
 * 說明: 列印（window.print）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,

    init: function (app) {
      this.app = app;
      var btn = qs('#msBtnPrint');
      if (!btn) return;

      btn.addEventListener('click', function () {
        window.print();
      });
    }
  };

  global.MatStatsPrint = Mod;

})(window);
