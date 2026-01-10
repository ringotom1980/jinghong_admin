/* Path: Public/assets/js/mat_stats_filter.js
 * 說明: 班別切換（含全部）
 * - UI only：點按班別 → MatStatsApp.onShiftChanged(shift)
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
      this.bind();
    },

    bind: function () {
      var self = this;
      if (!self.el) return;

      self.el.addEventListener('click', function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest('[data-shift]') : null;
        if (!btn) return;

        var s = btn.getAttribute('data-shift') || 'all';
        self.setActive(s);

        if (self.app && self.app.onShiftChanged) self.app.onShiftChanged(s);
      });
    },

    setActive: function (shift) {
      var self = this;
      if (!self.el) return;

      var btns = self.el.querySelectorAll('.ms-filter__btn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('is-active');

      var active = self.el.querySelector('.ms-filter__btn[data-shift="' + cssEscape(String(shift || 'all')) + '"]');
      if (active) active.classList.add('is-active');
    }
  };

  function cssEscape(s) {
    return String(s).replace(/"/g, '\\"');
  }

  global.MatStatsFilter = Mod;

})(window);
