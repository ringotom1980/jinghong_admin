/* Path: Public/assets/js/mat_stats_filter.js
 * 說明: 班別切換（ALL/A~F）
 */

(function (global) {
  'use strict';

  function qsa(sel, root) { return (root || document).querySelectorAll(sel); }
  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,
    el: null,

    init: function (app) {
      this.app = app;
      this.el = qs('#msShiftFilter');
      if (!this.el) return;

      var self = this;
      var btns = qsa('.ms-filter__btn', this.el);
      for (var i = 0; i < btns.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            // UI active
            for (var j = 0; j < btns.length; j++) btns[j].classList.remove('is-active');
            btn.classList.add('is-active');

            var shift = btn.getAttribute('data-shift') || 'all';
            shift = String(shift).toUpperCase();
            shift = (shift === 'ALL') ? 'ALL' : shift;

            if (self.app && self.app.setShift) self.app.setShift(shift);
          });
        })(btns[i]);
      }
    }
  };

  global.MatStatsFilter = Mod;

})(window);
