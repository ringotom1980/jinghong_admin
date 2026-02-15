/**
 * Path: Public/assets/js/hot_helmets.js
 * 說明: 安全帽管理前端（最小可用）
 * 依賴：assets/js/api.js（apiRequest）
 */

(() => {
  const API = (action, params = {}) => {
    const qs = new URLSearchParams({ action, ...params });
    return `api/hot/helmets?${qs.toString()}`;
  };

  const $ = (sel) => document.querySelector(sel);

  const state = {
    assignees: [],
    assignedRows: [],
    stock: [],
    selectedAssigneeId: null,
    preview: null,
  };

  function toast(msg, type = 'info') {
    // 你專案有 ui_toast.js，這裡做最小 fallback
    if (window.toast && typeof window.toast === 'function') return window.toast(msg, type);
    alert(msg);
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  }
  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }

  function bindModalClose() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const mid = t.getAttribute('data-close-modal');
      if (mid) closeModal(mid);
    });
  }

  function fmtEmployee(r) {
    return `${r.assignee_id} ${r.assignee_name}`;
  }

  function badgeExpiry(status) {
    if (!status) return `<span class="badge badge--muted">-</span>`;
    if (status === 'OK') return `<span class="badge badge--ok">正常</span>`;
    if (status === 'WARN') return `<span class="badge badge--warn">快到期</span>`;
    if (status === 'EXPIRED') return `<span class="badge badge--danger">已逾期</span>`;
    return `<span class="badge badge--muted">${status}</span>`;
  }

  async function apiGet(url) {
    const j = await apiRequest(url, { method: 'GET' });
    if (!j || !j.success) throw new Error(j?.error?.message || 'API 失敗');
    return j.data;
  }

  async function apiPost(action, body) {
    const j = await apiRequest('api/hot/helmets', {
      method: 'POST',
      body: JSON.stringify({ action, ...body }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!j || !j.success) throw new Error(j?.error?.message || 'API 失敗');
    return j.data;
  }

  function renderAssignees(rows) {
    const q = ($('#qAssignees')?.value || '').trim();
    const tbody = $('#tbAssignees');
    if (!tbody) return;

    const filtered = rows.filter(r => {
      if (!q) return true;
      const s = `${r.assignee_id} ${r.assignee_name}`.toLowerCase();
      return s.includes(q.toLowerCase());
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr class="hot-empty"><td colspan="5">無符合資料</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      const helmet = r.helmet_code ? `<span class="mono">${r.helmet_code}</span>` : `<span class="muted">未配賦</span>`;
      const inspect = r.inspect_date ? `<span class="mono">${r.inspect_date}</span>` : `<span class="muted">-</span>`;
      const expiry = r.expiry_date ? `<div class="expiry"><span class="mono">${r.expiry_date}</span></div>` : '';
      const st = badgeExpiry(r.expiry_status) + expiry;

      const btnLabel = r.helmet_code ? '更換' : '配賦';
      const btn = `<button class="btn btn--primary btn--sm" type="button" data-act="assign" data-aid="${r.assignee_id}">${btnLabel}</button>`;
      const btnUn = r.helmet_code ? `<button class="btn btn--ghost btn--sm" type="button" data-act="unassign" data-serial="${r.serial_no}">解除</button>` : '';

      return `
        <tr>
          <td>${fmtEmployee(r)}</td>
          <td>${helmet}</td>
          <td>${inspect}</td>
          <td>${st}</td>
          <td class="cell-actions">${btn}${btnUn}</td>
        </tr>
      `;
    }).join('');
  }

  function renderStock(stock) {
    const q = ($('#qStock')?.value || '').trim().toUpperCase();
    const tbody = $('#tbStock');
    const kpi = $('#stockKpi');
    if (!tbody) return;

    let filtered = stock;
    if (q) {
      filtered = stock.filter(x => {
        const code = (x.helmet_code || '').toUpperCase();
        const sn = String(x.serial_no);
        return code.includes(q) || sn.includes(q.replace(/^16E/, ''));
      });
    }

    if (kpi) kpi.textContent = `庫存：${stock.length}`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr class="hot-empty"><td colspan="3">無庫存可配賦</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(x => `
      <tr>
        <td><span class="mono">${x.helmet_code}</span></td>
        <td><span class="badge badge--ok">可配賦</span></td>
        <td><span class="muted">（由左側員工按配賦/更換）</span></td>
      </tr>
    `).join('');
  }

  function renderPreview(p) {
    const box = $('#batchPreview');
    if (!box) return;

    if (!p) {
      box.innerHTML = `<div class="hot-preview__line">尚未預覽</div>`;
      return;
    }

    const r = p.range;
    const wrap = p.is_wrap ? `<span class="badge badge--warn">wrap 回 001</span>` : `<span class="badge badge--ok">接續</span>`;
    const can = p.can_add ? `<span class="badge badge--ok">可新增</span>` : `<span class="badge badge--danger">禁止新增</span>`;

    const unused = (p.wrap_notice_unused_in_stock || []);
    const blk = (p.wrap_block_assigned || []);

    const unusedHtml = p.is_wrap
      ? `<div class="hot-preview__sub">
          <div class="muted">提示：區間內仍為庫存(IN_STOCK) 的舊號碼（可能帳實不符）</div>
          <div class="mono small">${unused.length ? unused.join(', ') : '（無）'}</div>
        </div>`
      : '';

    const blkHtml = p.is_wrap
      ? `<div class="hot-preview__sub">
          <div class="muted">阻擋：區間內使用中(ASSIGNED)（存在則禁止新增）</div>
          <div class="mono small">${blk.length ? blk.join(', ') : '（無）'}</div>
        </div>`
      : '';

    box.innerHTML = `
      <div class="hot-preview__line">
        建議印製：<span class="mono">${r.start_code}</span> ～ <span class="mono">${r.end_code}</span>
        ${wrap} ${can}
      </div>
      ${unusedHtml}
      ${blkHtml}
    `;
  }

  async function refreshAll() {
    const [assignees, assigned, stock] = await Promise.all([
      apiGet(API('assignees')),
      apiGet(API('assigned_list')),
      apiGet(API('stock_list')),
    ]);

    state.assignees = assignees.assignees || [];
    state.assignedRows = assigned.rows || [];
    state.stock = stock.stock || [];

    renderAssignees(state.assignedRows);
    renderStock(state.stock);
  }

  async function openAssignModal(assigneeId) {
    state.selectedAssigneeId = assigneeId;

    const row = state.assignedRows.find(r => String(r.assignee_id) === String(assigneeId));
    const who = $('#mAssignWho');
    if (who) who.textContent = row ? `${row.assignee_id} ${row.assignee_name}` : `員工ID ${assigneeId}`;

    // build stock options
    const sel = $('#mAssignSerial');
    if (sel) {
      const opts = state.stock.map(x => `<option value="${x.serial_no}">${x.helmet_code}</option>`).join('');
      sel.innerHTML = `<option value="">（請選擇）</option>` + opts;
    }

    const d = $('#mAssignInspectDate');
    if (d) d.value = '';

    openModal('modalAssign');
  }

  async function handleAssignSubmit() {
    const aid = state.selectedAssigneeId;
    const serial = parseInt($('#mAssignSerial')?.value || '0', 10);
    const inspect = ($('#mAssignInspectDate')?.value || '').trim();

    if (!aid) return toast('assignee_id 不存在', 'warn');
    if (!serial) return toast('請選擇庫存帽號', 'warn');
    if (!inspect) return toast('檢驗日期為必填', 'warn');

    // decide assign or swap by current row status
    const row = state.assignedRows.find(r => String(r.assignee_id) === String(aid));
    try {
      if (row && row.status === 'ASSIGNED' && row.serial_no) {
        await apiPost('swap', {
          assignee_id: aid,
          new_serial_no: serial,
          inspect_date: inspect,
          replace_date: new Date().toISOString().slice(0, 10),
        });
        toast('更換完成', 'ok');
      } else {
        await apiPost('assign', { assignee_id: aid, serial_no: serial, inspect_date: inspect });
        toast('配賦完成', 'ok');
      }
      closeModal('modalAssign');
      await refreshAll();
    } catch (e) {
      toast(e.message || '操作失敗', 'danger');
    }
  }

  async function handleUnassign(serialNo) {
    if (!confirm('確定要解除此安全帽配賦？（會回到庫存）')) return;
    try {
      await apiPost('unassign', { serial_no: serialNo });
      toast('已解除', 'ok');
      await refreshAll();
    } catch (e) {
      toast(e.message || '解除失敗', 'danger');
    }
  }

  async function suggestPrint() {
    const qty = parseInt($('#batchQty')?.value || '0', 10);
    if (!qty || qty < 1 || qty > 999) return toast('qty 必須 1..999', 'warn');

    try {
      const p = await apiGet(API('suggest_print', { qty }));
      state.preview = p;
      renderPreview(p);
      if (!p.can_add) toast('預覽顯示：存在使用中(ASSIGNED)號碼，將禁止新增', 'warn');
    } catch (e) {
      toast(e.message || '預覽失敗', 'danger');
    }
  }

  async function batchAdd() {
    const qty = parseInt($('#batchQty')?.value || '0', 10);
    if (!qty || qty < 1 || qty > 999) return toast('qty 必須 1..999', 'warn');

    // 強制先預覽一次（避免誤按）
    if (!state.preview || state.preview.qty !== qty) {
      await suggestPrint();
      if (!state.preview) return;
    }

    if (!state.preview.can_add) return toast('禁止新增：請先更換仍在使用中的號碼', 'danger');

    const r = state.preview.range;
    const ok = confirm(`確定新增號碼？\n建議印製：${r.start_code} ～ ${r.end_code}\nqty=${qty}`);
    if (!ok) return;

    try {
      const res = await apiPost('batch_add', { qty });
      toast(`已新增：${res.range.start_code} ～ ${res.range.end_code}`, 'ok');
      state.preview = null;
      renderPreview(null);
      await refreshAll();
    } catch (e) {
      toast(e.message || '新增失敗', 'danger');
    }
  }

  async function addAssignee() {
    const name = ($('#mAssigneeName')?.value || '').trim();
    if (!name) return toast('姓名不可為空', 'warn');

    try {
      await apiPost('assignee_create', { name });
      toast('已新增員工', 'ok');
      closeModal('modalAssigneeAdd');
      $('#mAssigneeName').value = '';
      await refreshAll();
    } catch (e) {
      toast(e.message || '新增失敗', 'danger');
    }
  }

  function bindEvents() {
    bindModalClose();

    $('#btnRefreshAll')?.addEventListener('click', refreshAll);

    $('#qAssignees')?.addEventListener('input', () => renderAssignees(state.assignedRows));
    $('#qStock')?.addEventListener('input', () => renderStock(state.stock));

    $('#btnAssigneeAdd')?.addEventListener('click', () => openModal('modalAssigneeAdd'));
    $('#btnAssigneeAddSubmit')?.addEventListener('click', addAssignee);

    $('#btnSuggestPrint')?.addEventListener('click', suggestPrint);
    $('#btnBatchAdd')?.addEventListener('click', batchAdd);

    $('#btnAssignSubmit')?.addEventListener('click', handleAssignSubmit);

    // delegation for assignee table
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      const act = t.getAttribute('data-act');
      if (!act) return;

      if (act === 'assign') {
        const aid = t.getAttribute('data-aid');
        if (aid) openAssignModal(parseInt(aid, 10));
      }

      if (act === 'unassign') {
        const sn = t.getAttribute('data-serial');
        if (sn) handleUnassign(parseInt(sn, 10));
      }
    });
  }

  async function init() {
    bindEvents();
    try {
      await refreshAll();
      renderPreview(null);
    } catch (e) {
      toast(e.message || '初始化失敗', 'danger');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
