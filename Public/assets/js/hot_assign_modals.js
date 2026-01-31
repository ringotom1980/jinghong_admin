/* Path: Public/assets/js/hot_assign_modals.js
 * 說明: 活電工具配賦｜Modal 控制（A 路線：table/DOM 為真相）
 * - modals:
 *   (1) modalVehAdd      新增車輛配賦（至少 1 工具）
 *   (2) modalVehDelete   解除該車全部配賦（二次確認）
 *   (3) modalAssignAdd   新增配賦（加入未配賦）
 *   (4) modalAssignMove  移轉進來（從其他車移轉）
 *   (5) modalToolUnassign 解除單筆
 *
 * - API:
 *   GET : action=available_vehicles / items_counts / unassigned_tools / tools / transfer_tools
 *   POST: action=vehicle_add / vehicle_unassign_all / assign_more / transfer / tool_unassign
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
        var anyOpen = qsa('.modal-backdrop').some(function (x) { return !x.hidden; });
        if (!anyOpen) document.body.classList.remove('modal-open');
    }

    function bindCloseButtonsOnce() {
        if (bindCloseButtonsOnce._done) return;
        bindCloseButtonsOnce._done = true;

        document.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest ? e.target.closest('[data-close-modal]') : null;
            if (!btn) return;
            var mid = btn.getAttribute('data-close-modal');
            if (mid) closeModal(mid);
        });

        document.addEventListener('click', function (e) {
            var bd = e.target && e.target.classList && e.target.classList.contains('modal-backdrop') ? e.target : null;
            if (!bd) return;
            if (bd.getAttribute('id')) closeModal(bd.getAttribute('id'));
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            var opens = qsa('.modal-backdrop').filter(function (x) { return !x.hidden; });
            if (!opens.length) return;
            closeModal(opens[opens.length - 1].getAttribute('id'));
        });
    }

    function vehicleLabel(v) {
        var parts = [];
        if (v.vehicle_code) parts.push(String(v.vehicle_code));
        if (v.plate_no) parts.push(String(v.plate_no));
        var s = parts.join('｜');
        if (Number(v.is_active || 0) === 0) s += '（停用中）';
        return s || '-';
    }

    function ensureRowsNotEmpty(host) {
        if (!host) return;
        var lines = qsa('.hot-rowLine', host).filter(function (x) { return !x.classList.contains('hot-rowLine--empty'); });
        if (lines.length) return;
        host.innerHTML = '<div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>';
    }

    function buildRowLine(idx, items) {
        var opt = '<option value="">請選擇分類</option>';
        (items || []).forEach(function (it) {
            it = it || {};
            var iid = Number(it.id || 0);
            if (!iid) return;
            var label = (it.code ? it.code + '｜' : '') + (it.name || '');
            opt += '<option value="' + iid + '">' + esc(label) + '</option>';
        });

        return ''
            + '<div class="hot-rowLine" data-row-idx="' + idx + '">'
            + '  <div class="hot-rowLine__grid">'
            + '    <div class="hot-field">'
            + '      <label class="form-label">工具分類<span class="hot-req">*</span></label>'
            + '      <select class="input js-item">' + opt + '</select>'
            + '    </div>'
            + '    <div class="hot-field">'
            + '      <label class="form-label">工具編號<span class="hot-req">*</span></label>'
            + '      <select class="input js-tool" disabled><option value="">請先選分類</option></select>'
            + '    </div>'
            + '    <div class="hot-field js-meta1" style="display:none;"></div>'
            + '    <div class="hot-field js-meta2" style="display:none;"></div>'
            + '  </div>'
            + '  <div class="hot-rowLine__actions">'
            + '    <button type="button" class="btn btn--ghost js-row-del">刪除列</button>'
            + '  </div>'
            + '</div>';
    }

    // 專用：新增車（有檢驗日/備註）
    function buildVehAddRowLine(idx, items) {
        var base = buildRowLine(idx, items);
        // 把 meta1/meta2 換成檢驗日/備註欄（保持你原本 UI）
        return base
            .replace('<div class="hot-field js-meta1" style="display:none;"></div>', ''
                + '<div class="hot-field">'
                + '  <label class="form-label">檢驗日期</label>'
                + '  <input class="input js-inspect" type="date" />'
                + '</div>')
            .replace('<div class="hot-field js-meta2" style="display:none;"></div>', ''
                + '<div class="hot-field">'
                + '  <label class="form-label">備註</label>'
                + '  <input class="input js-note" type="text" placeholder="可空" />'
                + '</div>');
    }

    // 專用：移轉列（顯示來源車輛）
    function buildMoveRowLine(idx, items) {
        var base = buildRowLine(idx, items);
        return base
            .replace('<div class="hot-field js-meta1" style="display:none;"></div>', ''
                + '<div class="hot-field">'
                + '  <label class="form-label">來源車輛</label>'
                + '  <input class="input js-from" type="text" disabled value="-" />'
                + '</div>')
            .replace('<div class="hot-field js-meta2" style="display:none;"></div>', ''
                + '<div class="hot-field">'
                + '  <label class="form-label">狀態</label>'
                + '  <input class="input js-fromStatus" type="text" disabled value="-" />'
                + '</div>');
    }

    var Mod = {
        app: null,

        // cache DOM
        els: {
            // veh add
            mVehPick: null,
            mVehRows: null,
            btnAddRow: null,
            btnVehAddSubmit: null,
            mVehDynHintText: null,

            // veh delete
            mVehDelMeta: null,
            mVehDelCount: null,
            mVehDelTools: null,
            btnVehDeleteSubmit: null,

            // assign add
            mAssignAddVehLabel: null,
            mAssignAddRows: null,
            btnAssignAddRow: null,
            btnAssignAddSubmit: null,

            // assign move
            mAssignMoveVehLabel: null,
            mAssignMoveRows: null,
            btnAssignMoveRow: null,
            btnAssignMoveSubmit: null,

            // tool unassign
            mToolUnMeta: null,
            btnToolUnSubmit: null
        },

        state: {
            itemsCounts: [],
            availableVehicles: [],

            // for submits
            pendingDeleteVehicleId: 0,
            pendingToolUnassignId: 0,
            pendingToolUnassignMeta: ''
        },

        init: function (app) {
            this.app = app || null;
            bindCloseButtonsOnce();

            // veh add
            this.els.mVehPick = qs('#mVehPick');
            this.els.mVehRows = qs('#mVehRows');
            this.els.btnAddRow = qs('#btnAddRow');
            this.els.btnVehAddSubmit = qs('#btnVehAddSubmit');
            this.els.mVehDynHintText = qs('#mVehDynHintText');

            // veh delete
            this.els.mVehDelMeta = qs('#mVehDelMeta');
            this.els.mVehDelCount = qs('#mVehDelCount');
            this.els.mVehDelTools = qs('#mVehDelTools');
            this.els.btnVehDeleteSubmit = qs('#btnVehDeleteSubmit');

            // assign add
            this.els.mAssignAddVehLabel = qs('#mAssignAddVehLabel');
            this.els.mAssignAddRows = qs('#mAssignAddRows');
            this.els.btnAssignAddRow = qs('#btnAssignAddRow');
            this.els.btnAssignAddSubmit = qs('#btnAssignAddSubmit');

            // assign move
            this.els.mAssignMoveVehLabel = qs('#mAssignMoveVehLabel');
            this.els.mAssignMoveRows = qs('#mAssignMoveRows');
            this.els.btnAssignMoveRow = qs('#btnAssignMoveRow');
            this.els.btnAssignMoveSubmit = qs('#btnAssignMoveSubmit');

            // tool unassign
            this.els.mToolUnMeta = qs('#mToolUnMeta');
            this.els.btnToolUnSubmit = qs('#btnToolUnSubmit');

            var self = this;

            // common row delete (delegate) for all row containers
            function bindRowContainer(container) {
                if (!container) return;
                container.addEventListener('click', function (e) {
                    var del = e.target && e.target.closest ? e.target.closest('.js-row-del') : null;
                    if (!del) return;
                    var line = del.closest('.hot-rowLine');
                    if (!line) return;
                    line.parentNode.removeChild(line);
                    ensureRowsNotEmpty(container);
                });

                container.addEventListener('change', function (e) {
                    var line = e.target && e.target.closest ? e.target.closest('.hot-rowLine') : null;
                    if (!line) return;

                    if (e.target.classList.contains('js-item')) {
                        var itemId = Number(e.target.value || 0);
                        self.onItemChanged(container, line, itemId);
                    }
                    if (e.target.classList.contains('js-tool')) {
                        // 移轉模式要回填來源資訊
                        if (container === self.els.mAssignMoveRows) self.fillMoveFromFields(line);
                    }
                });
            }

            bindRowContainer(this.els.mVehRows);
            bindRowContainer(this.els.mAssignAddRows);
            bindRowContainer(this.els.mAssignMoveRows);

            if (this.els.btnAddRow) {
                this.els.btnAddRow.addEventListener('click', function () {
                    self.addVehAddRow();
                });
            }
            if (this.els.btnVehAddSubmit) {
                this.els.btnVehAddSubmit.addEventListener('click', function () {
                    self.submitVehicleAdd();
                });
            }
            if (this.els.btnVehDeleteSubmit) {
                this.els.btnVehDeleteSubmit.addEventListener('click', function () {
                    self.submitVehicleDelete();
                });
            }

            if (this.els.btnAssignAddRow) {
                this.els.btnAssignAddRow.addEventListener('click', function () {
                    self.addAssignAddRow();
                });
            }
            if (this.els.btnAssignAddSubmit) {
                this.els.btnAssignAddSubmit.addEventListener('click', function () {
                    self.submitAssignAdd();
                });
            }

            if (this.els.btnAssignMoveRow) {
                this.els.btnAssignMoveRow.addEventListener('click', function () {
                    self.addAssignMoveRow();
                });
            }
            if (this.els.btnAssignMoveSubmit) {
                this.els.btnAssignMoveSubmit.addEventListener('click', function () {
                    self.submitAssignMove();
                });
            }

            if (this.els.btnToolUnSubmit) {
                this.els.btnToolUnSubmit.addEventListener('click', function () {
                    self.submitToolUnassign();
                });
            }
        },

        /* ========== open ========== */
        openVehAdd: function () {
            var self = this;

            // reset
            if (this.els.mVehPick) this.els.mVehPick.innerHTML = '<option value="">請選擇車輛</option>';
            if (this.els.mVehRows) this.els.mVehRows.innerHTML = '<div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>';

            // ✅ 先開視窗（不等 API）
            openModal('modalVehAdd');

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

                if (self.els.mVehPick) {
                    var html = '<option value="">請選擇車輛</option>';
                    self.state.availableVehicles.forEach(function (v) {
                        var id = Number(v.id || 0);
                        if (!id) return;
                        html += '<option value="' + id + '">' + esc(vehicleLabel(v)) + '</option>';
                    });
                    self.els.mVehPick.innerHTML = html;
                }

                self.addVehAddRow();
            });
        },

        openVehDelete: function (vehicleId) {
            var self = this;
            vehicleId = Number(vehicleId || 0);
            if (!vehicleId) { toast('warning', '尚未選取車輛', '請先選取左側車輛'); return; }

            self.state.pendingDeleteVehicleId = vehicleId;

            // meta from app state
            var meta = '-';
            var cnt = '-';
            if (self.app && self.app.state && Array.isArray(self.app.state.vehicles)) {
                var v = self.app.state.vehicles.find(function (x) { return Number(x.id || 0) === vehicleId; });
                if (v) {
                    meta = vehicleLabel(v);
                    cnt = String(v.assigned_cnt || 0);
                }
            }
            if (self.els.mVehDelMeta) self.els.mVehDelMeta.textContent = meta;
            if (self.els.mVehDelCount) self.els.mVehDelCount.textContent = cnt;
            if (self.els.mVehDelTools) self.els.mVehDelTools.textContent = '載入中…';

            apiGet('/api/hot/assign', { action: 'tools', vehicle_id: vehicleId })
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
                        var parts = [];
                        for (var i = 0; i < rows.length && i < 10; i++) {
                            var r = rows[i] || {};
                            parts.push((r.item_code ? r.item_code + '｜' : '') + (r.tool_no || ''));
                        }
                        var more = rows.length > 10 ? ' …(共 ' + rows.length + ' 筆)' : '';
                        if (self.els.mVehDelTools) self.els.mVehDelTools.textContent = parts.join('，') + more;
                    }
                    openModal('modalVehDelete');
                });
        },

        openAssignAdd: function () {
            if (!this.app || !this.app.state || !this.app.state.activeVehicleId) {
                toast('warning', '尚未選取車輛', '請先選取左側車輛');
                return;
            }

            var self = this;
            if (this.els.mAssignAddRows) this.els.mAssignAddRows.innerHTML = '<div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>';
            if (self.els.mAssignAddVehLabel) self.els.mAssignAddVehLabel.textContent = self.app.getActiveVehicleLabel();

            // ✅ 先開視窗
            openModal('modalAssignAdd');

            apiGet('/api/hot/assign', { action: 'items_counts' }).then(function (j) {
                if (!j || !j.success) { toast('danger', '載入失敗', (j && j.error) ? j.error : 'items_counts'); return; }
                self.state.itemsCounts = (j.data && j.data.items) ? j.data.items : [];
                self.addAssignAddRow();
            });
        },

        openAssignMove: function () {
            if (!this.app || !this.app.state || !this.app.state.activeVehicleId) {
                toast('warning', '尚未選取車輛', '請先選取左側車輛');
                return;
            }

            var self = this;
            if (this.els.mAssignMoveRows) this.els.mAssignMoveRows.innerHTML = '<div class="hot-rowLine hot-rowLine--empty">尚未加入工具列</div>';
            if (self.els.mAssignMoveVehLabel) self.els.mAssignMoveVehLabel.textContent = self.app.getActiveVehicleLabel();

            // ✅ 先開視窗
            openModal('modalAssignMove');

            apiGet('/api/hot/assign', { action: 'items_counts' }).then(function (j) {
                if (!j || !j.success) { toast('danger', '載入失敗', (j && j.error) ? j.error : 'items_counts'); return; }
                self.state.itemsCounts = (j.data && j.data.items) ? j.data.items : [];
                self.addAssignMoveRow();
            });
        },

        openToolUnassign: function (toolId, meta) {
            this.state.pendingToolUnassignId = Number(toolId || 0);
            this.state.pendingToolUnassignMeta = meta || '';
            if (this.els.mToolUnMeta) this.els.mToolUnMeta.textContent = this.state.pendingToolUnassignMeta || '-';
            openModal('modalToolUnassign');
        },

        /* ========== rows add ========== */

        addVehAddRow: function () {
            if (!this.els.mVehRows) return;
            var empty = qs('.hot-rowLine--empty', this.els.mVehRows);
            if (empty) empty.parentNode.removeChild(empty);

            var idx = qsa('.hot-rowLine', this.els.mVehRows).length + 1;
            this.els.mVehRows.insertAdjacentHTML('beforeend', buildVehAddRowLine(idx, this.state.itemsCounts || []));
        },

        addAssignAddRow: function () {
            if (!this.els.mAssignAddRows) return;
            var empty = qs('.hot-rowLine--empty', this.els.mAssignAddRows);
            if (empty) empty.parentNode.removeChild(empty);

            var idx = qsa('.hot-rowLine', this.els.mAssignAddRows).length + 1;
            this.els.mAssignAddRows.insertAdjacentHTML('beforeend', buildRowLine(idx, this.state.itemsCounts || []));
        },

        addAssignMoveRow: function () {
            if (!this.els.mAssignMoveRows) return;
            var empty = qs('.hot-rowLine--empty', this.els.mAssignMoveRows);
            if (empty) empty.parentNode.removeChild(empty);

            var idx = qsa('.hot-rowLine', this.els.mAssignMoveRows).length + 1;
            this.els.mAssignMoveRows.insertAdjacentHTML('beforeend', buildMoveRowLine(idx, this.state.itemsCounts || []));
        },

        onItemChanged: function (container, line, itemId) {
            itemId = Number(itemId || 0);
            var toolSel = qs('.js-tool', line);
            if (!toolSel) return;

            if (!itemId) {
                toolSel.innerHTML = '<option value="">請先選分類</option>';
                toolSel.disabled = true;
                if (container === this.els.mAssignMoveRows) this.fillMoveFromFields(line);
                return;
            }

            toolSel.disabled = true;
            toolSel.innerHTML = '<option value="">載入中…</option>';

            // 決定清單來源（統一走 params，避免手工拼 query）
            var url = '/api/hot/assign';
            var params = null;

            if (container === this.els.mAssignMoveRows) {
                var vid = this.app ? Number(this.app.state.activeVehicleId || 0) : 0;
                params = { action: 'transfer_tools', vehicle_id: vid, item_id: itemId };
            } else {
                params = { action: 'unassigned_tools', item_id: itemId };
            }

            apiGet(url, params).then(function (j) {

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
                    // 移轉：加上來源車輛資訊（選單文字）
                    if (t.vehicle_code || t.plate_no) {
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

                if (container === Mod.els.mAssignMoveRows) Mod.fillMoveFromFields(line);
            });
        },

        fillMoveFromFields: function (line) {
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
        },

        /* ========== submits ========== */

        submitVehicleAdd: function () {
            var self = this;
            if (!self.els.mVehPick || !self.els.mVehRows) return;

            var vehicleId = Number(self.els.mVehPick.value || 0);
            if (!vehicleId) { toast('warning', '資料不足', '請先選擇車輛'); return; }

            var lines = qsa('.hot-rowLine', self.els.mVehRows).filter(function (x) {
                return !x.classList.contains('hot-rowLine--empty');
            });
            if (!lines.length) { toast('warning', '資料不足', '至少需新增 1 列工具'); return; }

            var rows = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var itemSel = qs('.js-item', line);
                var toolSel = qs('.js-tool', line);
                var inspect = qs('.js-inspect', line);
                var note = qs('.js-note', line);

                var itemId = itemSel ? Number(itemSel.value || 0) : 0;
                var toolId = toolSel ? Number(toolSel.value || 0) : 0;

                if (!itemId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具分類'); return; }
                if (!toolId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具編號'); return; }

                rows.push({
                    tool_id: toolId,
                    inspect_date: (inspect && inspect.value) ? String(inspect.value) : '',
                    note: (note && note.value) ? String(note.value).trim() : ''
                });
            }

            apiPost('/api/hot/assign', { action: 'vehicle_add', vehicle_id: vehicleId, rows: rows })
                .then(function (j) {
                    if (!j || !j.success) { toast('danger', '儲存失敗', (j && j.error) ? j.error : '未知錯誤'); return; }
                    toast('success', '已儲存', '新增車輛配賦完成');
                    closeModal('modalVehAdd');
                    if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(vehicleId);
                });
        },

        submitVehicleDelete: function () {
            var self = this;
            var vehicleId = Number(self.state.pendingDeleteVehicleId || 0);
            if (!vehicleId) return;

            apiPost('/api/hot/assign', { action: 'vehicle_unassign_all', vehicle_id: vehicleId })
                .then(function (j) {
                    if (!j || !j.success) { toast('danger', '解除失敗', (j && j.error) ? j.error : '未知錯誤'); return; }
                    toast('success', '已解除', '該車全部配賦已解除');
                    closeModal('modalVehDelete');
                    if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(0);
                });
        },

        submitAssignAdd: function () {
            var self = this;
            if (!self.app) return;
            var vehicleId = Number(self.app.state.activeVehicleId || 0);
            if (!vehicleId) { toast('warning', '尚未選取車輛', '請先選取左側車輛'); return; }
            if (!self.els.mAssignAddRows) return;

            var lines = qsa('.hot-rowLine', self.els.mAssignAddRows).filter(function (x) { return !x.classList.contains('hot-rowLine--empty'); });
            if (!lines.length) { toast('warning', '資料不足', '至少需新增 1 列工具'); return; }

            var toolIds = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var itemSel = qs('.js-item', line);
                var toolSel = qs('.js-tool', line);
                var itemId = itemSel ? Number(itemSel.value || 0) : 0;
                var toolId = toolSel ? Number(toolSel.value || 0) : 0;
                if (!itemId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具分類'); return; }
                if (!toolId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具編號'); return; }
                toolIds.push(toolId);
            }

            apiPost('/api/hot/assign', { action: 'assign_more', vehicle_id: vehicleId, tool_ids: toolIds })
                .then(function (j) {
                    if (!j || !j.success) { toast('danger', '儲存失敗', (j && j.error) ? j.error : '未知錯誤'); return; }
                    toast('success', '已儲存', '新增配賦完成');
                    closeModal('modalAssignAdd');
                    if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(vehicleId);
                });
        },

        submitAssignMove: function () {
            var self = this;
            if (!self.app) return;
            var vehicleId = Number(self.app.state.activeVehicleId || 0);
            if (!vehicleId) { toast('warning', '尚未選取車輛', '請先選取左側車輛'); return; }
            if (!self.els.mAssignMoveRows) return;

            var lines = qsa('.hot-rowLine', self.els.mAssignMoveRows).filter(function (x) { return !x.classList.contains('hot-rowLine--empty'); });
            if (!lines.length) { toast('warning', '資料不足', '至少需新增 1 列工具'); return; }

            var toolIds = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var itemSel = qs('.js-item', line);
                var toolSel = qs('.js-tool', line);
                var itemId = itemSel ? Number(itemSel.value || 0) : 0;
                var toolId = toolSel ? Number(toolSel.value || 0) : 0;
                if (!itemId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具分類'); return; }
                if (!toolId) { toast('warning', '資料不足', '第 ' + (i + 1) + ' 列：請選工具編號'); return; }
                toolIds.push(toolId);
            }

            apiPost('/api/hot/assign', { action: 'transfer', vehicle_id: vehicleId, tool_ids: toolIds })
                .then(function (j) {
                    if (!j || !j.success) { toast('danger', '移轉失敗', (j && j.error) ? j.error : '未知錯誤'); return; }
                    toast('success', '已移轉', '移轉進來完成');
                    closeModal('modalAssignMove');
                    if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(vehicleId);
                });
        },

        submitToolUnassign: function () {
            var self = this;
            var tid = Number(self.state.pendingToolUnassignId || 0);
            if (!tid) return;

            apiPost('/api/hot/assign', { action: 'tool_unassign', tool_ids: [tid] })
                .then(function (j) {
                    if (!j || !j.success) { toast('danger', '解除失敗', (j && j.error) ? j.error : '未知錯誤'); return; }
                    toast('success', '已解除', '工具歸屬已解除');
                    closeModal('modalToolUnassign');
                    if (self.app && typeof self.app.loadAll === 'function') self.app.loadAll(Number(self.app.state.activeVehicleId || 0));
                });
        }
    };

    global.HotAssignModals = Mod;

})(window);
