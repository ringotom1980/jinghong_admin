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
        this._pending = {}; // { [tid]: true }

        document.addEventListener('pointerdown', this.onDocPointerDown.bind(this), true);

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

        var canEditRule = true; // 這頁就是要能改（你現在需求）

        html += ''
          + '<tr data-tid="' + esc(row.type_id) + '">'
          + '  <td>' + esc(row.type_name || '') + '</td>'
          + '  <td>'
          + '    <div class="carb-insp-toggle">'
          + '      <label class="carb-switch2">'
          + '        <input type="checkbox" class="carb-insp-required"'
          + '          data-vid="' + esc(row.vehicle_id) + '"'
          + '          data-tid="' + esc(row.type_id) + '"'
          + (required ? ' checked' : '')
          + (canEditRule ? '' : ' disabled')
          + '        />'
          + '        <span class="carb-switch2__track" aria-hidden="true">'
          + '          <span class="carb-switch2__thumb"></span>'
          + '        </span>'
          + '        <span class="carb-switch2__text">' + (required ? '需要' : '不需') + '</span>'
          + '      </label>'
          + '    </div>'
          + '  </td>'
          + '  <td>'
          + '    <input class="input carb-insp-date"'
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
      if (!el) return;

      // ✅ 以 App 狀態為準，CREATE 不允許送
      var app = this.app || global.CarBaseApp;
      var mode = app && app.state ? String(app.state.mode || 'VIEW') : 'VIEW';
      var activeId = app && app.state ? Number(app.state.activeId || 0) : 0;

      if (mode === 'CREATE') return;
      if (!activeId) return;

      // 1) 切換「需要/不需」
      if (el.classList && el.classList.contains('carb-insp-required')) {
        var tid1 = Number(el.getAttribute('data-tid') || 0);
        if (!tid1) return;

        var tr = el.closest('tr');
        var dateEl = tr ? tr.querySelector('input.carb-insp-date[data-tid="' + tid1 + '"]') : null;

        var wantRequired = el.checked ? 1 : 0;

        if (wantRequired === 1) {
          // 進入 pending：先不寫 DB，先逼日期
          this._pending[String(tid1)] = true;

          if (dateEl) {
            dateEl.disabled = false;
            dateEl.focus({ preventScroll: true });

            // Chrome 支援：直接打開日期選單
            if (typeof dateEl.showPicker === 'function') {
              try { dateEl.showPicker(); } catch (ex) { }
            }
          }

          // 文字同步（span 文案在 label 裡）
          var txt = el.closest('label') ? el.closest('label').querySelector('.carb-switch2__text') : null;
          if (txt) txt.textContent = '需要';

          Toast && Toast.show({ type: 'info', title: '請選到期日', message: '此項已設定為需要檢查，請先選擇到期日' });
          return;
        }

        // wantRequired === 0：立即寫入 rules=0 並清空日期
        delete this._pending[String(tid1)];

        if (dateEl) {
          dateEl.value = '';
          dateEl.disabled = true;
        }
        var txt2 = el.closest('label') ? el.closest('label').querySelector('.carb-switch2__text') : null;
        if (txt2) txt2.textContent = '不需';

        return this.saveRuleAndDate(activeId, tid1, 0, null);
      }

      // 2) 變更日期
      if (el.tagName === 'INPUT' && el.type === 'date' && el.classList.contains('carb-insp-date')) {
        var tid2 = Number(el.getAttribute('data-tid') || 0);
        if (!tid2) return;

        var due = String(el.value || '');
        due = due ? due : null;

        // 若是 pending 狀態，代表剛剛從「不需→需要」過來：這次要一次寫 required=1 + due_date
        if (this._pending[String(tid2)]) {
          if (!due) {
            // date change 到空值：不做寫入，等他真正選到
            return;
          }
          delete this._pending[String(tid2)];

          // 同步勾選（避免 UI 不一致）
          var tr2 = el.closest('tr');
          var sw = tr2 ? tr2.querySelector('input.carb-insp-required[data-tid="' + tid2 + '"]') : null;
          if (sw) {
            sw.checked = true;
            var sp = sw.parentNode ? sw.parentNode.querySelector('span') : null;
            if (sp) sp.textContent = '需要';
          }

          return this.saveRuleAndDate(activeId, tid2, 1, due);
        }

        // 非 pending：照你原本邏輯，只存 due_date
        return this.saveDueDateOnly(activeId, tid2, due);
      }
    },

    onDocPointerDown: function (e) {
      // 只處理「有 pending 的列」
      var pendKeys = this._pending ? Object.keys(this._pending) : [];
      if (!pendKeys.length) return;

      var target = e.target;

      // 點在 tbody 內，但不是日期欄/不是開關，也可能算「外部」→ 我們用「日期 input blur」當準則會更穩
      // 這裡採用保守：只有點在「該列以外」才回滾
      var tr = target && target.closest ? target.closest('tr') : null;
      var tidInRow = tr ? String(tr.getAttribute('data-tid') || '') : '';

      // 若點在 pending 那一列內（例如點日期選單/欄位附近），不回滾
      if (tidInRow && this._pending[tidInRow]) return;

      // 回滾所有 pending（通常一次只會有一個）
      for (var i = 0; i < pendKeys.length; i++) {
        var tid = pendKeys[i];
        this.rollbackPending(tid);
      }
    },

    rollbackPending: function (tid) {
      tid = String(tid || '');
      if (!tid) return;

      var row = this.tbody ? this.tbody.querySelector('tr[data-tid="' + tid + '"]') : null;
      if (!row) { delete this._pending[tid]; return; }

      var sw = row.querySelector('input.carb-insp-required[data-tid="' + tid + '"]');
      var dateEl = row.querySelector('input.carb-insp-date[data-tid="' + tid + '"]');

      // 若日期已填就不回滾
      if (dateEl && dateEl.value) { delete this._pending[tid]; return; }

      if (sw) {
        sw.checked = false;
        var sp = sw.parentNode ? sw.parentNode.querySelector('span') : null;
        if (sp) sp.textContent = '不需';
      }
      if (dateEl) {
        dateEl.value = '';
        dateEl.disabled = true;
      }

      delete this._pending[tid];
      Toast && Toast.show({ type: 'warning', title: '已取消', message: '未選到期日，已恢復為不需檢查' });
    },

    saveDueDateOnly: function (vehicleId, typeId, due) {
      var body = { vehicle_id: vehicleId, type_id: typeId, due_date: due || null };

      return apiPost('/api/car/car_inspection_save', body)
        .then(this.afterSave.bind(this));
    },

    saveRuleAndDate: function (vehicleId, typeId, isRequired, due) {
      var body = { vehicle_id: vehicleId, type_id: typeId, is_required: isRequired ? 1 : 0, due_date: due || null };

      return apiPost('/api/car/car_inspection_rule_save', body)
        .then(this.afterSave.bind(this));
    },

    afterSave: function (j) {
      if (!j || !j.success) {
        Toast && Toast.show({ type: 'danger', title: '儲存失敗', message: (j && j.error) ? j.error : '未知錯誤' });
        return;
      }

      if (global.CarBaseApp && global.CarBaseApp.state && global.CarBaseApp.state.active) {
        if (j.data && Array.isArray(j.data.inspections)) {
          global.CarBaseApp.state.active.inspections = j.data.inspections;
        }
        if (j.data && j.data.rules) {
          global.CarBaseApp.state.active.rules = j.data.rules;
        }
      }

      Toast && Toast.show({ type: 'success', title: '已更新', message: '檢查設定已儲存' });

      if (global.CarBaseApp && global.CarBaseApp.state && global.CarBaseApp.state.active) {
        Mod.render(global.CarBaseApp.state.active);
      }
      if (global.CarBaseApp) global.CarBaseApp.loadList();
    }
  };

  global.CarBaseInspections = Mod;

})(window);
