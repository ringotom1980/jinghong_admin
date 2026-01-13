/* Path: Public/assets/js/vehicle_base_inspections.js
 * 說明: 檢查項目渲染/收集（inspection_types + inspections + rules）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function esc(s) {
    s = (s === null || s === undefined) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  var Mod = {
    app: null,

    init: function (app) {
      this.app = app;
    },

    renderEmpty: function () {
      var w = this.app && this.app.els ? this.app.els.inspectionsWrap : null;
      if (!w) return;
      w.innerHTML = '<div class="vb-empty">請先選擇左側車輛。</div>';
    },

    renderNew: function (types) {
      this.render(types || [], [], []);
    },

    render: function (types, inspections, rules) {
      var w = this.app && this.app.els ? this.app.els.inspectionsWrap : null;
      if (!w) return;

      types = types || [];
      inspections = inspections || [];
      rules = rules || [];

      if (!this.app || !this.app.state || !this.app.state.current) {
        this.renderEmpty();
        return;
      }

      var insMap = {};
      for (var i = 0; i < inspections.length; i++) {
        insMap[String(inspections[i].type_id)] = inspections[i];
      }

      var ruleMap = {};
      for (var j = 0; j < rules.length; j++) {
        ruleMap[String(rules[j].type_id)] = rules[j];
      }

      if (!types.length) {
        w.innerHTML = '<div class="vb-empty">目前沒有檢查項目字典（vehicle_inspection_types）。</div>';
        return;
      }

      var html = '';
      for (var k = 0; k < types.length; k++) {
        var t = types[k];
        var tid = t.type_id;
        var name = t.type_name || t.type_key || ('#' + tid);

        var ins = insMap[String(tid)];
        var due = ins ? (ins.due_date || '') : '';

        // rule: default required=1（若無記錄）
        var r = ruleMap[String(tid)];
        var req = (r ? (String(r.is_required) !== '0') : true);

        html += ''
          + '<div class="vb-ins-row" data-type-id="' + esc(String(tid)) + '">'
          + '  <div class="vb-ins-name">' + esc(String(name)) + '</div>'
          + '  <div class="vb-ins-date"><input class="input vb-ins-due" type="date" value="' + esc(String(due)) + '" /></div>'
          + '  <label class="vb-ins-req"><input class="vb-ins-required" type="checkbox" ' + (req ? 'checked' : '') + ' /> 需要檢查</label>'
          + '</div>';
      }

      w.innerHTML = html;
    },

    collect: function () {
      var w = this.app && this.app.els ? this.app.els.inspectionsWrap : null;
      if (!w) return { inspections: [], rules: [] };

      var rows = w.querySelectorAll('.vb-ins-row[data-type-id]');
      var inspections = [];
      var rules = [];

      Array.prototype.forEach.call(rows, function (row) {
        var typeId = row.getAttribute('data-type-id');
        if (!typeId) return;

        var dueEl = qs('.vb-ins-due', row);
        var reqEl = qs('.vb-ins-required', row);

        var due = dueEl ? String(dueEl.value || '').trim() : '';
        var req = !!(reqEl && reqEl.checked);

        // due_date：允許空字串（代表清空）
        inspections.push({
          type_id: Number(typeId),
          due_date: due ? due : null
        });

        rules.push({
          type_id: Number(typeId),
          is_required: req ? 1 : 0
        });
      });

      return { inspections: inspections, rules: rules };
    }
  };

  global.VehicleBaseInspections = Mod;

})(window);
