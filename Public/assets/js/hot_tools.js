/* Path: Public/assets/js/hot_tools.js
 * 說明: 活電工具管理（tools.php）總控
 * - 狀態：activeItemId / items / tools / vehicles
 * - 協調：hot_tools_items.js（左表）與 hot_tools_list.js（右表）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function toastOk(msg) {
    if (global.Toast && typeof global.Toast.show === 'function') {
      return global.Toast.show({ type: 'success', title: '成功', message: msg, duration: 2200 });
    }
    alert(msg);
  }
  function toastErr(msg) {
    if (global.Toast && typeof global.Toast.show === 'function') {
      return global.Toast.show({ type: 'error', title: '錯誤', message: msg, duration: 3200 });
    }
    alert(msg);
  }

  function openModal(id) {
    var bd = qs('#' + id);
    if (!bd) return;

    // ✅ 用共用 modal CSS 的開啟規則（is-open）
    bd.hidden = false;
    bd.classList.remove('is-leave');
    bd.classList.add('is-open');

    var panel = bd.querySelector('.modal-panel');
    if (panel) {
      panel.classList.remove('is-leave');
      panel.classList.add('is-open');
    }

    document.body.classList.add('modal-open');
  }

  function closeModal(id) {
    var bd = qs('#' + id);
    if (!bd) return;

    // ✅ 用共用 modal CSS 的關閉規則（is-leave）
    bd.classList.remove('is-open');
    bd.classList.add('is-leave');

    var panel = bd.querySelector('.modal-panel');
    if (panel) {
      panel.classList.remove('is-open');
      panel.classList.add('is-leave');
    }

    window.setTimeout(function () {
      bd.hidden = true;
      bd.classList.remove('is-leave');
      if (!document.querySelector('.modal-backdrop.is-open:not([hidden])')) {
        document.body.classList.remove('modal-open');
      }
    }, 220);
  }

  function bindCloseModalButtons() {
    // 支援你頁面 data-close-modal="modalId"
    qsa('[data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-close-modal');
        if (id) closeModal(id);
      });
    });
  }

  // ✅ API 常數（避免散落字串）
  var API_HOT_TOOLS = '/api/hot/tools';

  var App = {
    state: {
      items: [],
      tools: [],
      vehicles: [],
      activeItemId: 0,
      activeItem: null,
      itemsMode: 'VIEW', // VIEW | EDIT
      toolsMode: 'VIEW', // VIEW | EDIT
      loading: false,
      reqSeq: 0
    },

    els: {},

    init: function () {
      this.cacheEls();
      bindCloseModalButtons();

      // 子模組需要用到 App（總控）
      global.HotToolsApp = this;

      // 掛事件（只做「總控層」）
      this.bindActions();

      // 首載
      this.reloadAll();
    },

    cacheEls: function () {
      this.els.tbItems = qs('#tbHotItems');
      this.els.tbTools = qs('#tbHotTools');
      this.els.activeLabel = qs('#hotActiveItemLabel');

      // 左 actions
      this.els.itemsActions = qs('#hotItemsActions');
      this.els.btnItemAdd = qs('#btnItemAdd');
      this.els.btnItemEdit = qs('#btnItemEdit');
      this.els.btnItemSave = qs('#btnItemSave');
      this.els.btnItemCancel = qs('#btnItemCancel');

      // 右 actions
      this.els.toolsActions = qs('#hotToolsActions');
      this.els.btnToolAdd = qs('#btnToolAdd');
      this.els.btnToolEdit = qs('#btnToolEdit');
      this.els.btnToolSave = qs('#btnToolSave');
      this.els.btnToolCancel = qs('#btnToolCancel');

      // modals
      this.els.modalItemAdd = qs('#modalItemAdd');
      this.els.modalItemDelete = qs('#modalItemDelete');
      this.els.modalToolAdd = qs('#modalToolAdd');

      // 新增分類 modal fields
      this.els.mItemName = qs('#mItemName');
      this.els.mItemQty = qs('#mItemQty');
      this.els.btnItemAddSubmit = qs('#btnItemAddSubmit');

      // 刪除分類 modal fields
      this.els.mItemDelMeta = qs('#mItemDelMeta');
      this.els.mItemDelTotal = qs('#mItemDelTotal');
      this.els.mItemDelAssigned = qs('#mItemDelAssigned');
      this.els.mItemDelVehicles = qs('#mItemDelVehicles');
      this.els.btnItemDeleteSubmit = qs('#btnItemDeleteSubmit');

      // 新增工具 modal fields
      this.els.mToolQty = qs('#mToolQty');
      this.els.mToolInspectDate = qs('#mToolInspectDate');
      this.els.mToolVehicle = qs('#mToolVehicle');
      this.els.mToolNote = qs('#mToolNote');
      this.els.mToolRangeText = qs('#mToolRangeText');
      this.els.btnToolAddSubmit = qs('#btnToolAddSubmit');
    },

    bindActions: function () {
      var self = this;

      // 左：新增分類 modal 開啟
      if (this.els.btnItemAdd) {
        this.els.btnItemAdd.addEventListener('click', function () {
          self.openItemAddModal();
        });
      }

      // 左：編輯（切換 EDIT）
      if (this.els.btnItemEdit) {
        this.els.btnItemEdit.addEventListener('click', function () {
          if (!self.state.items || self.state.items.length === 0) return toastErr('尚無分類可編輯');
          self.setItemsMode('EDIT');
        });
      }

      // 左：儲存（EDIT -> POST item_update）
      if (this.els.btnItemSave) {
        this.els.btnItemSave.addEventListener('click', function () {
          self.saveItemsEdit();
        });
      }

      // 左：取消
      if (this.els.btnItemCancel) {
        this.els.btnItemCancel.addEventListener('click', function () {
          self.setItemsMode('VIEW');
          // 回到 DB 狀態（重新拉 items + tools）
          self.reloadItemsKeepActive();
        });
      }

      // 左：新增分類 modal submit
      if (this.els.btnItemAddSubmit) {
        this.els.btnItemAddSubmit.addEventListener('click', function () {
          self.submitItemAdd();
        });
      }

      // 左：刪除分類 modal submit
      if (this.els.btnItemDeleteSubmit) {
        this.els.btnItemDeleteSubmit.addEventListener('click', function () {
          self.submitItemDelete();
        });
      }

      // 右：新增工具 modal 開啟
      if (this.els.btnToolAdd) {
        this.els.btnToolAdd.addEventListener('click', function () {
          if (!self.state.activeItemId) return toastErr('請先選取左側分類');
          self.openToolAddModal();
        });
      }

      // 右：編輯
      if (this.els.btnToolEdit) {
        this.els.btnToolEdit.addEventListener('click', function () {
          if (!self.state.activeItemId) return toastErr('請先選取左側分類');
          self.setToolsMode('EDIT');
        });
      }

      // 右：儲存
      if (this.els.btnToolSave) {
        this.els.btnToolSave.addEventListener('click', function () {
          self.saveToolsEdit();
        });
      }

      // 右：取消
      if (this.els.btnToolCancel) {
        this.els.btnToolCancel.addEventListener('click', function () {
          self.setToolsMode('VIEW');
          self.reloadTools();
        });
      }

      // 新增工具：qty 變更時即時計算範圍（GET add_preview）
      if (this.els.mToolQty) {
        this.els.mToolQty.addEventListener('input', function () {
          self.refreshToolAddRangePreview();
        });
      }
    },

    /* =========================
     * API helpers
     * ========================= */
    apiGet: function (url, params) {
      if (typeof global.apiGet !== 'function') return Promise.resolve({ success: false, data: null, error: 'apiGet 不存在' });
      return global.apiGet(url, params);
    },
    apiPost: function (url, body) {
      if (typeof global.apiPost !== 'function') return Promise.resolve({ success: false, data: null, error: 'apiPost 不存在' });
      return global.apiPost(url, body);
    },

    /* =========================
     * Reload
     * ========================= */
    reloadAll: function () {
      var self = this;
      var seq = ++this.state.reqSeq;

      // items + vehicles 一次載；tools 依 activeItem 再載
      Promise.all([
        self.apiGet(API_HOT_TOOLS, { action: 'items' }),
        self.apiGet(API_HOT_TOOLS, { action: 'vehicles' })
      ]).then(function (arr) {
        if (seq !== self.state.reqSeq) return;

        var rItems = arr[0];
        var rVeh = arr[1];

        if (!rItems || !rItems.success) return toastErr(rItems && rItems.error ? rItems.error : '載入分類失敗');
        if (!rVeh || !rVeh.success) return toastErr(rVeh && rVeh.error ? rVeh.error : '載入車輛清單失敗');

        self.state.items = (rItems.data && rItems.data.items) ? rItems.data.items : [];
        self.state.vehicles = (rVeh.data && rVeh.data.vehicles) ? rVeh.data.vehicles : [];

        // 預設 active：第一筆（若目前沒有 active）
        if (!self.state.activeItemId && self.state.items.length > 0) {
          self.state.activeItemId = parseInt(self.state.items[0].id, 10) || 0;
        } else if (self.state.activeItemId) {
          // 確保 active 仍存在
          var ok = self.state.items.some(function (x) { return (parseInt(x.id, 10) || 0) === self.state.activeItemId; });
          if (!ok && self.state.items.length > 0) self.state.activeItemId = parseInt(self.state.items[0].id, 10) || 0;
          if (!ok && self.state.items.length === 0) self.state.activeItemId = 0;
        }

        self.syncActiveItem();
        self.renderItems();

        if (self.state.activeItemId) {
          self.reloadTools();
        } else {
          self.state.tools = [];
          self.renderTools();
        }
      });
    },

    reloadItemsKeepActive: function () {
      var self = this;
      var seq = ++this.state.reqSeq;

      this.apiGet(API_HOT_TOOLS, { action: 'items' })
        .then(function (r) {
          if (seq !== self.state.reqSeq) return;
          if (!r || !r.success) return toastErr(r && r.error ? r.error : '載入分類失敗');

          self.state.items = (r.data && r.data.items) ? r.data.items : [];

          // active 仍存在就不變，否則退回第一筆
          if (self.state.activeItemId) {
            var ok = self.state.items.some(function (x) { return (parseInt(x.id, 10) || 0) === self.state.activeItemId; });
            if (!ok) self.state.activeItemId = self.state.items.length ? (parseInt(self.state.items[0].id, 10) || 0) : 0;
          } else if (self.state.items.length) {
            self.state.activeItemId = parseInt(self.state.items[0].id, 10) || 0;
          }

          self.syncActiveItem();
          self.renderItems();

          if (self.state.activeItemId) self.reloadTools();
          else { self.state.tools = []; self.renderTools(); }
        });
    },

    reloadTools: function () {
      var self = this;
      var itemId = self.state.activeItemId;
      if (!itemId) return;

      var seq = ++this.state.reqSeq;

      this.apiGet(API_HOT_TOOLS, { action: 'tools', item_id: itemId })
        .then(function (r) {
          if (seq !== self.state.reqSeq) return;
          if (!r || !r.success) return toastErr(r && r.error ? r.error : '載入工具失敗');

          self.state.tools = (r.data && r.data.tools) ? r.data.tools : [];
          self.renderTools();
        });
    },

    syncActiveItem: function () {
      var id = this.state.activeItemId;
      var it = null;
      for (var i = 0; i < this.state.items.length; i++) {
        var x = this.state.items[i];
        if ((parseInt(x.id, 10) || 0) === id) { it = x; break; }
      }
      this.state.activeItem = it;

      if (this.els.activeLabel) {
        if (!it) this.els.activeLabel.textContent = '未選取分類';
        else this.els.activeLabel.textContent = it.code + '｜' + it.name;
      }
    },

    /* =========================
     * Render delegations
     * ========================= */
    renderItems: function () {
      if (!global.HotToolsItems || typeof global.HotToolsItems.render !== 'function') return;
      global.HotToolsItems.render(this.els.tbItems, this.state.items, this.state.activeItemId, this.state.itemsMode);
    },

    renderTools: function () {
      if (!global.HotToolsList || typeof global.HotToolsList.render !== 'function') return;
      global.HotToolsList.render(this.els.tbTools, this.state.tools, this.state.vehicles, this.state.toolsMode);
    },

    /* =========================
     * Mode switches
     * ========================= */
    setItemsMode: function (mode) {
      this.state.itemsMode = mode === 'EDIT' ? 'EDIT' : 'VIEW';

      // 左 actions 顯示切換
      var isEdit = (this.state.itemsMode === 'EDIT');
      if (this.els.itemsActions) this.els.itemsActions.setAttribute('data-mode', this.state.itemsMode);

      if (this.els.btnItemAdd) this.els.btnItemAdd.hidden = isEdit;
      if (this.els.btnItemEdit) this.els.btnItemEdit.hidden = isEdit;
      if (this.els.btnItemSave) this.els.btnItemSave.hidden = !isEdit;
      if (this.els.btnItemCancel) this.els.btnItemCancel.hidden = !isEdit;

      this.renderItems();
    },

    setToolsMode: function (mode) {
      this.state.toolsMode = mode === 'EDIT' ? 'EDIT' : 'VIEW';

      var isEdit = (this.state.toolsMode === 'EDIT');
      if (this.els.toolsActions) this.els.toolsActions.setAttribute('data-mode', this.state.toolsMode);

      if (this.els.btnToolAdd) this.els.btnToolAdd.hidden = isEdit;
      if (this.els.btnToolEdit) this.els.btnToolEdit.hidden = isEdit;
      if (this.els.btnToolSave) this.els.btnToolSave.hidden = !isEdit;
      if (this.els.btnToolCancel) this.els.btnToolCancel.hidden = !isEdit;

      this.renderTools();
    },

    /* =========================
     * Left: items handlers
     * ========================= */
    selectItem: function (itemId) {
      itemId = parseInt(itemId, 10) || 0;
      if (!itemId) return;

      // EDIT 時不允許切換（避免編輯中資料錯位）
      if (this.state.itemsMode === 'EDIT') return;

      if (this.state.activeItemId === itemId) return;
      this.state.activeItemId = itemId;
      this.syncActiveItem();
      this.renderItems();

      // 右側切回 VIEW
      this.setToolsMode('VIEW');
      this.reloadTools();
    },

    openItemAddModal: function () {
      if (!this.els.modalItemAdd) return;
      if (this.els.mItemName) this.els.mItemName.value = '';
      if (this.els.mItemQty) this.els.mItemQty.value = 1;
      openModal('modalItemAdd');
      if (this.els.mItemName) this.els.mItemName.focus();
    },

    submitItemAdd: function () {
      var self = this;
      var name = this.els.mItemName ? String(this.els.mItemName.value || '').trim() : '';
      var qty = this.els.mItemQty ? (parseInt(this.els.mItemQty.value, 10) || 0) : 0;

      if (!name) return toastErr('分類名稱為必填');
      if (qty < 1) return toastErr('初始數量 qty 必須 >= 1');

      this.apiPost(API_HOT_TOOLS, { action: 'item_create', name: name, qty: qty })
        .then(function (r) {
          if (!r || !r.success) return toastErr(r && r.error ? r.error : '建立分類失敗');
          closeModal('modalItemAdd');
          toastOk('已建立分類');

          // 重新載入 items，並將新分類設為 active（以 code 找最末新增也可，但這裡用 reload 再取第一筆不準）
          // 方案：reload 後嘗試以回傳 item_id 設 active
          var newId = r.data && r.data.item_id ? (parseInt(r.data.item_id, 10) || 0) : 0;
          self.reloadAll();
          if (newId) {
            // 等 reloadAll 完成後才 select：簡化做法延遲一點點
            setTimeout(function () { self.selectItem(newId); }, 200);
          }
        });
    },

    openItemDeleteModal: function (itemId) {
      var self = this;
      itemId = parseInt(itemId, 10) || 0;
      if (!itemId) return;

      // 先 GET delete_preview
      this.apiGet(API_HOT_TOOLS, { action: 'delete_preview', item_id: itemId })
        .then(function (r) {
          if (!r || !r.success) return toastErr(r && r.error ? r.error : '載入刪除預覽失敗');

          var it = r.data && r.data.item ? r.data.item : null;
          var total = r.data && (r.data.tool_total !== undefined) ? r.data.tool_total : '-';
          var assigned = r.data && (r.data.assigned_cnt !== undefined) ? r.data.assigned_cnt : '-';
          var vehicles = r.data && r.data.vehicles ? r.data.vehicles : [];

          if (self.els.mItemDelMeta) self.els.mItemDelMeta.textContent = it ? (it.code + '｜' + it.name) : '-';
          if (self.els.mItemDelTotal) self.els.mItemDelTotal.textContent = String(total);
          if (self.els.mItemDelAssigned) self.els.mItemDelAssigned.textContent = String(assigned);

          if (self.els.mItemDelVehicles) {
            if (!vehicles || vehicles.length === 0) {
              self.els.mItemDelVehicles.textContent = '（無配賦）';
            } else {
              // 最多顯示 6 筆，避免爆版
              var parts = vehicles.slice(0, 6).map(function (v) {
                var tag = (String(v.is_active) === '0') ? '（停用）' : '';
                return (v.vehicle_code + '/' + v.plate_no + '×' + v.cnt + tag);
              });
              if (vehicles.length > 6) parts.push('…');
              self.els.mItemDelVehicles.textContent = parts.join('、');
            }
          }

          // 將 itemId 暫存到 modal dataset
          if (self.els.modalItemDelete) self.els.modalItemDelete.dataset.itemId = String(itemId);

          openModal('modalItemDelete');
        });
    },

    submitItemDelete: function () {
      var self = this;
      var itemId = 0;
      if (this.els.modalItemDelete && this.els.modalItemDelete.dataset.itemId) {
        itemId = parseInt(this.els.modalItemDelete.dataset.itemId, 10) || 0;
      }
      if (!itemId) return toastErr('item_id 不可為空');

      this.apiPost(API_HOT_TOOLS, { action: 'item_delete', id: itemId })
        .then(function (r) {
          if (!r || !r.success) return toastErr(r && r.error ? r.error : '刪除失敗');
          closeModal('modalItemDelete');
          toastOk('已刪除分類（含工具）');

          // 若刪到 active，要重設 active
          if (self.state.activeItemId === itemId) self.state.activeItemId = 0;

          self.setItemsMode('VIEW');
          self.setToolsMode('VIEW');
          self.reloadAll();
        });
    },

    saveItemsEdit: function () {
      var self = this;
      if (this.state.itemsMode !== 'EDIT') return;

      // 從 tbody 取 input 值（由 hot_tools_items.js 產生）
      var rows = [];
      qsa('#tbHotItems tr[data-item-id]').forEach(function (tr) {
        var id = parseInt(tr.getAttribute('data-item-id'), 10) || 0;
        if (!id) return;
        var inp = tr.querySelector('input[data-field="name"]');
        if (!inp) return;
        rows.push({ id: id, name: String(inp.value || '').trim() });
      });

      if (rows.length < 1) return toastErr('沒有可儲存的資料');

      // 基本檢核：不可空
      for (var i = 0; i < rows.length; i++) {
        if (!rows[i].name) return toastErr('分類名稱不可為空');
      }

      this.apiPost(API_HOT_TOOLS, { action: 'item_update', rows: rows })
        .then(function (r) {
          if (!r || !r.success) return toastErr(r && r.error ? r.error : '儲存失敗');
          toastOk('已儲存分類');
          self.setItemsMode('VIEW');
          self.reloadItemsKeepActive();
        });
    },

    /* =========================
     * Right: tools handlers
     * ========================= */
    openToolAddModal: function () {
      if (!this.els.modalToolAdd) return;

      // vehicles 下拉
      this.injectVehiclesSelect(this.els.mToolVehicle, this.state.vehicles);

      if (this.els.mToolQty) this.els.mToolQty.value = 1;
      if (this.els.mToolInspectDate) this.els.mToolInspectDate.value = '';
      if (this.els.mToolVehicle) this.els.mToolVehicle.value = '';
      if (this.els.mToolNote) this.els.mToolNote.value = '';

      // 立即試算範圍
      this.refreshToolAddRangePreview();

      openModal('modalToolAdd');
      if (this.els.mToolQty) this.els.mToolQty.focus();
    },

    injectVehiclesSelect: function (sel, vehicles) {
      if (!sel) return;
      var html = '<option value="">（不配賦）</option>';
      (vehicles || []).forEach(function (v) {
        var tag = (String(v.is_active) === '0') ? '（停用）' : '';
        var text = (v.vehicle_code + ' / ' + v.plate_no + tag);
        html += '<option value="' + esc(v.id) + '">' + esc(text) + '</option>';
      });
      sel.innerHTML = html;
    },

    refreshToolAddRangePreview: function () {
      var self = this;
      var itemId = this.state.activeItemId;
      if (!itemId) return;

      var qty = this.els.mToolQty ? (parseInt(this.els.mToolQty.value, 10) || 0) : 0;
      if (qty < 1) {
        if (this.els.mToolRangeText) this.els.mToolRangeText.textContent = '-';
        return;
      }

      this.apiGet(API_HOT_TOOLS, { action: 'add_preview', item_id: itemId, qty: qty })
        .then(function (r) {
          if (!r || !r.success) {
            if (self.els.mToolRangeText) self.els.mToolRangeText.textContent = '-';
            return;
          }
          var range = r.data && r.data.range ? r.data.range : null;
          if (!range) {
            if (self.els.mToolRangeText) self.els.mToolRangeText.textContent = '-';
            return;
          }
          if (self.els.mToolRangeText) self.els.mToolRangeText.textContent = range.start + ' ～ ' + range.end;
        });
    },

    submitToolAdd: function () {
      var self = this;
      var itemId = this.state.activeItemId;
      if (!itemId) return toastErr('請先選取左側分類');

      var qty = this.els.mToolQty ? (parseInt(this.els.mToolQty.value, 10) || 0) : 0;
      if (qty < 1) return toastErr('新增數量 qty 必須 >= 1');

      var inspectDate = this.els.mToolInspectDate ? String(this.els.mToolInspectDate.value || '').trim() : '';
      var vehicleId = this.els.mToolVehicle ? String(this.els.mToolVehicle.value || '').trim() : '';
      var note = this.els.mToolNote ? String(this.els.mToolNote.value || '').trim() : '';

      var payload = {
        action: 'tool_add',
        item_id: itemId,
        qty: qty,
        inspect_date: inspectDate || null,
        vehicle_id: vehicleId || null,
        note: note || null
      };

      this.apiPost(API_HOT_TOOLS, payload)
        .then(function (r) {
          if (!r || !r.success) return toastErr(r && r.error ? r.error : '新增工具失敗');
          closeModal('modalToolAdd');
          toastOk('已新增工具');

          // 右表刷新、左表 counts 也要刷新
          self.reloadItemsKeepActive();
          self.reloadTools();
        });
    },

    saveToolsEdit: function () {
      var self = this;
      if (this.state.toolsMode !== 'EDIT') return;
      if (!this.state.activeItemId) return toastErr('請先選取左側分類');

      var rows = [];

      // 由 hot_tools_list.js 產生 input/select
      qsa('#tbHotTools tr[data-tool-id]').forEach(function (tr) {
        var id = parseInt(tr.getAttribute('data-tool-id'), 10) || 0;
        if (!id) return;

        var inpDate = tr.querySelector('input[data-field="inspect_date"]');
        var selVeh = tr.querySelector('select[data-field="vehicle_id"]');
        var inpNote = tr.querySelector('input[data-field="note"]');

        rows.push({
          id: id,
          inspect_date: inpDate ? (String(inpDate.value || '').trim() || null) : null,
          vehicle_id: selVeh ? (String(selVeh.value || '').trim() || null) : null,
          note: inpNote ? (String(inpNote.value || '').trim() || null) : null
        });
      });

      this.apiPost(API_HOT_TOOLS, {
        action: 'tool_update',
        item_id: this.state.activeItemId,
        rows: rows
      }).then(function (r) {
        if (!r || !r.success) return toastErr(r && r.error ? r.error : '儲存失敗');
        toastOk('已儲存工具');
        self.setToolsMode('VIEW');
        self.reloadItemsKeepActive(); // counts 可能變
        self.reloadTools();
      });
    }
  };

  // 對外：給子模組呼叫（例如點擊分類列、點刪除）
  App.openItemDeleteModal = App.openItemDeleteModal.bind(App);
  App.selectItem = App.selectItem.bind(App);
  App.submitToolAdd = App.submitToolAdd.bind(App);

  document.addEventListener('DOMContentLoaded', function () {
    // 綁 modal submit（工具新增）
    // 放這裡避免元素尚未存在
    App.init();

    // 新增工具 modal submit
    if (App.els.btnToolAddSubmit) {
      App.els.btnToolAddSubmit.addEventListener('click', function () {
        App.submitToolAdd();
      });
    }
  });

})(window);
