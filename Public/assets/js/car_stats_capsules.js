/* Path: Public/assets/js/car_stats_capsules.js
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

      // 預期 capsules 已依 end_ts desc 排序；此處依年份分組，用分隔線
      var html = '';
      var lastYear = null;

      capsules.forEach(function (c) {
        var y = yearFromKey(c.key);
        if (lastYear !== null && y !== lastYear) {
          html += '<div class="cs-yearSep" role="separator" aria-hidden="true"></div>';
        }
        lastYear = y;

        var isActive = (c.key === activeKey);
        html += '<button type="button" class="cs-cap' + (isActive ? ' is-active' : '') + '" data-cs-key="' + esc(c.key) + '">'
          + esc(c.label || c.key) + '</button>';
      });

      host.innerHTML = html || '<span class="cs-empty">無可用期間</span>';
    },

    setActive: function (host, activeKey) {
      if (!host) return;
      var btns = host.querySelectorAll('.cs-cap[data-cs-key]');
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        var k = b.getAttribute('data-cs-key') || '';
        if (k === activeKey) b.classList.add('is-active');
        else b.classList.remove('is-active');
      }
    }
  };

  global.CarStatsCapsules = Mod;

})(window);
