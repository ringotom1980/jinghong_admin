/* Path: Public/assets/js/equ_stats_capsules.js
 * 說明: Capsules 渲染與 active 切換（只顯示有資料期間；每年分隔線）
 */

(function (global) {
  'use strict';

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function yearFromKey(key) {
    var m = String(key || '').match(/^(\d{4})/);
    return m ? m[1] : '';
  }

  var Mod = {
    render: function (host, capsules, activeKey) {
      if (!host) return;
      capsules = capsules || [];

      var html = '';
      var lastYear = null;

      capsules.forEach(function (c) {
        var y = yearFromKey(c.key);
        if (lastYear !== null && y !== lastYear) {
          html += '<div class="es-yearSep" role="separator" aria-hidden="true"></div>';
        }
        lastYear = y;

        var isActive = (c.key === activeKey);
        html += '<button type="button" class="es-cap' + (isActive ? ' is-active' : '') + '" data-es-key="' + esc(c.key) + '">'
          + esc(c.label || c.key) + '</button>';
      });

      host.innerHTML = html || '<span class="es-empty">無可用期間</span>';
    },

    setActive: function (host, activeKey) {
      if (!host) return;
      var btns = host.querySelectorAll('.es-cap[data-es-key]');
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        var k = b.getAttribute('data-es-key') || '';
        if (k === activeKey) b.classList.add('is-active');
        else b.classList.remove('is-active');
      }
    }
  };

  global.EquStatsCapsules = Mod;

})(window);
