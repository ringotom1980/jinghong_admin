/* Path: Public/assets/js/mat_stats_filter.js
 * 說明: 班別切換（ALL + A~F / A-姓名）
 * - ✅ 不在 HTML 寫死任何按鈕，包含「全部」也由這裡統一 render，確保樣式一致
 * - 人員資料來源：GET /api/mat/personnel?action=list（你目前預設 action=list 也可不帶）
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
      if (!this.el) return;

      // ✅ 事件委派：只綁一次
      this.el.addEventListener('click', this.onClick.bind(this));

      // ✅ 統一 render（先畫「全部」，再補 A-F）
      this.renderBase();
      this.loadPersonnelAndRender();
    },

    onClick: function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.ms-filter__btn') : null;
      if (!btn || !this.el || !this.el.contains(btn)) return;

      // UI active
      var all = this.el.querySelectorAll('.ms-filter__btn');
      for (var i = 0; i < all.length; i++) all[i].classList.remove('is-active');
      btn.classList.add('is-active');

      var shift = btn.getAttribute('data-shift') || 'ALL';
      shift = String(shift).toUpperCase();

      if (this.app && this.app.setShift) this.app.setShift(shift);
    },

    setActive: function (shift) {
      if (!this.el) return;

      shift = String(shift || 'ALL').toUpperCase();

      var btns = this.el.querySelectorAll('.ms-filter__btn');
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        var s = String(b.getAttribute('data-shift') || '').toUpperCase();
        b.classList.toggle('is-active', s === shift);
      }
    },

    renderBase: function () {
      // ✅ 乾淨：每次 init 都重新畫（避免重複 append）
      this.el.innerHTML = '';

      // 「全部」也是同一種膠囊樣式（同 class）
      var btnAll = document.createElement('button');
      btnAll.type = 'button';
      btnAll.className = 'ms-filter__btn';
      btnAll.setAttribute('data-shift', 'ALL');
      btnAll.textContent = '全部';
      this.el.appendChild(btnAll);
      // 依 app.state.shift 決定預設 active（支援 hash 進頁）
      this.setActive((this.app && this.app.state && this.app.state.shift) ? this.app.state.shift : 'ALL');

    },

    loadPersonnelAndRender: function () {
      var self = this;
      if (!global.apiGet) return;

      // 你後端預設 action=list，所以不帶也行；帶上更明確
      var url = '/api/mat/personnel?action=list';

      global.apiGet(url).then(function (j) {
        if (!j || !j.success) return;

        var data = j.data || {};
        var rows = Array.isArray(data.rows) ? data.rows : [];
        if (!rows.length) return;

        // ✅ 依 A-F 順序輸出（你 API 本來就固定 A-F）
        for (var i = 0; i < rows.length; i++) {
          var p = rows[i];
          if (!p || !p.shift_code) continue;

          var shift = String(p.shift_code).toUpperCase();
          var name = (p.person_name !== null && p.person_name !== undefined) ? String(p.person_name).trim() : '';

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ms-filter__btn';
          btn.setAttribute('data-shift', shift);

          // ✅ 有姓名：A-鄭建昇；無姓名：A
          btn.textContent = name ? (shift + '-' + name) : shift;

          self.el.appendChild(btn);
        }
        // A-F 都 render 完後，再依 app.state.shift 套一次 active（避免先亮到全部）
        self.setActive((self.app && self.app.state && self.app.state.shift) ? self.app.state.shift : 'ALL');

      }).catch(function () {
        // 靜默失敗，不影響「全部」
      });
    }
  };

  global.MatStatsFilter = Mod;

})(window);
