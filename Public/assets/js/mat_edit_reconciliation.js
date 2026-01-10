/* Path: Public/assets/js/mat_edit_reconciliation.js
 * 說明: 分類 × 日期 對帳資料
 */

(function (global) {
  'use strict';

  var API = '/api/mat/edit_reconciliation';

  var Mod = {
    app: null,

    init: function (app) {
      this.app = app;
    },

    load: function (date) {
      if (!date) return;

      apiGet(API + '?action=get&withdraw_date=' + date).then(function (res) {
        if (!res.success) {
          Toast.show({ type: 'danger', message: res.error });
          return;
        }
        MatEditUI.renderReconciliation(date, res.data || {});
      });
    },

    save: function (date, values) {
      apiPost(API, {
        action: 'save',
        withdraw_date: date,
        values: values
      }).then(function (res) {
        if (!res.success) {
          Toast.show({ type: 'danger', message: res.error });
        } else {
          Toast.show({ type: 'success', message: '對帳資料已儲存' });
        }
      });
    }
  };

  global.MatEditReconciliation = Mod;

})(window);
