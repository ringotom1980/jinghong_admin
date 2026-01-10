/* Path: Public/assets/js/mat_edit_personnel.js
 * 說明: 班別承辦人維護（mat_personnel）
 */

(function (global) {
  'use strict';

  var API = '/api/mat/edit_personnel';

  var Mod = {
    app: null,

    init: function (app) {
      this.app = app;
      this.load();
    },

    load: function () {
      apiGet(API + '?action=get').then(function (res) {
        if (!res.success) {
          Toast.show({ type: 'danger', message: res.error });
          return;
        }
        MatEditUI.renderPersonnel(res.data || []);
      });
    },

    save: function (shift, name) {
      apiPost(API, {
        action: 'save',
        shift: shift,
        name: name
      }).then(function (res) {
        if (!res.success) {
          Toast.show({ type: 'danger', message: res.error });
        } else {
          Toast.show({ type: 'success', message: '承辦人已更新' });
        }
      });
    }
  };

  global.MatEditPersonnel = Mod;

})(window);
