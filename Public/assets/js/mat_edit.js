/* Path: Public/assets/js/mat_edit_ui.js
 * 說明: /mat/edit UI 層（完整實作）
 * - 僅負責 DOM 與使用者互動
 * - 不直接呼叫 API
 * - 僅轉呼 MatEdit* 模組
 */

(function (global) {
  'use strict';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var UI = {
    app: null,

    init: function (app) {
      this.app = app;
      this._initReconciliation();
    },

    /* ===============================
     * 1️⃣ 對帳資料（分類 × 日期）
     * =============================== */
    _initReconciliation: function () {
      var box = qs('#meReconciliation');
      if (!box) return;

      box.innerHTML = ''
        + '<div class="me-recon-head">'
        + '  <label>領退日期</label>'
        + '  <input type="date" id="meWithdrawDate" />'
        + '</div>'
        + '<div class="me-recon-table">'
        + '  <table class="table">'
        + '    <thead>'
        + '      <tr><th>分類</th><th>對帳數量</th></tr>'
        + '    </thead>'
        + '    <tbody id="meReconRows"></tbody>'
        + '  </table>'
        + '</div>'
        + '<div class="me-recon-actions">'
        + '  <button class="btn btn--primary" id="meReconSave">儲存對帳資料</button>'
        + '</div>';

      qs('#meWithdrawDate', box).addEventListener('change', function () {
        UI.app.setDate(this.value);
      });

      qs('#meReconSave', box).addEventListener('click', function () {
        var date = UI.app.state.withdrawDate;
        if (!date) {
          Toast.show({ type: 'warning', message: '請先選擇日期' });
          return;
        }

        var values = {};
        qsa('input[data-cid]', box).forEach(function (inp) {
          values[inp.dataset.cid] = inp.value === '' ? null : Number(inp.value);
        });

        MatEditReconciliation.save(date, values);
      });
    },

    renderReconciliation: function (date, values) {
      var tbody = qs('#meReconRows');
      if (!tbody) return;

      tbody.innerHTML = '';

      (MatEditCategories.categories || []).forEach(function (c) {
        var v = (values && values[c.id] !== undefined) ? values[c.id] : '';
        var tr = document.createElement('tr');
        tr.innerHTML = ''
          + '<td>' + esc(c.category_name) + '</td>'
          + '<td>'
          + '  <input type="number" data-cid="' + c.id + '" value="' + esc(v) + '" />'
          + '</td>';
        tbody.appendChild(tr);
      });
    },

    /* ===============================
     * 2️⃣ 分類與材料歸屬
     * =============================== */
    renderCategories: function (list) {
      var box = qs('#meCategories');
      if (!box) return;

      var html = ''
        + '<div class="me-cat-actions">'
        + '  <button class="btn btn--primary" id="meCatAdd">新增分類</button>'
        + '</div>'
        + '<ul class="me-cat-list">';

      list.forEach(function (c) {
        html += ''
          + '<li data-id="' + c.id + '">'
          + '  <input type="text" value="' + esc(c.category_name) + '" />'
          + '  <button class="btn btn--info" data-act="materials">材料</button>'
          + '  <button class="btn btn--danger" data-act="delete">刪除</button>'
          + '</li>';
      });

      html += '</ul>';
      box.innerHTML = html;

      qs('#meCatAdd', box).addEventListener('click', function () {
        Modal.confirm('新增分類', '請輸入分類名稱', function () {
          var name = prompt('分類名稱');
          if (!name) return false;
          MatEditCategories.create(name);
        });
      });

      qsa('li', box).forEach(function (li) {
        var id = Number(li.dataset.id);
        var input = qs('input', li);

        input.addEventListener('blur', function () {
          MatEditCategories.update(id, input.value);
        });

        qsa('button', li).forEach(function (btn) {
          var act = btn.dataset.act;
          if (act === 'delete') {
            btn.addEventListener('click', function () {
              MatEditCategories.remove(id);
            });
          }
          if (act === 'materials') {
            btn.addEventListener('click', function () {
              MatEditCategoryMaterials.load(id);
            });
          }
        });
      });
    },

    /* ===============================
     * 3️⃣ 分類排序
     * =============================== */
    renderSort: function (list) {
      var box = qs('#meSort');
      if (!box) return;

      var html = '<ul class="me-sort-list">';
      list.forEach(function (c) {
        html += '<li draggable="true" data-id="' + c.id + '">' + esc(c.category_name) + '</li>';
      });
      html += '</ul>';

      box.innerHTML = html;

      var dragSrc = null;

      qsa('li', box).forEach(function (li) {
        li.addEventListener('dragstart', function () {
          dragSrc = li;
        });
        li.addEventListener('dragover', function (e) {
          e.preventDefault();
        });
        li.addEventListener('drop', function () {
          if (dragSrc && dragSrc !== li) {
            li.parentNode.insertBefore(dragSrc, li.nextSibling);
            UI._commitSort();
          }
        });
      });
    },

    _commitSort: function () {
      var ids = qsa('#meSort li').map(function (li) {
        return Number(li.dataset.id);
      });
      MatEditCategories.sort(ids);
    },

    /* ===============================
     * 4️⃣ 承辦人員
     * =============================== */
    renderPersonnel: function (rows) {
      var box = qs('#mePersonnel');
      if (!box) return;

      var html = '<table class="table"><thead>'
        + '<tr><th>班別</th><th>承辦人</th></tr>'
        + '</thead><tbody>';

      rows.forEach(function (r) {
        html += ''
          + '<tr>'
          + '<td>' + esc(r.shift_code) + '</td>'
          + '<td>'
          + '  <input type="text" data-shift="' + esc(r.shift_code) + '" value="' + esc(r.person_name) + '" />'
          + '</td>'
          + '</tr>';
      });

      html += '</tbody></table>';
      box.innerHTML = html;

      qsa('input[data-shift]', box).forEach(function (inp) {
        inp.addEventListener('blur', function () {
          MatEditPersonnel.save(this.dataset.shift, this.value);
        });
      });
    }
  };

  global.MatEditUI = UI;

})(window);
