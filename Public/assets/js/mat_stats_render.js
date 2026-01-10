/* Path: Public/assets/js/mat_stats_render.js
 * 說明: 統計渲染（msContent）
 * - 不假設資料結構過細，採「可容錯」渲染：
 *   1) data.html 存在 → 直接塞（後端可回已組好的片段）
 *   2) data.sections[] → 以卡片/表格方式渲染
 *   3) 其他 → JSON pretty（避免空白頁）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  var Mod = {
    app: null,
    el: null,

    init: function (app) {
      this.app = app;
      this.el = qs('#msContent');
    },

    render: function (data) {
      if (!this.el) return;
      data = data || {};

      // 1) 後端若直接回 html（你要「後端都做好」也可以用這招）
      if (typeof data.html === 'string' && data.html.trim() !== '') {
        this.el.innerHTML = data.html;
        return;
      }

      // 2) sections 模式（建議後端統一回這個結構）
      if (Array.isArray(data.sections) && data.sections.length) {
        this.el.innerHTML = renderSections(data.sections);
        return;
      }

      // 3) fallback：直接印 JSON，避免你以為沒跑
      this.el.innerHTML =
        '<div class="card ms-card ms-card--fallback">' +
        '  <div class="card__head"><h2>回傳資料（debug）</h2></div>' +
        '  <div class="card__body"><pre class="ms-pre">' + escapeHtml(JSON.stringify(data, null, 2)) + '</pre></div>' +
        '</div>';
    }
  };

  function renderSections(sections) {
    var html = '';
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i] || {};
      var title = s.title || ('區塊 ' + (i + 1));

      html += '<div class="card ms-card">';
      html += '  <div class="card__head"><h2>' + escapeHtml(title) + '</h2></div>';
      html += '  <div class="card__body">';

      // table
      if (Array.isArray(s.columns) && Array.isArray(s.rows)) {
        html += renderTable(s.columns, s.rows);
      } else if (typeof s.html === 'string' && s.html.trim() !== '') {
        html += s.html;
      } else if (s.text) {
        html += '<div class="ms-text">' + escapeHtml(String(s.text)) + '</div>';
      } else {
        html += '<div class="ms-empty">無資料</div>';
      }

      html += '  </div>';
      html += '</div>';
    }
    return html;
  }

  function renderTable(columns, rows) {
    var html = '<div class="ms-table-wrap"><table class="table ms-table"><thead><tr>';
    for (var i = 0; i < columns.length; i++) {
      var c = columns[i] || {};
      html += '<th>' + escapeHtml(String(c.label || c.key || ('col' + i))) + '</th>';
    }
    html += '</tr></thead><tbody>';

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r] || {};
      html += '<tr>';
      for (var j = 0; j < columns.length; j++) {
        var key = (columns[j] && columns[j].key) ? String(columns[j].key) : '';
        var v = key ? row[key] : '';
        html += '<td>' + escapeHtml(formatCell(v)) + '</td>';
      }
      html += '</tr>';
    }

    html += '</tbody></table></div>';
    return html;
  }

  function formatCell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return String(v);
    return String(v);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.MatStatsRender = Mod;

})(window);
