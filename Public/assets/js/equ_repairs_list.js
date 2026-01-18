/* Path: Public/assets/js/equ_repairs_list.js
 * 說明: 工具紀錄列表渲染與列上操作（編輯/刪除）
 * - 比照 car_repairs_list.js 的互動模式
 * - 依 rows 渲染 #equTbody
 * - edit → EquRepairsModal.openEdit(id)
 * - del  → /api/equ/equ_repair_delete，成功後 App.loadCapsules()
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

  function n0(v) {
    var x = Number(v || 0);
    x = Math.round(x);
    return x.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function badge(type) {
    type = String(type || '維修');
    var cls = 'equ-badge';
    if (type === '保養') cls += ' equ-badge--maint';
    else if (type === '購買') cls += ' equ-badge--buy';
    else if (type === '租賃') cls += ' equ-badge--rent';
    else cls += ' equ-badge--repair';

    return '<span class="' + cls + '">' + esc(type) + '</span>';
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
          + '<td>' + esc(r.repair_date || '') + '</td>'
          + '<td>' + badge(r.repair_type || '維修') + '</td>'
          + '<td>' + esc(r.tool_name || '') + '</td>'
          + '<td>' + esc(r.vendor_name || '') + '</td>'
          + '<td class="summary"><div class="equ-summary" title="' + esc(r.items_tooltip || '') + '">' + esc(sumText(r.items_summary || '')) + '</div></td>'
          + '<td class="num">' + n0(r.company_amount_total) + '</td>'
          + '<td class="num">' + n0(r.team_amount_total) + '</td>'
          + '<td class="num">' + n0(r.grand_total) + '</td>'
          + '<td class="actions">'
          + '  <div class="equ-actions">'
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
        if (!global.EquRepairsModal) return;
        global.EquRepairsModal.openEdit(Number(id));
        return;
      }

      if (act === 'del') {
        this.confirmDelete(Number(id), tr);
      }
    },

    confirmDelete: function (id, tr) {
      var self = this;
      if (!global.Modal || !global.apiPost) return;

      // 顯示用：日期/工具/類型
      var d = '';
      var t = '';
      var ty = '';
      try {
        d = tr && tr.children && tr.children[1] ? tr.children[1].textContent : '';
        ty = tr && tr.children && tr.children[2] ? tr.children[2].textContent : '';
        t = tr && tr.children && tr.children[3] ? tr.children[3].textContent : '';
      } catch (e) { }

      Modal.confirmChoice(
        '刪除確認',
        '確定要刪除此筆紀錄嗎？\n刪除後將同時刪除該筆的所有明細（不可復原）。\n\n日期：' + (d || '-') + '\n類型：' + (ty || '-') + '\n工具：' + (t || '-'),
        function () {
          return global.apiPost('/api/equ/equ_repair_delete', { id: id }).then(function (j) {
            if (!j || !j.success) {
              Toast && Toast.show({ type: 'danger', title: '刪除失敗', message: (j && j.error) ? j.error : '未知錯誤' });
              return;
            }
            Toast && Toast.show({ type: 'success', title: '已刪除', message: '紀錄已刪除' });

            // ✅ 刪除後重載膠囊（與 car 同步邏輯）
            if (self.app && self.app.loadCapsules) self.app.loadCapsules();
            else if (self.app && self.app.loadList) self.app.loadList(self.app.state ? self.app.state.activeKey : '');

          });
        },
        null,
        { confirmText: '刪除', cancelText: '取消', allowCloseBtn: true, closeOnBackdrop: true, closeOnEsc: true }
      );
    }
  };

  global.EquRepairsList = Mod;

})(window);
