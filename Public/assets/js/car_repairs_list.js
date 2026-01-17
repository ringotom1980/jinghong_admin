/* Path: Public/assets/js/car_repairs_list.js
 * 說明: 維修紀錄列表渲染與列上操作（編輯/刪除）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function n2(v) {
    var x = Number(v || 0);
    return x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function badge(type) {
    if (type === '保養') return '<span class="cr-badge cr-badge--maint">保養</span>';
    return '<span class="cr-badge cr-badge--repair">維修</span>';
  }

  function sumText(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s;
  }

  var Mod = {
    app: null,

    init: function (app) {
      this.app = app;
      if (app && app.els && app.els.tbody) {
        app.els.tbody.addEventListener('click', this.onClick.bind(this));
      }
    },

    render: function (rows) {
      rows = rows || [];
      var tb = this.app && this.app.els ? this.app.els.tbody : null;
      if (!tb) return;

      if (!rows.length) {
        tb.innerHTML = '';
        return;
      }

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i] || {};
        html += '<tr data-id="' + esc(r.id) + '">'
          + '<td>' + (i + 1) + '</td>'
          + '<td>' + esc(r.vehicle_code || '') + '</td>'
          + '<td>' + esc(r.plate_no || '') + '</td>'
          + '<td>' + esc(r.repair_date || '') + '</td>'
          + '<td>' + esc(r.vendor_name || '') + '</td>'
          + '<td>' + badge(r.repair_type || '維修') + '</td>'
          + '<td>' + esc((r.mileage === null || r.mileage === undefined) ? '' : r.mileage) + '</td>'
          + '<td>' + esc(r.user_name || '') + '</td>'
          + '<td><div class="cr-summary" title="' + esc(sumText(r.items_summary || '')) + '">' + esc(sumText(r.items_summary || '')) + '</div></td>'
          + '<td class="num">' + n2(r.grand_total) + '</td>'
          + '<td class="num">' + n2(r.team_amount_total) + '</td>'
          + '<td class="num">' + n2(r.company_amount_total) + '</td>'
          + '<td><div class="cr-note" title="' + esc(r.note || '') + '">' + esc(r.note || '') + '</div></td>'
          + '<td class="actions">'
          + '  <div class="cr-actions">'
          + '    <button type="button" class="btn btn--info" data-act="edit"><i class="fa-solid fa-pen-to-square"></i></button>'
          + '    <button type="button" class="btn btn--danger" data-act="del"><i class="fa-solid fa-trash"></i></button>'
          + '  </div>'
          + '</td>'
          + '</tr>';
      }

      tb.innerHTML = html;
    },

    onClick: function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[data-act]') : null;
      if (!btn) return;

      var tr = btn.closest('tr');
      var id = tr ? tr.getAttribute('data-id') : '';
      var act = btn.getAttribute('data-act');

      if (!id) return;

      if (act === 'edit') {
        if (!global.CarRepairModal) return;
        global.CarRepairModal.openEdit(Number(id));
        return;
      }

      if (act === 'del') {
        this.confirmDelete(Number(id), tr);
      }
    },

    confirmDelete: function (id, tr) {
      var self = this;
      if (!global.Modal || !global.apiPost) return;

      // 找出車編/日期顯示用
      var vc = '';
      var rd = '';
      try {
        vc = tr && tr.children && tr.children[1] ? tr.children[1].textContent : '';
        rd = tr && tr.children && tr.children[3] ? tr.children[3].textContent : '';
      } catch (e) {}

      Modal.confirmChoice(
        '刪除確認',
        '確定要刪除此筆維修紀錄嗎？\n刪除後將同時刪除該筆的所有明細（不可復原）。\n\n車輛：' + (vc || '-') + '\n日期：' + (rd || '-'),
        function () {
          return global.apiPost('/api/car/car_repair_delete', { id: id }).then(function (j) {
            if (!j || !j.success) {
              Toast && Toast.show({ type: 'danger', title: '刪除失敗', message: (j && j.error) ? j.error : '未知錯誤' });
              return;
            }
            Toast && Toast.show({ type: 'success', title: '已刪除', message: '維修紀錄已刪除' });
            if (self.app && self.app.loadList) self.app.loadList();
          });
        },
        null,
        { confirmText: '刪除', cancelText: '取消', allowCloseBtn: true, closeOnBackdrop: true, closeOnEsc: true }
      );
    }
  };

  global.CarRepairsList = Mod;

})(window);
