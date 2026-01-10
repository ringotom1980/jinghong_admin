/* Path: Public/assets/js/mat_stats_capsules.js
 * 說明: 日期膠囊（render + click）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,
    el: null,
    _dates: [],

    init: function (app) {
      this.app = app;
      this.el = qs('#msCapsules');
    },

    render: function (dates) {
      if (!this.el) return;
      this._dates = Array.isArray(dates) ? dates.slice() : [];
      this.el.innerHTML = '';

      var self = this;
      this._dates.forEach(function (d, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ms-cap' + (idx === 0 ? ' is-active' : '');
        btn.setAttribute('data-date', d);
        btn.textContent = d;

        btn.addEventListener('click', function () {
          // active
          var all = self.el.querySelectorAll('.ms-cap');
          for (var i = 0; i < all.length; i++) all[i].classList.remove('is-active');
          btn.classList.add('is-active');

          if (self.app && self.app.setDate) self.app.setDate(d);
        });

        self.el.appendChild(btn);
      });
    }
  };

  global.MatStatsCapsules = Mod;

})(window);
