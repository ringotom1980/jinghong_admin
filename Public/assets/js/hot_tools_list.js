/* Path: Public/assets/js/hot_tools_list.js
 * 說明: 右表 hot_tools 渲染器
 * - VIEW：純文字
 * - EDIT：檢驗日期 input[type=date]、車輛 select、備註 input
 * - 工具編號永遠鎖定
 */

(function (global) {
  'use strict';

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function vehText(row) {
    if (!row) return '（尚未配賦車輛）';
    if (!row.vehicle_id) return '（尚未配賦車輛）';
    var tag = (String(row.vehicle_is_active) === '0') ? '（停用）' : '';
    return (row.vehicle_code || '-') + ' / ' + (row.plate_no || '-') + tag;
  }

  function buildVehSelect(vehicles, selectedId) {
    selectedId = String(selectedId || '');
    var html = '<select class="input input--sm" data-field="vehicle_id">'
      + '<option value="">（尚未配賦車輛）</option>';

    (vehicles || []).forEach(function (v) {
      var tag = (String(v.is_active) === '0') ? '（停用）' : '';
      var text = (v.vehicle_code + ' / ' + v.plate_no + tag);
      var val = String(v.id);
      var sel = (val === selectedId) ? ' selected' : '';
      html += '<option value="' + esc(val) + '"' + sel + '>' + esc(text) + '</option>';
    });

    html += '</select>';
    return html;
  }

  var Mod = {
    render: function (tbody, tools, vehicles, mode) {
      if (!tbody) return;

      tools = tools || [];
      vehicles = vehicles || [];
      mode = (mode === 'EDIT') ? 'EDIT' : 'VIEW';

      if (!tools.length) {
        tbody.innerHTML = '<tr class="hot-empty"><td colspan="4">此分類尚無工具</td></tr>';
        return;
      }

      var html = '';
      tools.forEach(function (t) {
        var id = parseInt(t.id, 10) || 0;

        var dateCell = '';
        var vehCell = '';
        var noteCell = '';

        if (mode === 'EDIT') {
          dateCell = '<input class="input input--sm" data-field="inspect_date" type="date" value="' + esc(t.inspect_date || '') + '">';
          vehCell = buildVehSelect(vehicles, t.vehicle_id);
          noteCell = '<input class="input input--sm" data-field="note" type="text" value="' + esc(t.note || '') + '" placeholder="">';
        } else {
          dateCell = esc(t.inspect_date || '');
          vehCell = esc(vehText(t));
          noteCell = esc(t.note || '');
        }

        html += ''
          + '<tr class="hot-row" data-tool-id="' + esc(id) + '">'
          + '  <td><span class="hot-mono">' + esc(t.tool_no) + '</span></td>'
          + '  <td>' + dateCell + '</td>'
          + '  <td>' + vehCell + '</td>'
          + '  <td>' + noteCell + '</td>'
          + '</tr>';
      });

      tbody.innerHTML = html;
    }
  };

  global.HotToolsList = Mod;

})(window);
