/* Path: Public/assets/js/mat_edit_ui.js
 * 說明: /mat/edit UI 層
 * - DOM render
 * - 不直接呼叫 API
 */

(function (global) {
  'use strict';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  var UI = {

    init: function (app) {
      this.app = app;

      var dateInput = qs('#meWithdrawDate');
      if (dateInput) {
        dateInput.addEventListener('change', function () {
          app.setDate(this.value);
        });
      }
    },

    renderCategories: function (list) {
      // 預留：由你前端版型實作
    },

    renderCategoryMaterials: function (categoryId, materials) {
      // 預留：分類材料 UI
    },

    renderReconciliation: function (date, values) {
      // 預留：分類 × 日期 對帳欄位
    },

    renderPersonnel: function (rows) {
      // 預留：承辦人表單
    }
  };

  global.MatEditUI = UI;

})(window);
