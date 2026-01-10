/* Path: Public/assets/js/mat_edit_category_materials.js
 * 說明: 分類 ↔ 材料 對應維護
 */

(function (global) {
  'use strict';

  var API = '/api/mat/edit_category_materials';

  var Mod = {
    app: null,
    currentCategoryId: null,

    init: function (app) {
      this.app = app;
    },

    load: function (categoryId) {
      this.currentCategoryId = categoryId;
      apiGet(API + '?action=get&category_id=' + categoryId).then(function (res) {
        if (!res.success) {
          Toast.show({ type: 'danger', message: res.error });
          return;
        }
        MatEditUI.renderCategoryMaterials(categoryId, res.data || []);
      });
    },

    save: function (categoryId, materials) {
      apiPost(API, {
        action: 'save',
        category_id: categoryId,
        materials: materials
      }).then(function (res) {
        if (!res.success) {
          Toast.show({ type: 'danger', message: res.error });
        } else {
          Toast.show({ type: 'success', message: '已儲存分類材料' });
        }
      });
    }
  };

  global.MatEditCategoryMaterials = Mod;

})(window);
