/* Path: Public/assets/js/car_stats_print.js
 * 說明: 列印 modal + 檢核 + 開啟列印視窗
 * - 三選一：summary / all_details / vehicle_details
 * - 檢核：activeKey / activeVehicleId 必存在
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function pickPrintType() {
    var el = qs('input[name="csPrintType"]:checked');
    return el ? (el.value || '') : 'summary';
  }

  function buildHtml(title, payload) {
    // 注意：你說列印版面後續由 print.css/專用 print css 做
    // 這裡只產出最基本可用 HTML（不做花式）
    var esc = function (s) {
      s = (s === null || s === undefined) ? '' : String(s);
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    var html = '';
    html += '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1">';
    html += '<title>' + esc(title) + '</title>';
    html += '<style>body{font-family:system-ui,-apple-system,"Segoe UI",Arial,"Noto Sans TC";padding:16px}';
    html += 'table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;font-size:12px}th{background:#f5f6f8;text-align:left}';
    html += '.ta-r{text-align:right}.h{margin:0 0 10px}.sec{margin:14px 0 18px}</style>';
    html += '</head><body>';

    html += '<h2 class="h">' + esc(title) + '</h2>';

    // 三種 payload 結構由 API 控制；此處最小可印
    if (payload && payload.type === 'summary') {
      html += '<div class="sec">';
      html += '<table><thead><tr>';
      html += '<th>車輛編號</th><th>車牌</th>';
      (payload.months || []).forEach(function (m) {
        html += '<th class="ta-r">' + esc(m) + '</th>';
      });
      html += '<th class="ta-r">公司合計</th><th class="ta-r">工班合計</th><th class="ta-r">總合計</th>';
      html += '</tr></thead><tbody>';

      (payload.rows || []).forEach(function (r) {
        html += '<tr>';
        html += '<td>' + esc(r.vehicle_code || '') + '</td>';
        html += '<td>' + esc(r.plate_no || '') + '</td>';
        (payload.months || []).forEach(function (m) {
          var cell = (r.by_month && r.by_month[m]) ? r.by_month[m] : { grand_total: 0 };
          html += '<td class="ta-r">' + esc(String(Math.round(Number(cell.grand_total || 0)))) + '</td>';
        });
        html += '<td class="ta-r">' + esc(String(Math.round(Number(r.company_total || 0)))) + '</td>';
        html += '<td class="ta-r">' + esc(String(Math.round(Number(r.team_total || 0)))) + '</td>';
        html += '<td class="ta-r">' + esc(String(Math.round(Number(r.grand_total || 0)))) + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table></div>';
    }

    if (payload && payload.type === 'all_details') {
      (payload.vehicles || []).forEach(function (v) {
        html += '<div class="sec">';
        html += '<h3>' + esc(v.vehicle_code || '') + '（' + esc(v.plate_no || '') + '）</h3>';
        html += '<table><thead><tr><th>日期</th><th>內容</th><th class="ta-r">公司</th><th class="ta-r">工班</th><th class="ta-r">總額</th></tr></thead><tbody>';
        (v.rows || []).forEach(function (r) {
          html += '<tr>';
          html += '<td>' + esc(r.repair_date || '') + '</td>';
          html += '<td>' + esc(r.content || '') + '</td>';
          html += '<td class="ta-r">' + esc(String(Math.round(Number(r.company_amount_total || 0)))) + '</td>';
          html += '<td class="ta-r">' + esc(String(Math.round(Number(r.team_amount_total || 0)))) + '</td>';
          html += '<td class="ta-r">' + esc(String(Math.round(Number(r.grand_total || 0)))) + '</td>';
          html += '</tr>';
        });
        html += '</tbody></table></div>';
      });
    }

    if (payload && payload.type === 'vehicle_details') {
      var v2 = payload.vehicle || {};
      html += '<div class="sec">';
      html += '<h3>' + esc(v2.vehicle_code || '') + '（' + esc(v2.plate_no || '') + '）</h3>';
      html += '<table><thead><tr><th>日期</th><th>內容</th><th class="ta-r">公司</th><th class="ta-r">工班</th><th class="ta-r">總額</th></tr></thead><tbody>';
      (payload.rows || []).forEach(function (r) {
        html += '<tr>';
        html += '<td>' + esc(r.repair_date || '') + '</td>';
        html += '<td>' + esc(r.content || '') + '</td>';
        html += '<td class="ta-r">' + esc(String(Math.round(Number(r.company_amount_total || 0)))) + '</td>';
        html += '<td class="ta-r">' + esc(String(Math.round(Number(r.team_amount_total || 0)))) + '</td>';
        html += '<td class="ta-r">' + esc(String(Math.round(Number(r.grand_total || 0)))) + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }

    html += '<script>window.onload=function(){setTimeout(function(){window.print();},80);};</script>';
    html += '</body></html>';
    return html;
  }

  var Mod = {
    run: function (ctx, apiGet, toast, closeModal) {
      var type = pickPrintType();

      if (type === 'summary' || type === 'all_details') {
        if (!ctx.activeKey) {
          toast('warning', '缺少期間', '請先選定某個半年或全年膠囊');
          return;
        }
      }
      if (type === 'vehicle_details') {
        if (!ctx.activeVehicleId) {
          toast('warning', '缺少車輛', '請先在左側選定一台車輛');
          return;
        }
      }

      var api = '';
      var params = { key: ctx.activeKey };

      if (type === 'summary') api = '/api/car/car_stats_print_summary';
      if (type === 'all_details') api = '/api/car/car_stats_print_all_details';
      if (type === 'vehicle_details') {
        api = '/api/car/car_stats_print_vehicle_details';
        params.vehicle_id = ctx.activeVehicleId;
      }

      apiGet(api, params).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '列印資料取得失敗');
        var payload = j.data || {};
        if (typeof closeModal === 'function') closeModal();

        var w = window.open('', '_blank');
        if (!w) {
          toast('error', '無法開啟列印視窗', '請確認瀏覽器未封鎖彈出視窗');
          return;
        }
        w.document.open();
        w.document.write(buildHtml(payload.title || '列印', payload));
        w.document.close();
      }).catch(function (err) {
        toast('error', '列印失敗', err && err.message ? err.message : String(err));
      });
    }
  };

  global.CarStatsPrint = Mod;

})(window);
