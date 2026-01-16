/* Path: Public/assets/js/car_base_inspections.js
 * 說明: 六項檢查（規則過濾、狀態計算、date input 變更即存、左側聚合）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function statusLabel(st) {
    if (st === 'OVERDUE') return '已逾期';
    if (st === 'DUE_SOON') return '快到期';
    if (st === 'OK') return '正常';
    if (st === 'NA') return '不需檢查';
    return '未設定';
  }

  function statusTagClass(st) {
    if (st === 'OVERDUE') return 'tag tag--over';
    if (st === 'DUE_SOON') return 'tag tag--soon';
    if (st === 'OK') return 'tag tag--ok';
    if (st === 'NA') return 'tag tag--na';
    return 'tag';
  }

  var Mod = {
    app: null,
    tbody: null,
    sum: null,

    init: function (app) {
      this.app = app;
      this.tbody = qs('#carbInspTbody');
      this.sum = qs('#carbInspSummary');

      if (this.tbody) {
        this.tbody.addEventListener('change', this.onChange.bind(this));
      }
    },

    bindData: function (payload) {
      payload = payload || {};
      this.render(payload);
    },

    render: function (payload) {
      payload = payload || {};
      var insp = Array.isArray(payload.inspections) ? payload.inspections : [];
      var rules = payload.rules || {};

      // summary
      var c = { OVERDUE: 0, DUE_SOON: 0, OK: 0, NA: 0, UNSET: 0 };
      for (var i = 0; i < insp.length; i++) {
        var st = insp[i].status || 'UNSET';
        if (!c.hasOwnProperty(st)) st = 'UNSET';
        c[st]++;
      }

      if (this.sum) {
        this.sum.innerHTML = ''
          + '<div class="carb-insp__sumRow"><div class="carb-insp__sumKey">已逾期</div><div class="carb-insp__sumVal">' + c.OVERDUE + '</div></div>'
          + '<div class="carb-insp__sumRow"><div class="carb-insp__sumKey">快到期</div><div class="carb-insp__sumVal">' + c.DUE_SOON + '</div></div>'
          + '<div class="carb-insp__sumRow"><div class="carb-insp__sumKey">正常</div><div class="carb-insp__sumVal">' + c.OK + '</div></div>'
          + '<div class="carb-insp__sumRow"><div class="carb-insp__sumKey">不需檢查</div><div class="carb-insp__sumVal">' + c.NA + '</div></div>';
      }

      // table
      if (!this.tbody) return;

      var html = '';
      for (var k = 0; k < insp.length; k++) {
        var row = insp[k];
        var required = (row.is_required === 1 || row.is_required === true) ? 1 : 0;

        // 需求：可讀（不在此頁改 rule，避免混功能）
        var reqText = required ? '需要' : '不需';
        var reqClass = required ? 'tag tag--ok' : 'tag tag--na';

        html += ''
          + '<tr>'
          + '  <td>' + esc(row.type_name || '') + '</td>'
          + '  <td><span class="' + reqClass + '">' + reqText + '</span></td>'
          + '  <td>'
          + '    <input class="input"'
          + '      type="date"'
          + '      data-vid="' + esc(row.vehicle_id) + '"'
          + '      data-tid="' + esc(row.type_id) + '"'
          + (required ? '' : ' disabled')
          + '      value="' + esc(row.due_date || '') + '"'
          + '    />'
          + '  </td>'
          + '  <td><span class="' + statusTagClass(row.status) + '">' + statusLabel(row.status) + '</span></td>'
          + '</tr>';
      }

      this.tbody.innerHTML = html;
    },

    onChange: function (e) {
      var el = e.target;
      if (!el || el.tagName !== 'INPUT' || el.type !== 'date') return;

      // ✅ 以 App 狀態為準，CREATE 不允許送
      var app = this.app || global.CarBaseApp;
      var mode = app && app.state ? String(app.state.mode || 'VIEW') : 'VIEW';
      var activeId = app && app.state ? Number(app.state.activeId || 0) : 0;

      if (mode === 'CREATE') return;     // CREATE 無 id，不可存檢查
      if (!activeId) return;             // 沒選車不送

      // type_id 從 DOM 取即可（是 inspection type）
      var tid = Number(el.getAttribute('data-tid') || 0);
      if (!tid) return;

      var due = String(el.value || '');
      var body = { vehicle_id: activeId, type_id: tid, due_date: due || null };

      return apiPost('/api/car/car_inspection_save', body)
        .then(function (j) {
          if (!j || !j.success) {
            Toast && Toast.show({ type: 'danger', title: '儲存失敗', message: (j && j.error) ? j.error : '未知錯誤' });
            return;
          }

          // 用回傳的最新 inspections 覆蓋 state，並重算 summary + list badge
          if (global.CarBaseApp && global.CarBaseApp.state && global.CarBaseApp.state.active) {
            if (j.data && Array.isArray(j.data.inspections)) {
              global.CarBaseApp.state.active.inspections = j.data.inspections;
            }
          }

          Toast && Toast.show({ type: 'success', title: '已更新', message: '檢查到期日已儲存' });

          // 重渲染本區（用 state.active）
          if (global.CarBaseApp && global.CarBaseApp.state && global.CarBaseApp.state.active) {
            Mod.render(global.CarBaseApp.state.active);
          }

          // 重整左清單聚合
          if (global.CarBaseApp) global.CarBaseApp.loadList();
        })
        .catch(function (err) {
          Toast && Toast.show({ type: 'danger', title: '儲存失敗', message: (err && err.message) ? err.message : '未知錯誤' });
        });
    }
  };

  global.CarBaseInspections = Mod;

})(window);
