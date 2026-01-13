/* Path: Public/assets/js/vehicle_base_photo.js
 * 說明: 照片顯示（單張）
 */

(function (global) {
  'use strict';

  function fullUrl(p) {
    p = String(p || '');
    if (!p) return '';
    // photo_path 存 /uploads/...
    var b = '';
    try { b = global.BASE_URL || ''; } catch (e) { b = ''; }
    b = String(b || '').replace(/\/+$/, '');
    return b + p;
  }

  var Mod = {
    app: null,

    init: function (app) {
      this.app = app;
    },

    render: function (vehicle) {
      var img = this.app && this.app.els ? this.app.els.photoImg : null;
      var empty = this.app && this.app.els ? this.app.els.photoEmpty : null;
      if (!img || !empty) return;

      var path = vehicle ? (vehicle.photo_path || '') : '';
      if (!path) {
        img.style.display = 'none';
        img.removeAttribute('src');
        empty.style.display = 'block';
        return;
      }

      img.style.display = 'block';
      empty.style.display = 'none';
      img.src = fullUrl(path);
    }
  };

  global.VehicleBasePhoto = Mod;

})(window);
