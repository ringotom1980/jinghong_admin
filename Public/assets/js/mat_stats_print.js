/* Path: Public/assets/js/mat_stats_print.js
 * 說明: 列印（A4 橫式 / window.print）
 * - 列印前加上 body class：is-printing（給 mat_stats_print.css 需要時可用）
 * - 列印後移除 class（支援 afterprint + 保險 timeout）
 * - 避免連點造成重複觸發
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,
    _printing: false,

    init: function (app) {
      this.app = app;

      var btn = qs('#msBtnPrint');
      if (!btn) return;

      var self = this;

      function cleanup() {
        self._printing = false;
        try { document.body.classList.remove('is-printing'); } catch (e) {}
      }

      // 某些瀏覽器/情境不一定會觸發 afterprint，所以用 once+保險 timeout
      function onAfterPrint() {
        cleanup();
      }

      // 預先綁定 afterprint（避免 print() 後才綁來不及）
      if (!Mod._afterPrintBound) {
        global.addEventListener('afterprint', onAfterPrint);
        Mod._afterPrintBound = true;
      }

      btn.addEventListener('click', function () {
        if (self._printing) return;
        self._printing = true;

        try { document.body.classList.add('is-printing'); } catch (e) {}

        // 保險：若 afterprint 沒觸發，1.5 秒後強制清掉狀態（避免卡死）
        global.setTimeout(function () {
          if (self._printing) cleanup();
        }, 1500);

        global.print();
      });
    }
  };

  global.MatStatsPrint = Mod;

})(window);
