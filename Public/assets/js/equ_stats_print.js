/* Path: Public/assets/js/equ_stats_print.js
 * 說明: 直接列印「工具維修統計表」（不出 modal、不詢問使用者）
 * - 標題：LOGO + 境宏工程有限公司-工具維修統計表(2025-全年/上半年/下半年)
 * - 月份欄：只顯示每月「維修金額 grand_total」（一個月一欄）
 * - 列尾三欄：公司負擔 / 工班負擔 / 維修金額（期間合計）
 * - 列印樣式：assets/css/equ_stats_print.css（外掛，不內嵌）
 * - 資料來源：/api/equ/equ_stats_print（EquRepairStatsService::getPrintVendorMatrix）
 */

(function (global) {
  'use strict';

  function buildHtml(title, payload) {
    var esc = function (s) {
      s = (s === null || s === undefined) ? '' : String(s);
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    var fmtMoney = function (v) {
      var n = Number(v || 0);
      if (!isFinite(n)) n = 0;
      return Math.round(n).toLocaleString('zh-TW');
    };

    var fmtMonth = function (m) {
      // m: "YYYY-MM"
      var s = String(m || '');
      var parts = s.split('-');
      var mm = parts.length >= 2 ? parseInt(parts[1], 10) : NaN;
      if (!mm || !isFinite(mm)) return s;
      return mm + '月';
    };

    // 依你專案慣例：部署在 /jinghong_admin 時要加 base
    var base = (location.pathname.split('/')[1] === 'jinghong_admin') ? '/jinghong_admin' : '';
    var ts = Date.now();
    var cssHref = base + '/assets/css/equ_stats_print.css?t=' + ts;
    var logoSrc = base + '/assets/img/brand/JH_logo.png?t=' + ts;

    var months = (payload && payload.months) ? payload.months : [];
    var rows = (payload && payload.rows) ? payload.rows : [];

    var html = '';
    html += '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1">';
    html += '<title>' + esc(title) + '</title>';
    html += '<link rel="stylesheet" href="' + esc(cssHref) + '">';
    html += '</head><body class="print print--equ-summary">';
    html += '<main class="print-body">';

    html += '<div class="sec">';
    html += '<table><thead>';

    // ✅ 欄寬定錨列（廠商 + 月份N欄 + 3欄合計）
    html += '<tr class="col-guard">';
    html += '<th class="col-vendor"></th>';
    months.forEach(function () { html += '<th></th>'; });
    html += '<th class="col-company"></th>';
    html += '<th class="col-team"></th>';
    html += '<th class="col-grand"></th>';
    html += '</tr>';

    // ✅ 文件標題列（thead 內）
    html += '<tr class="print-head-row">';
    html += '<th colspan="' + (1 + months.length + 3) + '">';
    html += '<header class="print-head">';
    html += '<img class="print-head__logo" src="' + esc(logoSrc) + '" alt="LOGO">';
    html += '<h1 class="print-head__title">' + esc(title) + '</h1>';
    html += '</header>';
    html += '</th>';
    html += '</tr>';

    // ✅ 欄位列
    html += '<tr>';
    html += '<th class="ta-c col-vendor">廠商</th>';
    months.forEach(function (m) {
      html += '<th class="ta-c col-month">' + esc(fmtMonth(m)) + '</th>';
    });
    html += '<th class="ta-c col-company">公司負擔</th>';
    html += '<th class="ta-c col-team">工班負擔</th>';
    html += '<th class="ta-c col-grand">維修金額</th>';
    html += '</tr>';

    html += '</thead><tbody>';

    // rows
    rows.forEach(function (r) {
      html += '<tr>';
      html += '<td class="ta-c col-vendor">' + esc(r.vendor_name || '') + '</td>';

      // ✅ 每月只顯示 grand_total（你要求的）
      months.forEach(function (m) {
        var cell = (r.by_month && r.by_month[m]) ? r.by_month[m] : { grand_total: 0 };
        html += '<td class="ta-r col-month">' + esc(fmtMoney(cell.grand_total)) + '</td>';
      });

      html += '<td class="ta-r col-company">' + esc(fmtMoney(r.company_total || 0)) + '</td>';
      html += '<td class="ta-r col-team">' + esc(fmtMoney(r.team_total || 0)) + '</td>';
      html += '<td class="ta-r col-grand">' + esc(fmtMoney(r.grand_total || 0)) + '</td>';
      html += '</tr>';
    });

    // ✅ 合計列（整表）
    var sumByMonth = {};
    months.forEach(function (m) { sumByMonth[m] = 0; });
    var sumCompany = 0, sumTeam = 0, sumGrand = 0;

    rows.forEach(function (r) {
      months.forEach(function (m) {
        var cell = (r.by_month && r.by_month[m]) ? r.by_month[m] : { grand_total: 0 };
        sumByMonth[m] += Number(cell.grand_total || 0);
      });
      sumCompany += Number(r.company_total || 0);
      sumTeam += Number(r.team_total || 0);
      sumGrand += Number(r.grand_total || 0);
    });

    html += '<tr class="sum-row">';
    html += '<td class="ta-c">合計</td>';
    months.forEach(function (m) {
      html += '<td class="ta-r col-month">' + esc(fmtMoney(sumByMonth[m])) + '</td>';
    });
    html += '<td class="ta-r col-company">' + esc(fmtMoney(sumCompany)) + '</td>';
    html += '<td class="ta-r col-team">' + esc(fmtMoney(sumTeam)) + '</td>';
    html += '<td class="ta-r col-grand">' + esc(fmtMoney(sumGrand)) + '</td>';
    html += '</tr>';

    html += '</tbody></table></div>';

    html += '</main>';
    html += '<script>window.onload=function(){setTimeout(function(){window.print();},80);};</script>';
    html += '</body></html>';

    return html;
  }

  var Mod = {
    run: function (ctx, apiGet, toast) {
      if (!ctx || !ctx.activeKey) {
        toast('warning', '缺少期間', '請先選定某個半年或全年膠囊');
        return;
      }

      apiGet('/api/equ/equ_stats_print', { key: ctx.activeKey }).then(function (j) {
        if (!j || !j.success) throw new Error((j && j.error) ? j.error : '列印資料取得失敗');

        var payload = j.data || {};
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

  global.EquStatsPrint = Mod;

})(window);
