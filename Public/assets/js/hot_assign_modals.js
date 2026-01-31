/* Path: Public/assets/js/hot_assign_modals.js
 * 說明: 活電工具配賦｜Modal 控制（改回共用 ui_modal.js）
 * - 全部使用 window.Modal.open / confirm / confirmChoice（符合你定版關閉規則）
 * - API 走全站 apiGet/apiPost
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

    function toast(type, title, message) {
        if (global.Toast && typeof global.Toast.show === 'function') {
            global.Toast.show({ type: type, title: title, message: message });
            return;
        }
        alert((title ? title + '\n' : '') + (message || ''));
    }

    function apiGet(url, params) {
        if (typeof global.apiGet === 'function') return global.apiGet(url, params || null);
        return Promise.resolve({ success: false, data: null, error: 'apiGet 不存在' });
    }
    function apiPost(url, body) {
        if (typeof global.apiPost === 'function') return global.apiPost(url, body || {});
        return Promise.resolve({ success: false, data: null, error: 'apiPost 不存在' });
    }

    function vehicleLabel(v) {
        v = v || {};
        var parts = [];
        if (v.vehicle_code) parts.push(String(v.vehicle_code));
        if (v.plate_no) parts.push(String(v.plate_no));
        var s = parts.join('｜');
        if (Number(v.is_active || 0) === 0) s += '（停用中）';
        return s || '-';
    }

    function countsHintText(itemId, itemsCounts) {
        itemId = Number(itemId || 0);
        var row = (itemsCounts || []).find(function (x) { return Number(x.id || 0) === itemId; });
        if (!row) return '提示：選擇分類後顯示「總數 / 已配賦 / 可配賦」';
        var total = Number(row.total_cnt || 0);
        var used = Number(row.assigned_cnt || 0);
        var free = Number(row.unassigned_cnt || (total - used));
        var label = (row.code ? row.code + '｜' : '') + (row.name || '');
        return '分類：' + label + '　總數 ' + total + '／已配賦 ' + used + '／可配賦 ' + free;
    }

    function buildItemOptions(items) {
        var opt = '<option value="">請選擇分類</option>';
        (items || []).forEach(function (it) {
            it = it || {};
            var iid = Number(it.id || 0);
            if (!iid) return;
            var label = (it.code ? it.code + '｜' : '') + (it.name || '');
            opt += '<option value="' + iid + '">' + esc(label) + '</option>';
        });
        return opt;
    }

    function buildRowLine(idx, items, mode) {
        // mode: 'veh_add' | 'assign_add' | 'assign_move'
        var opt = buildItemOptions(items);

        var meta1 = '<div class="hot-field js-meta1" style="display:none;"></div>';
        var meta2 = '<div class="hot-field js-meta2" style="display:none;"></div>';

        if (mode === 'veh_add') {
            meta1 = ''
                + '<div class="hot-field">'
                + '  <label class="form-label">檢驗日期</label>'
                + '  <input class="input js-inspect" type="date" />'
                + '</div>';
            meta2 = ''
                + '<div class="hot-field">'
                + '  <label class="form-label">備註</label>'
                + '  <input class="input js-note" type="text" placeholder="可空" />'
                + '</div>';
        }

        if (mode === 'assign_move') {
            meta1 = ''
                + '<div class="hot-field">'
                + '  <label class="form-label">來源車輛</label>'
                + '  <input class="input js-from" type="text" disabled value="-" />'
                + '</div>';
            meta2 = ''
                + '<div class="hot-field">'
                + '  <label class="form-label">狀態</label>'
                + '  <input class="input js-fromStatus" type="text" disabled value="-" />'
                + '</div>';
        }

        return ''
            + '<div class="hot-rowLine" data-row-idx="' + idx + '">'
            + '  <div class="hot-rowLine__grid">'
            + '    <div class="hot-field">'
            + '      <label class="form-label">工具分類<span class="hot-req">(必填)</span></label>'
            + '      <select class="input js-item">' + opt + '</select>'
            + '    </div>'
            + '    <div class="hot-field">'
            + '      <label class="form-label">工具編號<span class="hot-req">(必填)</span></label>'
            + '      <select class="input js-tool" disabled><option value="">請先選分類</option></select>'
            + '    </div>'
            + meta1
            + meta2
            + '  </div>'
            + '  <div class="hot-rowLine__actions">'
            + '    <button type="button" class="btn btn--ghost js-row-del">刪除列</button>'
            + '  </div>'
            + '</div>';
    }

    function fillMoveFromFields(line) {
        if (!line) return;
        var toolSel = qs('.js-tool', line);
        var from = qs('.js-from', line);
        var st = qs('.js-fromStatus', line);
        if (!toolSel || !from || !st) return;

        var op = toolSel.options && toolSel.selectedIndex >= 0 ? toolSel.options[toolSel.selectedIndex] : null;
        if (!op || !op.value) {
            from.value = '-';
            st.value = '-';
            return;
        }

        var code = op.getAttribute('data-from-code') || '-';
        var plate = op.getAttribute('data-from-plate') || '-';
        var isActive = Number(op.getAttribute('data-from-active') || 0) === 0 ? '停用' : '使用中';

        from.value = code + '｜' + plate;
        st.value = isActive;
    }

    function bindRowsBehavior(ctx) {
        // ctx: { wrapEl, mode, itemsCounts, getActiveVehicleId, onHint }
        if (!ctx || !ctx.wrapEl) return;

        ctx.wrapEl.addEventListener('click', function (e) {
            var del = e.target && e.target.closest ? e.target.closest('.js-row-del') : null;
            if (!del) return;
            var line = del.closest('.hot-rowLine');
            if (!line) return;
            line.parentNode.removeChild(line);
            if (!qsa('.hot-rowLine', ctx.wrapEl).length) {
                ctx.wrapEl.innerHTML = '<div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>';
            }
        });

        ctx.wrapEl.addEventListener('change', function (e) {
            var line = e.target && e.target.closest ? e.target.closest('.hot-rowLine') : null;
            if (!line) return;

            // item changed
            if (e.target.classList.contains('js-item')) {
                var itemId = Number(e.target.value || 0);
                var toolSel = qs('.js-tool', line);
                if (!toolSel) return;

                if (ctx.onHint) ctx.onHint(itemId);

                if (!itemId) {
                    toolSel.innerHTML = '<option value="">請先選分類</option>';
                    toolSel.disabled = true;
                    if (ctx.mode === 'assign_move') fillMoveFromFields(line);
                    return;
                }

                toolSel.disabled = true;
                toolSel.innerHTML = '<option value="">載入中…</option>';

                var params;
                if (ctx.mode === 'assign_move') {
                    var vid = ctx.getActiveVehicleId ? Number(ctx.getActiveVehicleId() || 0) : 0;
                    params = { action: 'transfer_tools', vehicle_id: vid, item_id: itemId };
                } else {
                    params = { action: 'unassigned_tools', item_id: itemId };
                }

                apiGet('/api/hot/assign', params).then(function (j) {
                    if (!j || !j.success) {
                        toolSel.innerHTML = '<option value="">載入失敗</option>';
                        toolSel.disabled = true;
                        return;
                    }

                    var tools = (j.data && j.data.tools) ? j.data.tools : [];
                    var opt = '<option value="">請選擇工具</option>';

                    tools.forEach(function (t) {
                        t = t || {};
                        var tid = Number(t.id || 0);
                        if (!tid) return;

                        var text = t.tool_no || '';
                        if (ctx.mode === 'assign_move' && (t.vehicle_code || t.plate_no)) {
                            text += '（' + (t.vehicle_code || '-') + '｜' + (t.plate_no || '-') + '）';
                        }

                        opt += '<option value="' + tid + '"'
                            + ' data-from-code="' + esc(t.vehicle_code || '') + '"'
                            + ' data-from-plate="' + esc(t.plate_no || '') + '"'
                            + ' data-from-active="' + esc(String(t.is_active || 0)) + '"'
                            + '>' + esc(text) + '</option>';
                    });

                    toolSel.innerHTML = opt;
                    toolSel.disabled = false;

                    if (ctx.mode === 'assign_move') fillMoveFromFields(line);
                });
            }

            // tool changed (move mode)
            if (e.target.classList.contains('js-tool')) {
                if (ctx.mode === 'assign_move') fillMoveFromFields(line);
            }
        });
    }

    var Mod = {
        app: null,
        state: {
            itemsCounts: [],
            availableVehicles: []
        },

        init: function (app) {
            this.app = app || null;
        },

        /* ========== 車輛新增（必須至少一筆工具） ========== */
        openVehAdd: function () {
            var self = this;
            if (!global.Modal || typeof global.Modal.open !== 'function') {
                toast('danger', '系統錯誤', 'Modal 不存在（ui_modal.js 未載入）');
                return;
            }

            // 先開（內容之後填）
            var bd = global.Modal.open({
                title: '新增車輛配賦',
                html: ''
                    + '<div class="hot-form">'
                    + '  <div class="hot-field">'
                    + '    <label class="form-label">車輛<span class="hot-req">(必填)</span></label>'
                    + '    <select class="input" id="mVehPick"><option value="">載入中…</option></select>'
                    + '    <div class="hot-helpText2">停用車可選，將顯示「停用中」註記。</div>'
                    + '  </div>'
                    + '  <div class="hot-assignGrid">'
                    + '    <div class="hot-assignGrid__head">'
                    + '      <div class="hot-assignGrid__title">工具明細（至少 1 列）</div>'
                    + '      <button class="btn btn--secondary" type="button" id="btnAddRow">新增一列</button>'
                    + '    </div>'
                    + '    <div class="hot-rows" id="mVehRows">'
                    + '      <div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>'
                    + '    </div>'
                    + '    <div class="hot-dynHint" id="mVehDynHint">'
                    + '      <span class="hot-dot hot-dot--info"></span>'
                    + '      <span id="mVehDynHintText">提示：選擇分類後顯示「總數 / 已配賦 / 可配賦」</span>'
                    + '    </div>'
                    + '  </div>'
                    + '</div>',
                confirmText: '儲存',
                cancelText: '取消',
                allowCloseBtn: true,
                closeOnBackdrop: true,
                closeOnEsc: true,
                onConfirm: function () {
                    var pick = qs('#mVehPick', bd);
                    var rowsHost = qs('#mVehRows', bd);
                    if (!pick || !rowsHost) return false;

                    var vehicleId = Number(pick.value || 0);
                    if (!vehicleId) { toast('warning', '資料不足', '請先選擇車輛'); return false; }

                    var lines = qsa('.hot-rowLine', rowsHost).filter(function (x) { return !x.classList.contains('hot-rowLine--empty'); });
                    if (!lines.length) { toast('warning', '資料不足', '至少需新增 1 列工具'); return false; }

                    var rows = [];
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        var itemSel = qs('.js-item', line);
                        var toolSel = qs('.js-tool', line);
                        var inspect = qs('.js-inspect', line);
                        var note = qs('.js-note', line);

                        var itemId = itemSel ? Number(itemSel.value || 0) : 0;
                        var toolId = toolSel ? Number(toolSel.value || 0) : 0;

                        if (!itemId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具分類'); return false; }
                        if (!toolId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具編號'); return false; }

                        rows.push({
                            tool_id: toolId,
                            inspect_date: (inspect && inspect.value) ? String(inspect.value) : '',
                            note: (note && note.value) ? String(note.value).trim() : ''
                        });
                    }

                    return apiPost('/api/hot/assign', { action: 'vehicle_add', vehicle_id: vehicleId, rows: rows })
                        .then(function (j) {
                            if (!j || !j.success) { toast('danger', '儲存失敗', (j && j.error) ? j.error : '未知錯誤'); return false; }
                            toast('success', '已儲存', '新增車輛配賦完成');
                            if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(vehicleId);
                            return true; // ✅ 讓 Modal 自動 close
                        });
                }
            });

            // 載入資料
            Promise.all([
                apiGet('/api/hot/assign', { action: 'available_vehicles' }),
                apiGet('/api/hot/assign', { action: 'items_counts' })
            ]).then(function (arr) {
                var jV = arr[0] || {};
                var jI = arr[1] || {};

                if (!jV.success) { toast('danger', '載入失敗', jV.error || 'available_vehicles'); return; }
                if (!jI.success) { toast('danger', '載入失敗', jI.error || 'items_counts'); return; }

                self.state.availableVehicles = (jV.data && jV.data.vehicles) ? jV.data.vehicles : [];
                self.state.itemsCounts = (jI.data && jI.data.items) ? jI.data.items : [];

                var pick = qs('#mVehPick', bd);
                if (pick) {
                    var html = '<option value="">請選擇車輛</option>';
                    self.state.availableVehicles.forEach(function (v) {
                        var id = Number(v.id || 0);
                        if (!id) return;
                        html += '<option value="' + id + '">' + esc(vehicleLabel(v)) + '</option>';
                    });
                    pick.innerHTML = html;
                }

                var rowsHost = qs('#mVehRows', bd);
                var hintText = qs('#mVehDynHintText', bd);

                bindRowsBehavior({
                    wrapEl: rowsHost,
                    mode: 'veh_add',
                    itemsCounts: self.state.itemsCounts,
                    getActiveVehicleId: function () { return 0; },
                    onHint: function (itemId) {
                        if (hintText) hintText.textContent = countsHintText(itemId, self.state.itemsCounts);
                    }
                });

                // 新增一列
                var btnAddRow = qs('#btnAddRow', bd);
                if (btnAddRow) {
                    btnAddRow.addEventListener('click', function () {
                        if (!rowsHost) return;
                        var empty = qs('.hot-rowLine--empty', rowsHost);
                        if (empty) empty.parentNode.removeChild(empty);
                        var idx = qsa('.hot-rowLine', rowsHost).length + 1;
                        rowsHost.insertAdjacentHTML('beforeend', buildRowLine(idx, self.state.itemsCounts, 'veh_add'));
                    });
                }

                // 預設先塞一列
                if (rowsHost) {
                    var empty = qs('.hot-rowLine--empty', rowsHost);
                    if (empty) empty.parentNode.removeChild(empty);
                    rowsHost.insertAdjacentHTML('beforeend', buildRowLine(1, self.state.itemsCounts, 'veh_add'));
                }
            });
        },

        /* ========== 左表解除全部配賦（二次確認：要能取消） ========== */
        openVehDelete: function (vehicleId) {
            var self = this;
            if (!global.Modal || typeof global.Modal.confirmChoice !== 'function') {
                toast('danger', '系統錯誤', 'Modal.confirmChoice 不存在（ui_modal.js 未載入或版本不符）');
                return;
            }

            vehicleId = Number(vehicleId || 0);
            if (!vehicleId) { toast('warning', '尚未選取車輛', '請先選取左側車輛'); return; }

            // 車輛標籤（左表資料）
            var meta = '-';
            if (self.app && self.app.state && Array.isArray(self.app.state.vehicles)) {
                var v = self.app.state.vehicles.find(function (x) { return Number(x.id || 0) === vehicleId; });
                if (v) meta = vehicleLabel(v);
            }

            // 先抓該車目前已配賦工具（完整清單）
            apiGet('/api/hot/assign', { action: 'tools', vehicle_id: vehicleId }).then(function (j) {
                var rows = (j && j.success && j.data && Array.isArray(j.data.tools)) ? j.data.tools : [];
                var cnt = rows.length;

                // ---- 組「工具摘要」：依 item_id 分組，顯示：代碼 名稱(數量)｜編號清單 ----
                function buildSummary(list) {
                    if (!list || !list.length) return '（無工具）';

                    var map = {}; // {item_id: {code,name, toolNos:[]}}
                    list.forEach(function (r) {
                        r = r || {};
                        var iid = Number(r.item_id || 0) || 0;
                        if (!map[iid]) {
                            map[iid] = {
                                code: (r.item_code || ''),
                                name: (r.item_name || ''),
                                toolNos: []
                            };
                        }
                        if (r.tool_no) map[iid].toolNos.push(String(r.tool_no));
                    });

                    // 依 code 排序（沒有 code 的放後面）
                    var groups = Object.keys(map).map(function (k) { return map[k]; });
                    groups.sort(function (a, b) {
                        var ac = String(a.code || '');
                        var bc = String(b.code || '');
                        if (ac === bc) return String(a.name || '').localeCompare(String(b.name || ''));
                        if (!ac) return 1;
                        if (!bc) return -1;
                        return ac.localeCompare(bc);
                    });

                    // 編號很多：每 10 個換行一次，避免一行太長
                    function joinToolNos(arr) {
                        arr = arr || [];
                        var out = [];
                        for (var i = 0; i < arr.length; i += 10) {
                            out.push(arr.slice(i, i + 10).join('，'));
                        }
                        return out.join('\n    ');
                    }

                    var lines = [];
                    groups.forEach(function (g) {
                        var head = (g.code ? (g.code + ' ') : '') + (g.name || '');
                        var n = (g.toolNos || []).length;
                        lines.push(
                            head + '(' + n + ')｜' + joinToolNos(g.toolNos || [])
                        );
                    });

                    return lines.join('\n');
                }

                var summaryText = buildSummary(rows);

                // ---- Modal 文案（不顯示 SQL）----
                var msg = ''
                    + '車輛：' + meta + '\n'
                    + '將解除件數：' + String(cnt) + '\n'
                    + '工具摘要：\n'
                    + summaryText + '\n\n'
                    + '確認後以上工具將從「' + meta + '」解除所有配賦活電工具';

                global.Modal.confirmChoice(
                    '解除該車全部配賦確認',
                    msg,
                    function () {
                        return apiPost('/api/hot/assign', { action: 'vehicle_unassign_all', vehicle_id: vehicleId })
                            .then(function (r) {
                                if (!r || !r.success) {
                                    toast('danger', '解除失敗', (r && r.error) ? r.error : '未知錯誤');
                                    return false;
                                }

                                toast('success', '已解除', '該車全部配賦已解除');

                                // ✅ 4) 確認後退出編輯模式
                                if (self.app && self.app.state) self.app.state.leftEditMode = false;

                                // reload + 讓左表按鈕回到 VIEW 狀態
                                if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(0);
                                if (self.app && typeof self.app.syncLeftMode === 'function') self.app.syncLeftMode();

                                return true; // 讓 Modal 自動 close
                            });
                    },
                    function () { /* 取消：不做事 */ },
                    { confirmText: '確認解除', cancelText: '取消' }
                );
            });
        },

        /* ========== 右表新增配賦（加入未配賦） ========== */
        openAssignAdd: function () {
            var self = this;
            if (!self.app || !self.app.state || !self.app.state.activeVehicleId) {
                toast('warning', '尚未選取車輛', '請先選取左側車輛');
                return;
            }
            if (!global.Modal || typeof global.Modal.open !== 'function') {
                toast('danger', '系統錯誤', 'Modal 不存在（ui_modal.js 未載入）');
                return;
            }

            var vehicleId = Number(self.app.state.activeVehicleId || 0);
            var vehLabel = self.app.getActiveVehicleLabel ? self.app.getActiveVehicleLabel() : '-';

            var bd = global.Modal.open({
                title: '新增配賦（加入未配賦工具）',
                html: ''
                    + '<div class="hot-form">'
                    + '  <div class="hot-helpText2">目前車輛：<b>' + esc(vehLabel) + '</b>（只能加入「未配賦」工具）</div>'
                    + '  <div class="hot-assignGrid">'
                    + '    <div class="hot-assignGrid__head">'
                    + '      <div class="hot-assignGrid__title">工具明細（至少 1 列）</div>'
                    + '      <button class="btn btn--secondary" type="button" id="btnAssignAddRow">新增一列</button>'
                    + '    </div>'
                    + '    <div class="hot-rows" id="mAssignAddRows">'
                    + '      <div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>'
                    + '    </div>'
                    + '    <div class="hot-dynHint"><span class="hot-dot hot-dot--info"></span>提示：選擇分類後顯示可選工具</div>'
                    + '  </div>'
                    + '</div>',
                confirmText: '儲存',
                cancelText: '取消',
                allowCloseBtn: true,
                closeOnBackdrop: true,
                closeOnEsc: true,
                onConfirm: function () {
                    var rowsHost = qs('#mAssignAddRows', bd);
                    if (!rowsHost) return false;

                    var lines = qsa('.hot-rowLine', rowsHost).filter(function (x) { return !x.classList.contains('hot-rowLine--empty'); });
                    if (!lines.length) { toast('warning', '資料不足', '至少需新增 1 列工具'); return false; }

                    var toolIds = [];
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        var itemSel = qs('.js-item', line);
                        var toolSel = qs('.js-tool', line);
                        var itemId = itemSel ? Number(itemSel.value || 0) : 0;
                        var toolId = toolSel ? Number(toolSel.value || 0) : 0;

                        if (!itemId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具分類'); return false; }
                        if (!toolId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具編號'); return false; }
                        toolIds.push(toolId);
                    }

                    return apiPost('/api/hot/assign', { action: 'assign_more', vehicle_id: vehicleId, tool_ids: toolIds })
                        .then(function (r) {
                            if (!r || !r.success) { toast('danger', '儲存失敗', (r && r.error) ? r.error : '未知錯誤'); return false; }
                            toast('success', '已儲存', '新增配賦完成');
                            if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(vehicleId);
                            return true;
                        });
                }
            });

            apiGet('/api/hot/assign', { action: 'items_counts' }).then(function (j) {
                if (!j || !j.success) { toast('danger', '載入失敗', (j && j.error) ? j.error : 'items_counts'); return; }
                self.state.itemsCounts = (j.data && j.data.items) ? j.data.items : [];

                var rowsHost = qs('#mAssignAddRows', bd);
                bindRowsBehavior({
                    wrapEl: rowsHost,
                    mode: 'assign_add',
                    itemsCounts: self.state.itemsCounts,
                    getActiveVehicleId: function () { return vehicleId; }
                });

                var btn = qs('#btnAssignAddRow', bd);
                if (btn) {
                    btn.addEventListener('click', function () {
                        if (!rowsHost) return;
                        var empty = qs('.hot-rowLine--empty', rowsHost);
                        if (empty) empty.parentNode.removeChild(empty);
                        var idx = qsa('.hot-rowLine', rowsHost).length + 1;
                        rowsHost.insertAdjacentHTML('beforeend', buildRowLine(idx, self.state.itemsCounts, 'assign_add'));
                    });
                }

                if (rowsHost) {
                    var empty = qs('.hot-rowLine--empty', rowsHost);
                    if (empty) empty.parentNode.removeChild(empty);
                    rowsHost.insertAdjacentHTML('beforeend', buildRowLine(1, self.state.itemsCounts, 'assign_add'));
                }
            });
        },

        /* ========== 右表移轉進來（從其他車） ========== */
        openAssignMove: function () {
            var self = this;
            if (!self.app || !self.app.state || !self.app.state.activeVehicleId) {
                toast('warning', '尚未選取車輛', '請先選取左側車輛');
                return;
            }
            if (!global.Modal || typeof global.Modal.open !== 'function') {
                toast('danger', '系統錯誤', 'Modal 不存在（ui_modal.js 未載入）');
                return;
            }

            var vehicleId = Number(self.app.state.activeVehicleId || 0);
            var vehLabel = self.app.getActiveVehicleLabel ? self.app.getActiveVehicleLabel() : '-';

            var bd = global.Modal.open({
                title: '移轉進來（從其他車改配到本車）',
                html: ''
                    + '<div class="hot-form">'
                    + '  <div class="hot-helpText2">目前車輛：<b>' + esc(vehLabel) + '</b>（可移轉「其他車」已配賦工具）</div>'
                    + '  <div class="hot-assignGrid">'
                    + '    <div class="hot-assignGrid__head">'
                    + '      <div class="hot-assignGrid__title">工具明細（至少 1 列）</div>'
                    + '      <button class="btn btn--secondary" type="button" id="btnAssignMoveRow">新增一列</button>'
                    + '    </div>'
                    + '    <div class="hot-rows" id="mAssignMoveRows">'
                    + '      <div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>'
                    + '    </div>'
                    + '    <div class="hot-dynHint"><span class="hot-dot hot-dot--warn"></span>提示：清單只列出「非本車」且「已配賦」工具</div>'
                    + '  </div>'
                    + '</div>',
                confirmText: '確認移轉',
                cancelText: '取消',
                allowCloseBtn: true,
                closeOnBackdrop: true,
                closeOnEsc: true,
                onConfirm: function () {
                    var rowsHost = qs('#mAssignMoveRows', bd);
                    if (!rowsHost) return false;

                    var lines = qsa('.hot-rowLine', rowsHost).filter(function (x) { return !x.classList.contains('hot-rowLine--empty'); });
                    if (!lines.length) { toast('warning', '資料不足', '至少需新增 1 列工具'); return false; }

                    var toolIds = [];
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        var itemSel = qs('.js-item', line);
                        var toolSel = qs('.js-tool', line);
                        var itemId = itemSel ? Number(itemSel.value || 0) : 0;
                        var toolId = toolSel ? Number(toolSel.value || 0) : 0;

                        if (!itemId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具分類'); return false; }
                        if (!toolId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具編號'); return false; }
                        toolIds.push(toolId);
                    }

                    return apiPost('/api/hot/assign', { action: 'transfer', vehicle_id: vehicleId, tool_ids: toolIds })
                        .then(function (r) {
                            if (!r || !r.success) { toast('danger', '移轉失敗', (r && r.error) ? r.error : '未知錯誤'); return false; }
                            toast('success', '已移轉', '移轉進來完成');
                            if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(vehicleId);
                            return true;
                        });
                }
            });

            apiGet('/api/hot/assign', { action: 'items_counts' }).then(function (j) {
                if (!j || !j.success) { toast('danger', '載入失敗', (j && j.error) ? j.error : 'items_counts'); return; }
                self.state.itemsCounts = (j.data && j.data.items) ? j.data.items : [];

                var rowsHost = qs('#mAssignMoveRows', bd);
                bindRowsBehavior({
                    wrapEl: rowsHost,
                    mode: 'assign_move',
                    itemsCounts: self.state.itemsCounts,
                    getActiveVehicleId: function () { return vehicleId; }
                });

                var btn = qs('#btnAssignMoveRow', bd);
                if (btn) {
                    btn.addEventListener('click', function () {
                        if (!rowsHost) return;
                        var empty = qs('.hot-rowLine--empty', rowsHost);
                        if (empty) empty.parentNode.removeChild(empty);
                        var idx = qsa('.hot-rowLine', rowsHost).length + 1;
                        rowsHost.insertAdjacentHTML('beforeend', buildRowLine(idx, self.state.itemsCounts, 'assign_move'));
                    });
                }

                if (rowsHost) {
                    var empty = qs('.hot-rowLine--empty', rowsHost);
                    if (empty) empty.parentNode.removeChild(empty);
                    rowsHost.insertAdjacentHTML('beforeend', buildRowLine(1, self.state.itemsCounts, 'assign_move'));
                }
            });
        },

        /* ========== 解除單筆（confirmChoice：可取消，可 ESC/背景/X） ========== */
        openToolUnassign: function (toolId, meta) {
            var self = this;
            if (!global.Modal || typeof global.Modal.confirmChoice !== 'function') {
                toast('danger', '系統錯誤', 'Modal 不存在（ui_modal.js 未載入）');
                return;
            }

            toolId = Number(toolId || 0);
            if (!toolId) return;

            global.Modal.confirmChoice(
                '解除歸屬確認',
                '工具：' + (meta || '-') + '\n\n確認後將執行：UPDATE hot_tools SET vehicle_id = NULL WHERE id = ?',
                function () {
                    return apiPost('/api/hot/assign', { action: 'tool_unassign', tool_ids: [toolId] })
                        .then(function (r) {
                            if (!r || !r.success) { toast('danger', '解除失敗', (r && r.error) ? r.error : '未知錯誤'); return false; }
                            toast('success', '已解除', '工具歸屬已解除');
                            if (self.app && typeof self.app.loadAll === 'function') {
                                self.app.loadAll(Number(self.app.state.activeVehicleId || 0));
                            }
                            return true;
                        });
                },
                function () { /* cancel */ },
                { confirmText: '確認解除', cancelText: '取消' }
            );
        }
    };

    global.HotAssignModals = Mod;

})(window);
