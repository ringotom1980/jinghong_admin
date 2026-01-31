/* Path: Public/assets/js/hot_assign_modals.js
 * 說明: 活電工具配賦｜Modal 控制
 * - 對齊 pages: Public/modules/hot/assign.php（modalVehAdd / modalVehDelete）
 * - 對齊 API : Public/api/hot/assign.php
 *   GET : action=available_vehicles / items_counts / unassigned_tools / tools
 *   POST: action=vehicle_add / vehicle_unassign_all
 *
 * 注意：
 * - 本檔只處理「新增車輛配賦」與「解除該車全部配賦」兩個 modal（你頁面已存在）
 * - 右表「新增配賦 / 移轉進來」你頁面尚未放對應 modal DOM，先不做
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(type, title, message) {
    if (global.Toast && typeof global.Toast.show === 'function') {
      global.Toast.show({ type: type, title: title, message: message });
      return;
    }
    // fallback
    alert((title ? title + '\n' : '') + (message || ''));
  }

  function apiGet(url) {
    if (typeof global.apiGet === 'function') return global.apiGet(url);
    return Promise.resolve({ success: false, error: 'apiGet 不存在' });
  }

  function apiPost(url, body) {
    if (typeof global.apiPost === 'function') return global.apiPost(url, body);
    return Promise.resolve({ success: false, error: 'apiPost 不存在' });
  }

  function openModal(id) {
    var el = qs('#' + id);
    if (!el) return;
    el.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal(id) {
    var el = qs('#' + id);
    if (!el) return;
    el.hidden = true;
    // 若頁面有多個 modal，只有全部關閉才移除 class
    var anyOpen = qsa('.modal-backdrop').some(function (x) { return !x.hidden; });
    if (!anyOpen) document.body.classList.remove('modal-open');
  }

  function bindCloseButtons() {
    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-close-modal]') : null;
      if (!btn) return;
      var mid = btn.getAttribute('data-close-modal');
      if (mid) closeModal(mid);
    });

    // 點 backdrop 空白處關閉（只對有 modal-backdrop 的）
    document.addEventListener('click', function (e) {
      var bd = e.target && e.target.classList && e.target.classList.contains('modal-backdrop') ? e.target : null;
      if (!bd) return;
      if (bd.getAttribute('id')) closeModal(bd.getAttribute('id'));
    });

    // ESC 關閉最上層
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var opens = qsa('.modal-backdrop').filter(function (x) { return !x.hidden; });
      if (!opens.length) return;
      var top = opens[opens.length - 1];
      closeModal(top.getAttribute('id'));
    });
  }

  /* ========== 新增車 modal：動態列 ========== */

  function buildRowLine(idx, items) {
    // items: [{id, code, name, tool_total, assigned_cnt, available_cnt}]
    var opt = '<option value="">請選擇分類</option>';
    for (var i = 0; i < items.length; i++) {
      var it = items[i] || {};
      var iid = Number(it.id || 0);
      if (!iid) continue;
      var label = (it.code ? it.code + '｜' : '') + (it.name || '');
      opt += '<option value="' + iid + '">' + esc(label) + '</option>';
    }

    return ''
      + '<div class="hot-rowLine" data-row-idx="' + idx + '">'
      + '  <div class="hot-rowLine__grid">'
      + '    <div class="hot-field">'
      + '      <label class="form-label">工具分類<span class="hot-req">*</span></label>'
      + '      <select class="input js-item">' + opt + '</select>'
      + '    </div>'
      + '    <div class="hot-field">'
      + '      <label class="form-label">工具編號<span class="hot-req">*</span></label>'
      + '      <select class="input js-tool" disabled>'
      + '        <option value="">請先選分類</option>'
      + '      </select>'
      + '    </div>'
      + '    <div class="hot-field">'
      + '      <label class="form-label">檢驗日期</label>'
      + '      <input class="input js-inspect" type="date" />'
      + '    </div>'
      + '    <div class="hot-field">'
      + '      <label class="form-label">備註</label>'
      + '      <input class="input js-note" type="text" placeholder="可空" />'
      + '    </div>'
      + '  </div>'
      + '  <div class="hot-rowLine__actions">'
      + '    <button type="button" class="btn btn--ghost js-row-del">刪除列</button>'
      + '  </div>'
      + '</div>';
  }

  function vehicleLabel(v) {
    // v: {vehicle_code, plate_no, is_active}
    var parts = [];
    if (v.vehicle_code) parts.push(String(v.vehicle_code));
    if (v.plate_no) parts.push(String(v.plate_no));
    var s = parts.join('｜');
    if (Number(v.is_active || 0) === 0) s += '（停用中）';
    return s;
  }

  var Mod = {
    app: null,

    els: {
      // add modal
      mVehPick: null,
      mVehRows: null,
      btnAddRow: null,
      btnVehAddSubmit: null,
      mVehDynHintText: null,

      // delete modal
      mVehDelMeta: null,
      mVehDelCount: null,
      mVehDelTools: null,
      btnVehDeleteSubmit: null
    },

    state: {
      itemsCounts: [],
      availableVehicles: [],
      rowSeq: 0,
      pendingDeleteVehicleId: 0
    },

    init: function (app) {
      this.app = app || null;

      // bind close buttons once
      bindCloseButtons();

      // cache dom
      this.els.mVehPick = qs('#mVehPick');
      this.els.mVehRows = qs('#mVehRows');
      this.els.btnAddRow = qs('#btnAddRow');
      this.els.btnVehAddSubmit = qs('#btnVehAddSubmit');
      this.els.mVehDynHintText = qs('#mVehDynHintText');

      this.els.mVehDelMeta = qs('#mVehDelMeta');
      this.els.mVehDelCount = qs('#mVehDelCount');
      this.els.mVehDelTools = qs('#mVehDelTools');
      this.els.btnVehDeleteSubmit = qs('#btnVehDeleteSubmit');

      // add row button
      var self = this;
      if (this.els.btnAddRow) {
        this.els.btnAddRow.addEventListener('click', function () {
          self.addRow();
        });
      }

      // row events (delegate)
      if (this.els.mVehRows) {
        this.els.mVehRows.addEventListener('click', function (e) {
          var del = e.target && e.target.closest ? e.target.closest('.js-row-del') : null;
          if (!del) return;
          var line = del.closest('.hot-rowLine');
          if (!line) return;
          line.parentNode.removeChild(line);
          self.updateDynHint();
          self.refreshAllToolSelects(); // 釋放被占用的工具
          self.ensureNotEmptyPlaceholder();
        });

        this.els.mVehRows.addEventListener('change', function (e) {
          var line = e.target && e.target.closest ? e.target.closest('.hot-rowLine') : null;
          if (!line) return;

          if (e.target.classList.contains('js-item')) {
            var itemId = Number(e.target.value || 0);
            self.onItemChanged(line, itemId);
          }

          if (e.target.classList.contains('js-tool')) {
            self.refreshAllToolSelects(); // 同分類要排除已選
          }
        });
      }

      // submit add
      if (this.els.btnVehAddSubmit) {
        this.els.btnVehAddSubmit.addEventListener('click', function () {
          self.submitVehicleAdd();
        });
      }

      // submit delete
      if (this.els.btnVehDeleteSubmit) {
        this.els.btnVehDeleteSubmit.addEventListener('click', function () {
          self.submitVehicleDelete();
        });
      }

      // === aliases (兼容你 hot_assign.js 可能呼叫的名字) ===
      // openCreateAssignModal() → 其實是「新增車輛配賦」
      this.openCreateAssignModal = this.openVehAdd.bind(this);
      // openClearConfirm(vehicleId) → 其實是左表刪除（解除全部配賦）
      this.openClearConfirm = this.openVehDelete.bind(this);
    },

    /* ===== open modals ===== */

    openVehAdd: function () {
      var self = this;

      // reset ui
      if (this.els.mVehPick) this.els.mVehPick.innerHTML = '<option value="">請選擇車輛</option>';
      if (this.els.mVehRows) this.els.mVehRows.innerHTML = '';
      this.state.rowSeq = 0;
      this.state.itemsCounts = [];
      this.state.availableVehicles = [];

      // fetch picklists
      Promise.all([
        apiGet('/api/hot/assign?action=available_vehicles'),
        apiGet('/api/hot/assign?action=items_counts')
      ]).then(function (arr) {
        var jV = arr[0] || {};
        var jI = arr[1] || {};

        if (!jV.success) {
          showToast('danger', '載入失敗', jV.error || 'available_vehicles');
          return;
        }
        if (!jI.success) {
          showToast('danger', '載入失敗', jI.error || 'items_counts');
          return;
        }

        self.state.availableVehicles = (jV.data && jV.data.vehicles) ? jV.data.vehicles : [];
        self.state.itemsCounts = (jI.data && jI.data.items) ? jI.data.items : [];

        // fill vehicle select
        if (self.els.mVehPick) {
          var html = '<option value="">請選擇車輛</option>';
          self.state.availableVehicles.forEach(function (v) {
            var id = Number(v.id || 0);
            if (!id) return;
            html += '<option value="' + id + '">' + esc(vehicleLabel(v)) + '</option>';
          });
          self.els.mVehPick.innerHTML = html;
        }

        // default add one row
        self.addRow();
        self.updateDynHint();
        openModal('modalVehAdd');
      });
    },

    openVehDelete: function (vehicleId) {
      var self = this;
      vehicleId = Number(vehicleId || 0);

      if (!vehicleId) {
        showToast('warning', '尚未選取車輛', '請先選取左側車輛');
        return;
      }

      self.state.pendingDeleteVehicleId = vehicleId;

      // 顯示 meta（從 app.state.vehicles 找）
      var meta = '-';
      var cnt = '-';
      if (self.app && self.app.state && Array.isArray(self.app.state.vehicles)) {
        var v = self.app.state.vehicles.find(function (x) { return Number(x.vehicle_id || x.id || 0) === vehicleId; });
        if (v) {
          meta = v.vehicle_label || (String(v.vehicle_code || '') + '｜' + String(v.plate_no || ''));
          if (Number(v.is_active || 1) === 0) meta += '（停用中）';
          cnt = String(v.assigned_cnt || v.assigned_count || 0);
        }
      }
      if (self.els.mVehDelMeta) self.els.mVehDelMeta.textContent = meta;
      if (self.els.mVehDelCount) self.els.mVehDelCount.textContent = cnt;

      // tools summary（抓該車 tools）
      if (self.els.mVehDelTools) self.els.mVehDelTools.textContent = '載入中…';

      apiGet('/api/hot/assign?action=tools&vehicle_id=' + encodeURIComponent(String(vehicleId)))
        .then(function (j) {
          if (!j || !j.success) {
            if (self.els.mVehDelTools) self.els.mVehDelTools.textContent = (j && j.error) ? j.error : '載入失敗';
            openModal('modalVehDelete');
            return;
          }
          var rows = (j.data && j.data.tools) ? j.data.tools : [];
          if (!rows.length) {
            if (self.els.mVehDelTools) self.els.mVehDelTools.textContent = '（無工具）';
          } else {
            // 摘要最多 10 筆
            var parts = [];
            for (var i = 0; i < rows.length && i < 10; i++) {
              var r = rows[i] || {};
              var s = (r.item_code ? r.item_code + '｜' : '') + (r.tool_no || '');
              parts.push(s);
            }
            var more = rows.length > 10 ? ' …(共 ' + rows.length + ' 筆)' : '';
            if (self.els.mVehDelTools) self.els.mVehDelTools.textContent = parts.join('，') + more;
          }
          openModal('modalVehDelete');
        });
    },

    /* ===== rows ===== */

    ensureNotEmptyPlaceholder: function () {
      if (!this.els.mVehRows) return;
      var lines = qsa('.hot-rowLine', this.els.mVehRows);
      if (lines.length) return;
      this.els.mVehRows.innerHTML = '<div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>';
    },

    addRow: function () {
      if (!this.els.mVehRows) return;

      // remove empty placeholder
      var empty = qs('.hot-rowLine--empty', this.els.mVehRows);
      if (empty) empty.parentNode.removeChild(empty);

      this.state.rowSeq += 1;
      var html = buildRowLine(this.state.rowSeq, this.state.itemsCounts || []);
      this.els.mVehRows.insertAdjacentHTML('beforeend', html);
      this.updateDynHint();
    },

    onItemChanged: function (line, itemId) {
      var self = this;
      var toolSel = qs('.js-tool', line);
      if (!toolSel) return;

      itemId = Number(itemId || 0);
      if (!itemId) {
        toolSel.innerHTML = '<option value="">請先選分類</option>';
        toolSel.disabled = true;
        self.updateDynHint();
        return;
      }

      toolSel.disabled = true;
      toolSel.innerHTML = '<option value="">載入中…</option>';

      apiGet('/api/hot/assign?action=unassigned_tools&item_id=' + encodeURIComponent(String(itemId)))
        .then(function (j) {
          if (!j || !j.success) {
            toolSel.innerHTML = '<option value="">載入失敗</option>';
            toolSel.disabled = true;
            self.updateDynHint();
            return;
          }

          var tools = (j.data && j.data.tools) ? j.data.tools : [];
          var chosen = self.collectChosenToolIds();

          var opt = '<option value="">請選擇工具</option>';
          tools.forEach(function (t) {
            var tid = Number(t.id || 0);
            if (!tid) return;
            if (chosen.indexOf(tid) >= 0) return; // 排除已選
            opt += '<option value="' + tid + '">' + esc(t.tool_no || '') + '</option>';
          });

          toolSel.innerHTML = opt;
          toolSel.disabled = false;

          self.updateDynHint();
        });
    },

    collectChosenToolIds: function () {
      if (!this.els.mVehRows) return [];
      var ids = [];
      qsa('.hot-rowLine .js-tool', this.els.mVehRows).forEach(function (sel) {
        var v = Number(sel.value || 0);
        if (v) ids.push(v);
      });
      // unique
      ids = ids.filter(function (v, i, a) { return a.indexOf(v) === i; });
      return ids;
    },

    refreshAllToolSelects: function () {
      // 目的：同一分類下拉要排除其他列已選工具
      if (!this.els.mVehRows) return;

      var self = this;
      var chosen = self.collectChosenToolIds();
      var lines = qsa('.hot-rowLine', this.els.mVehRows);

      lines.forEach(function (line) {
        var itemSel = qs('.js-item', line);
        var toolSel = qs('.js-tool', line);
        if (!itemSel || !toolSel) return;

        var itemId = Number(itemSel.value || 0);
        if (!itemId) return; // 尚未選分類

        // 如果 toolSel 目前 disabled 代表還在載入中/沒分類，不動
        if (toolSel.disabled) return;

        // 重新過濾現有 options：保留當前選中的 + 未被其他列選到的
        var current = Number(toolSel.value || 0);
        var opts = qsa('option', toolSel);

        opts.forEach(function (op) {
          var tid = Number(op.value || 0);
          if (!tid) return; // placeholder
          if (tid === current) {
            op.hidden = false;
            op.disabled = false;
            return;
          }
          var used = chosen.indexOf(tid) >= 0;
          op.hidden = used;
          op.disabled = used;
        });
      });

      self.updateDynHint();
    },

    updateDynHint: function () {
      if (!this.els.mVehDynHintText) return;

      // 顯示：A分類：總數/已配賦/可配賦（依目前第一列的分類）
      var firstItemSel = this.els.mVehRows ? qs('.hot-rowLine .js-item', this.els.mVehRows) : null;
      var itemId = firstItemSel ? Number(firstItemSel.value || 0) : 0;

      if (!itemId) {
        this.els.mVehDynHintText.textContent = '提示：選擇分類後顯示「總數 / 已配賦 / 可配賦」';
        return;
      }

      var it = (this.state.itemsCounts || []).find(function (x) { return Number(x.id || 0) === itemId; });
      if (!it) {
        this.els.mVehDynHintText.textContent = '提示：選擇分類後顯示「總數 / 已配賦 / 可配賦」';
        return;
      }

      var label = (it.code ? it.code : '分類') + '：總數 ' + Number(it.tool_total || 0)
        + '，已配賦 ' + Number(it.assigned_cnt || 0)
        + '，可配賦 ' + Number(it.available_cnt || 0);

      this.els.mVehDynHintText.textContent = label;
    },

    /* ===== submits ===== */

    submitVehicleAdd: function () {
      var self = this;
      if (!self.els.mVehPick) return;

      var vehicleId = Number(self.els.mVehPick.value || 0);
      if (!vehicleId) {
        showToast('warning', '資料不足', '請先選擇車輛');
        return;
      }

      if (!self.els.mVehRows) return;

      var lines = qsa('.hot-rowLine', self.els.mVehRows).filter(function (x) {
        return !x.classList.contains('hot-rowLine--empty');
      });

      if (!lines.length) {
        showToast('warning', '資料不足', '至少需新增 1 列工具');
        return;
      }

      var rows = [];
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var itemSel = qs('.js-item', line);
        var toolSel = qs('.js-tool', line);
        var inspect = qs('.js-inspect', line);
        var note = qs('.js-note', line);

        var itemId = itemSel ? Number(itemSel.value || 0) : 0;
        var toolId = toolSel ? Number(toolSel.value || 0) : 0;

        if (!itemId) {
          showToast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具分類');
          return;
        }
        if (!toolId) {
          showToast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具編號');
          return;
        }

        rows.push({
          tool_id: toolId,
          inspect_date: (inspect && inspect.value) ? String(inspect.value) : '',
          note: (note && note.value) ? String(note.value).trim() : ''
        });
      }

      // POST
      apiPost('/api/hot/assign', {
        action: 'vehicle_add',
        vehicle_id: vehicleId,
        rows: rows
      }).then(function (j) {
        if (!j || !j.success) {
          showToast('danger', '儲存失敗', (j && j.error) ? j.error : '未知錯誤');
          return;
        }
        showToast('success', '已儲存', '新增車輛配賦完成');
        closeModal('modalVehAdd');

        // 讓外層 app 重新載入
        if (self.app && typeof self.app.loadInit === 'function') {
          // 你的 hot_assign.js 若還在用 action=init 會 400（需改 API）
          // 但這裡先照你的主控設計呼叫
          self.app.loadInit(vehicleId);
        }
      });
    },

    submitVehicleDelete: function () {
      var self = this;
      var vehicleId = Number(self.state.pendingDeleteVehicleId || 0);
      if (!vehicleId) return;

      apiPost('/api/hot/assign', {
        action: 'vehicle_unassign_all',
        vehicle_id: vehicleId
      }).then(function (j) {
        if (!j || !j.success) {
          showToast('danger', '解除失敗', (j && j.error) ? j.error : '未知錯誤');
          return;
        }
        showToast('success', '已解除', '該車全部配賦已解除');
        closeModal('modalVehDelete');

        if (self.app && typeof self.app.loadInit === 'function') {
          self.app.loadInit(0);
        }
      });
    }
  };

  global.HotAssignModals = Mod;

})(window);
