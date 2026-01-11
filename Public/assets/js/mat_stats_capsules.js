/* Path: Public/assets/js/mat_stats_capsules.js
 * 說明: 日期膠囊（render + click）
 * 需求：
 * - 只顯示近三個月（含當月、上月、上上月）
 * - 以月份分組顯示（例：2026年1月、2025年12月）
 * - 點擊日期：切換 active + 呼叫 app.setDate(d)
 *
 * 依賴：
 * - #msCapsules 容器存在
 * - App 會在 mat_stats.js 呼叫 MatStatsCapsules.init(app) / render(dates)
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function toYm(d) {
    // d: YYYY-MM-DD
    return String(d || '').slice(0, 7); // YYYY-MM
  }

  function ymLabel(ym) {
    // ym: YYYY-MM -> "YYYY年M月"
    var p = String(ym || '').split('-');
    var y = p[0] || '';
    var m = p[1] ? String(parseInt(p[1], 10)) : '';
    if (!y || !m) return ym;
    return y + '年' + m + '月';
  }

  function ymIndex(ym) {
    // ym: YYYY-MM -> months since 0
    var p = String(ym || '').split('-');
    var y = parseInt(p[0] || '0', 10);
    var m = parseInt(p[1] || '1', 10);
    if (!isFinite(y) || !isFinite(m)) return -1;
    return (y * 12) + (m - 1);
  }

  function withinLast3Months(d, now) {
    // d: YYYY-MM-DD
    now = now || new Date();
    var cur = now.getFullYear() * 12 + now.getMonth(); // current month index
    var di = ymIndex(toYm(d));
    if (di < 0) return false;
    return (cur - di) <= 2; // 0,1,2 => 3 months
  }

  function uniq(arr) {
    var map = Object.create(null);
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var k = String(arr[i] || '');
      if (!k) continue;
      if (map[k]) continue;
      map[k] = 1;
      out.push(k);
    }
    return out;
  }

  function sortDescDates(arr) {
    // YYYY-MM-DD lexical sort works
    return arr.slice().sort(function (a, b) {
      a = String(a || '');
      b = String(b || '');
      if (a === b) return 0;
      return a > b ? -1 : 1;
    });
  }

  var Mod = {
    app: null,
    el: null,
    _dates: [],

    init: function (app) {
      this.app = app;
      this.el = qs('#msCapsules');
    },

    setActive: function (d) {
      if (!this.el) return;
      var all = this.el.querySelectorAll('.ms-cap');
      for (var i = 0; i < all.length; i++) all[i].classList.remove('is-active');

      // 找同 data-date 的那顆（分組後可能很多顆）
      var btn = this.el.querySelector('.ms-cap[data-date="' + String(d) + '"]');
      if (btn) btn.classList.add('is-active');
    },

    render: function (dates) {
      if (!this.el) return;

      // 1) 正規化 + 去重 + 新到舊排序
      var raw = Array.isArray(dates) ? dates.slice() : [];
      raw = uniq(raw);
      raw = sortDescDates(raw);

      // 2) 只取近三個月
      var now = new Date();
      var filtered = [];
      for (var i = 0; i < raw.length; i++) {
        if (withinLast3Months(raw[i], now)) filtered.push(raw[i]);
      }

      this._dates = filtered.slice();
      this.el.innerHTML = '';

      // 3) 決定預設選擇：以 app.state.withdraw_date 優先，否則取第一個
      var selected = '';
      if (this.app && this.app.state && this.app.state.withdraw_date) {
        selected = String(this.app.state.withdraw_date || '');
      }
      if (!selected) selected = this._dates[0] || '';

      // 4) 依月份分組
      // groups = { 'YYYY-MM': ['YYYY-MM-DD', ...] }
      var groups = Object.create(null);
      for (var j = 0; j < this._dates.length; j++) {
        var d = this._dates[j];
        var k = toYm(d);
        if (!groups[k]) groups[k] = [];
        groups[k].push(d);
      }

      // 5) 月份排序：新到舊
      var months = Object.keys(groups).sort(function (a, b) {
        var ai = ymIndex(a);
        var bi = ymIndex(b);
        if (ai === bi) return 0;
        return ai > bi ? -1 : 1;
      });

      var self = this;

      // 6) 產生 DOM：月份標題 + 膠囊列
      months.forEach(function (monthKey) {
        // group wrapper
        var wrap = document.createElement('div');
        wrap.className = 'ms-capsules__month';

        // month title
        var title = document.createElement('div');
        title.className = 'ms-capsules__month-title';
        title.textContent = ymLabel(monthKey);

        // list
        var list = document.createElement('div');
        list.className = 'ms-capsules__list';

        // dates in this month already sorted desc because global list sorted desc,
        // but still ensure within group desc
        var monthDates = sortDescDates(groups[monthKey] || []);

        monthDates.forEach(function (d) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ms-cap' + (d === selected ? ' is-active' : '');
          btn.classList.add('ms-capsule'); // 新樣式用（不影響舊 .ms-cap）
          btn.setAttribute('data-date', d);
          btn.textContent = d;

          btn.addEventListener('click', function () {
            // active
            self.setActive(d);

            // sync app
            if (self.app && self.app.setDate) self.app.setDate(d);
          });

          list.appendChild(btn);
        });

        wrap.appendChild(title);
        wrap.appendChild(list);

        self.el.appendChild(wrap);
      });

      // 7) 若 app 尚未有日期（第一次 render），同步一次（保持你既有流程一致）
      if (selected && this.app && this.app.state && !this.app.state.withdraw_date) {
        this.app.state.withdraw_date = selected;
        if (this.app.setSelectedDateText) this.app.setSelectedDateText(selected);
      }
    }
  };

  global.MatStatsCapsules = Mod;

})(window);
