/* Path: Public/assets/js/mat_edit_B.js
 * 說明: /mat/edit_B（B 班管理）前端控制器
 * - 載入清單（shift=B）
 * - 搜尋（材料編號 + 名稱）
 * - 拖曳排序（小範圍調整）
 * - 指定位置（大範圍插入式調整）
 *
 * 依賴：
 * - api.js（apiGet/apiPost）
 * - ui_modal.js（Modal）
 * - ui_toast.js（Toast）
 * - mat_edit_ui.js（MatEditUI.enableDragSort）
 */

(function (global) {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function esc(s) {
        s = (s === null || s === undefined) ? '' : String(s);
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    var App = {
        els: {},
        state: {
            items: [],
            filtered: [],
            keyword: '',
            indexMap: {} // material_number => original index (1-based)
        },

        init: function () {
            this.els.list = qs('#mbList');
            this.els.search = qs('#mbSearch');
            this.els.searchClear = qs('#mbSearchClear');
            this.els.note = qs('#mbNote');
            this.els.hint = qs('#mbHint');

            if (this.els.search) {
                this.els.search.addEventListener('input', function () {
                    App.state.keyword = String(App.els.search.value || '').trim();
                    App.toggleSearchClear();
                    App.applyFilterAndRender();
                });
            }
            if (this.els.searchClear) {
                this.els.searchClear.addEventListener('click', function () {
                    if (App.els.search) App.els.search.value = '';
                    App.state.keyword = '';
                    App.toggleSearchClear();
                    App.applyFilterAndRender();
                    if (App.els.search) App.els.search.focus();
                });
            }

            this.load();
        },

        load: function () {
            if (!global.apiGet) return;

            this.setNote('載入中…');

            return global.apiGet('/api/mat/edit_B?action=list').then(function (j) {
                if (!j || !j.success) {
                    App.setNote('');
                    if (global.Toast) global.Toast.show({ type: 'error', title: '載入失敗', message: (j && j.error) ? j.error : 'list error' });
                    return;
                }

                App.state.items = (j.data && j.data.items) ? j.data.items : [];
                // 建立原始項次（維持完整清單順序）
                App.state.indexMap = {};
                App.state.items.forEach(function (it, idx) {
                    var mn = String((it && it.material_number) || '');
                    if (mn) App.state.indexMap[mn] = idx + 1; // 1-based
                });
                App.applyFilterAndRender();
                App.setNote(App.state.items.length ? ('共 ' + App.state.items.length + ' 筆') : '目前沒有 B 班材料');
            });
        },

        applyFilterAndRender: function () {
            var kw = (this.state.keyword || '').toLowerCase();
            var all = this.state.items || [];

            if (!kw) {
                this.state.filtered = all.slice();
                if (this.els.hint) this.els.hint.textContent = '';
            } else {
                this.state.filtered = all.filter(function (it) {
                    var code = String(it.material_number || '').toLowerCase();
                    var name = String(it.material_name || '').toLowerCase();
                    return code.indexOf(kw) >= 0 || name.indexOf(kw) >= 0;
                });

                if (this.els.hint) this.els.hint.textContent = '搜尋結果：' + this.state.filtered.length + ' 筆（搜尋中將暫停排序操作）';
            }

            this.render();
        },

        render: function () {
            if (!this.els.list) return;

            var list = this.state.filtered || [];
            var isFiltering = !!(this.state.keyword && this.state.keyword.trim());

            if (!list.length) {
                this.els.list.innerHTML = '<div class="me-note">無資料。</div>';
                return;
            }

            var html = '';
            for (var i = 0; i < list.length; i++) {
                var it = list[i] || {};
                var mn = String(it.material_number || '');
                var name = String(it.material_name || '');
                var idx = App.state.indexMap[mn] || (i + 1);

                html += ''
                    + '<div class="mb-item' + (isFiltering ? ' is-filtered' : '') + '" data-mn="' + esc(mn) + '" draggable="' + (!isFiltering ? 'true' : 'false') + '">'
                    + '  <div class="mb-drag" title="拖曳排序">≡</div>'
                    + '  <div class="mb-idx">' + esc(String(idx)) + '</div>'
                    + '  <div class="mb-code">' + esc(mn) + '</div>'
                    + '  <div class="mb-name" title="' + esc(name) + '">' + esc(name || '—') + '</div>'
                    + '  <div class="mb-act">'
                    + '    <button type="button" class="btn btn--ghost" data-act="move">指定順序</button>'
                    + '  </div>'
                    + '</div>';
            }

            this.els.list.innerHTML = html;

            // bind move buttons
            qsa('[data-act="move"]', this.els.list).forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var row = btn.closest ? btn.closest('.mb-item') : null;
                    var mn = row ? row.getAttribute('data-mn') : '';
                    if (!mn) return;
                    App.openMoveModal(mn);
                });
            });

            // drag sort (只在非搜尋狀態)
            if (!isFiltering && global.MatEditUI && global.MatEditUI.enableDragSort) {
                global.MatEditUI.enableDragSort(this.els.list, '.mb-item', '.mb-drag', function () {
                    App.onDragSorted();
                });
            }
        },

        onDragSorted: function () {
            if (!global.apiPost) return;

            // 以 DOM 當下順序為準（完整 list，不做 filter 才允許拖）
            var order = qsa('.mb-item', this.els.list).map(function (el) {
                return el.getAttribute('data-mn');
            }).filter(Boolean);

            this.setNote('排序更新中…');

            return global.apiPost('/api/mat/edit_B?action=sort', { ordered: order }).then(function (j) {
                if (!j || !j.success) {
                    App.setNote('');
                    if (global.Toast) global.Toast.show({ type: 'error', title: '排序失敗', message: (j && j.error) ? j.error : 'sort error' });
                    return;
                }

                if (global.Toast) global.Toast.show({ type: 'success', title: '已更新', message: '排序已更新' });

                // 重新抓 DB（確保順序與 DB 一致）
                return App.load();

            });
        },

        openMoveModal: function (materialNumber) {
            if (!global.Modal) return;

            var total = (this.state.items || []).length || 0;
            var title = '指定順序';
            var html = ''
                + '<div class="me-modal-grid">'
                + '  <div class="me-field">'
                + '    <div class="me-label">材料編號</div>'
                + '    <div class="me-modal-hint" style="margin:6px 0 10px 0;">' + esc(materialNumber) + '</div>'
                + '    <div class="me-label">要插入到第幾筆？（1 - ' + esc(String(total)) + '）</div>'
                + '    <input type="number" id="mbMovePos" class="me-name-input" min="1" step="1" placeholder="例如：3">'
                + '    <div class="me-modal-hint">插入式移動：原本第 N 之後的資料會往後順延（不是對換）。</div>'
                + '  </div>'
                + '</div>';

            global.Modal.open({
                title: title,
                html: html,
                confirmText: '確定',
                cancelText: '取消',
                allowCloseBtn: true,
                closeOnBackdrop: true,
                closeOnEsc: true,
                onConfirm: function () {
                    var el = qs('#mbMovePos');
                    var v = el ? String(el.value || '').trim() : '';
                    var pos = parseInt(v, 10);

                    if (!v || !isFinite(pos) || pos <= 0) {
                        if (global.Toast) global.Toast.show({ type: 'warning', title: '輸入錯誤', message: '請輸入正整數位置' });
                        return false;
                    }

                    return App.moveTo(materialNumber, pos);
                }
            });

            setTimeout(function () {
                var el = qs('#mbMovePos');
                if (el) el.focus();
            }, 30);
        },

        moveTo: function (materialNumber, position) {
            if (!global.apiPost) return false;

            this.setNote('更新中…');

            return global.apiPost('/api/mat/edit_B?action=move_to', {
                material_number: materialNumber,
                position: position
            }).then(function (j) {
                if (!j || !j.success) {
                    App.setNote('');
                    if (global.Toast) global.Toast.show({ type: 'error', title: '更新失敗', message: (j && j.error) ? j.error : 'move_to error' });
                    return false;
                }

                if (global.Toast) global.Toast.show({ type: 'success', title: '已更新', message: '順序已更新' });

                // 重新抓 DB，但保留目前搜尋字串（搜尋中仍可指定順序）
                return App.load().then(function () {
                    // load() 內會 applyFilterAndRender()，會用 state.keyword 再 render
                    return true;
                });

            });
        },
        toggleSearchClear: function () {
            if (!this.els.searchClear || !this.els.search) return;
            var has = String(this.els.search.value || '').trim().length > 0;
            this.els.searchClear.classList.toggle('is-show', has);
        },

        setNote: function (text) {
            if (!this.els.note) return;
            this.els.note.textContent = text || '';
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        App.init();
    });

})(window);
