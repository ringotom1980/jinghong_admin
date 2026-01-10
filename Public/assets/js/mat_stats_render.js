/* Path: Public/assets/js/mat_stats_render.js
 * 說明: 統計渲染器
 * - 依 payload.groups 渲染：AC / B / D / EF
 * - D：categories + recon + issue_sum_by_category（目前空陣列也可渲染）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function n(v) {
    // API 回字串 "0.00" 這種，這裡只做顯示安全
    if (v === null || v === undefined) return '0.00';
    return String(v);
  }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function buildTable(rows, opts) {
    opts = opts || {};
    var hasSort = !!opts.hasSort;

    var thSort = hasSort ? '<th style="width:90px;">排序</th>' : '';
    var tdSort = function (r) { return hasSort ? ('<td class="ms-td-num">' + esc(String(r.sort_order || 0)) + '</td>') : ''; };

    var html = '';
    html += '<div class="ms-table-wrap">';
    html += '<table class="table ms-table">';
    html += '<thead><tr>';
    html += '<th style="width:140px;">材料編號</th>';
    html += '<th>材料名稱</th>';
    html += thSort;
    html += '<th class="ms-th-num">領新料</th>';
    html += '<th class="ms-th-num">領舊料</th>';
    html += '<th class="ms-th-num">退新料</th>';
    html += '<th class="ms-th-num">退舊料</th>';
    html += '<th class="ms-th-num">廢料</th>';
    html += '<th class="ms-th-num">下腳</th>';
    html += '</tr></thead>';

    html += '<tbody>';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      html += '<tr>';
      html += '<td class="ms-td-mono">' + esc(r.material_number || '') + '</td>';
      html += '<td class="ms-td-name">' + esc(r.material_name || '') + '</td>';
      html += tdSort(r);
      html += '<td class="ms-td-num">' + esc(n(r.collar_new)) + '</td>';
      html += '<td class="ms-td-num">' + esc(n(r.collar_old)) + '</td>';
      html += '<td class="ms-td-num">' + esc(n(r.recede_new)) + '</td>';
      html += '<td class="ms-td-num">' + esc(n(r.recede_old)) + '</td>';
      html += '<td class="ms-td-num">' + esc(n(r.scrap)) + '</td>';
      html += '<td class="ms-td-num">' + esc(n(r.footprint)) + '</td>';
      html += '</tr>';
    }
    if (!rows.length) {
      html += '<tr><td colspan="' + (hasSort ? 10 : 9) + '" class="ms-empty">無資料</td></tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  function sectionCard(title, subtitle, innerHtml) {
    var html = '';
    html += '<section class="ms-section card card--flat">';
    html += '  <div class="ms-section__head">';
    html += '    <div>';
    html += '      <h2 class="ms-section__title">' + esc(title) + '</h2>';
    html += (subtitle ? ('      <div class="ms-section__sub">' + esc(subtitle) + '</div>') : '');
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="ms-section__body">';
    html += innerHtml || '';
    html += '  </div>';
    html += '</section>';
    return html;
  }

  function renderD(groupD) {
    groupD = groupD || {};
    var cats = Array.isArray(groupD.categories) ? groupD.categories : [];
    var recon = groupD.recon || null;
    var reconValues = (recon && recon.values) ? recon.values : {};
    var issueSum = Array.isArray(groupD.issue_sum_by_category) ? groupD.issue_sum_by_category : [];

    var html = '';

    // 1) 類別清單
    var list = '<div class="ms-d-grid">';
    if (!cats.length) {
      list += '<div class="ms-empty">尚無分類</div>';
    } else {
      list += '<div class="ms-d-cats">';
      for (var i = 0; i < cats.length; i++) {
        var c = cats[i];
        var val = (reconValues && (reconValues[String(c.id)] !== undefined)) ? String(reconValues[String(c.id)]) : '';
        list += ''
          + '<div class="ms-d-cat">'
          + '  <div class="ms-d-cat__name">' + esc(c.category_name) + '</div>'
          + '  <div class="ms-d-cat__meta">ID ' + esc(String(c.id)) + '｜排序 ' + esc(String(c.sort_order)) + '</div>'
          + '  <div class="ms-d-cat__recon">'
          + '    <span class="ms-d-chip">對帳</span>'
          + '    <span class="ms-d-val">' + (val !== '' ? esc(val) : '<span class="ms-d-muted">（未填）</span>') + '</span>'
          + '  </div>'
          + '</div>';
      }
      list += '</div>';
    }
    list += '</div>';

    // 2) 來源統計（如果你之後回傳 issue_sum_by_category）
    var sumHtml = '';
    if (issueSum.length) {
      sumHtml += '<div class="ms-table-wrap"><table class="table ms-table">';
      sumHtml += '<thead><tr><th>分類</th><th class="ms-th-num">來源數量</th></tr></thead><tbody>';
      for (var j = 0; j < issueSum.length; j++) {
        var s = issueSum[j] || {};
        sumHtml += '<tr><td>' + esc(String(s.category_name || s.category_id || '')) + '</td><td class="ms-td-num">' + esc(String(s.qty || s.value || 0)) + '</td></tr>';
      }
      sumHtml += '</tbody></table></div>';
    } else {
      sumHtml = '<div class="ms-empty">來源統計尚未提供（issue_sum_by_category 為空）</div>';
    }

    // 3) recon meta
    var metaHtml = '';
    if (recon && recon.meta) {
      metaHtml = '最後更新：' + esc(String(recon.meta.updated_at || '')) + '｜更新者：' + esc(String(recon.meta.updated_by || ''));
    } else {
      metaHtml = '尚無對帳紀錄';
    }

    html += sectionCard('D 組（分類對帳）', metaHtml, list + '<div class="ms-gap"></div>' + sumHtml);
    return html;
  }

  var Mod = {
    render: function (payload, opts) {
      opts = opts || {};
      var root = qs('#msContent');
      if (!root) return;

      payload = payload || {};
      var groups = payload.groups || {};

      var html = '';

      // AC
      if (groups.AC) {
        var rowsAC = (groups.AC && Array.isArray(groups.AC.rows)) ? groups.AC.rows : [];
        html += sectionCard('A + C 組', '領退明細彙總', buildTable(rowsAC, { hasSort: false }));
      }

      // B（含 sort_order）
      if (groups.B) {
        var rowsB = (groups.B && Array.isArray(groups.B.rows)) ? groups.B.rows : [];
        html += sectionCard('B 組', '材料排序（sort_order）優先', buildTable(rowsB, { hasSort: true }));
      }

      // D（分類 + recon）
      if (groups.D) {
        html += renderD(groups.D);
      }

      // EF
      if (groups.EF) {
        var rowsEF = (groups.EF && Array.isArray(groups.EF.rows)) ? groups.EF.rows : [];
        html += sectionCard('E + F 組', '領退明細彙總', buildTable(rowsEF, { hasSort: false }));
      }

      if (!html) {
        html = '<div class="ms-empty">無資料</div>';
      }

      root.innerHTML = html;
    }
  };

  global.MatStatsRender = Mod;

})(window);
