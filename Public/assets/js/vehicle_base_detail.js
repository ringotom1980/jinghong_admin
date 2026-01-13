/* Path: Public/assets/js/vehicle_base_detail.js
 * 說明: 明細表單填值/清空
 */

(function (global) {
  'use strict';

  function v(sel) { return sel ? sel.value : ''; }
  function set(sel, val) { if (sel) sel.value = (val === null || val === undefined) ? '' : String(val); }
  function setChk(sel, yes) { if (sel) sel.checked = !!yes; }

  var Mod = {
    app: null,

    init: function (app) {
      this.app = app;
    },

    fill: function (row) {
      var a = this.app;
      if (!a || !a.els) return;

      if (!row) {
        set(a.els.id, '');
        set(a.els.vehicle_code, '');
        set(a.els.plate_no, '');
        set(a.els.vehicle_type_id, '');
        set(a.els.brand_id, '');
        set(a.els.boom_type_id, '');
        set(a.els.owner_name, '');
        set(a.els.user_name, '');
        set(a.els.tonnage, '');
        set(a.els.vehicle_year, '');
        set(a.els.vehicle_price, '');
        set(a.els.boom_price, '');
        set(a.els.bucket_price, '');
        setChk(a.els.is_active, true);
        set(a.els.note, '');
        return;
      }

      set(a.els.id, row.id || '');
      set(a.els.vehicle_code, row.vehicle_code || '');
      set(a.els.plate_no, row.plate_no || '');
      set(a.els.vehicle_type_id, row.vehicle_type_id || '');
      set(a.els.brand_id, row.brand_id || '');
      set(a.els.boom_type_id, row.boom_type_id || '');
      set(a.els.owner_name, row.owner_name || '');
      set(a.els.user_name, row.user_name || '');
      set(a.els.tonnage, (row.tonnage === null || row.tonnage === undefined) ? '' : row.tonnage);
      set(a.els.vehicle_year, (row.vehicle_year === null || row.vehicle_year === undefined) ? '' : row.vehicle_year);
      set(a.els.vehicle_price, (row.vehicle_price === null || row.vehicle_price === undefined) ? '' : row.vehicle_price);
      set(a.els.boom_price, (row.boom_price === null || row.boom_price === undefined) ? '' : row.boom_price);
      set(a.els.bucket_price, (row.bucket_price === null || row.bucket_price === undefined) ? '' : row.bucket_price);
      setChk(a.els.is_active, String(row.is_active) !== '0');
      set(a.els.note, row.note || '');
    }
  };

  global.VehicleBaseDetail = Mod;

})(window);
