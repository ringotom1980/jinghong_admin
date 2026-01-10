/* Path: Public/assets/js/mat_stats_capsules.js
 * 說明: 日期膠囊（近三個月）
 * - UI only：點擊膠囊 → MatStatsApp.onCapsuleSelected(date)
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,
    el: null,

    init: function (app) {
      this.app = app;
      this.el = qs('#msCapsules');
      this.bind();
    },

    bind: function () {
      var self = this;
      if (!self.el) return;

      self.el.addEventListener('click', function (ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest('[data-date]') : null;
        if (!btn) return;
        var d = btn.getAttribute('data-date') || '';
        if (!d) return;

        self.setActive(d);
        if (self.app && self.app.onCapsuleSelected) self.app.onCapsuleSelected(d);
      });
    },

    render: function (dates) {
      var self = this;
      if (!self.el) return;

      dates = Array.isArray(dates) ? dates : [];
      if (!dates.length) {
        self.el.innerHTML = '<div class="ms-empty">近三個月內無可用日期</div>';
        return;
      }

      var html = '';
      for (var i = 0; i < dates.length; i++) {
        var d = String(dates[i] || '');
        if (!d) continue;
        html += '<button type="button" class="ms-cap" data-date="' + escapeHtml(d) + '">' + escapeHtml(d) + '</button>';
      }
      self.el.innerHTML = html;

      // 預設 active：第一顆
      self.setActive(dates[0]);
    },

    setActive: function (date) {
      var self = this;
      if (!self.el) return;
      var btns = self.el.querySelectorAll('.ms-cap');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('is-active');

      var active = self.el.querySelector('.ms-cap[data-date="' + cssEscape(String(date || '')) + '"]');
      if (active) active.classList.add('is-active');
    }
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cssEscape(s) {
    // minimal escape for attribute selector
    return String(s).replace(/"/g, '\\"');
  }

  global.MatStatsCapsules = Mod;

})(window);
