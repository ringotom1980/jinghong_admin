/* Path: Public/assets/js/mat_edit_categories.js
 * 說明: 分類 CRUD + 排序
 */

(function (global) {
  'use strict';

  var API = '/api/mat/edit_categories';

  var Mod = {
    app: null,
    categories: [],

    init: function (app) {
      this.app = app;
      this.load();
    },

    load: function () {
      apiGet(API + '?action=list').then(function (res) {
        if (!res.success) {
          Toast.show({ type: 'danger', message: res.error });
          return;
        }
        Mod.categories = res.data || [];
        MatEditUI.renderCategories(Mod.categories);
      });
    },

    create: function (name) {
      apiPost(API, { action: 'create', name: name }).then(function (res) {
        if (!res.success) return Toast.show({ type: 'danger', message: res.error });
        Mod.load();
      });
    },

    update: function (id, name) {
      apiPost(API, { action: 'update', id: id, name: name }).then(function (res) {
        if (!res.success) Toast.show({ type: 'danger', message: res.error });
      });
    },

    remove: function (id) {
      Modal.confirmChoice(
        '刪除分類',
        '此分類將被刪除，對帳資料中的該分類數值也會一併清除。',
        function () {
          apiPost(API, { action: 'delete', id: id }).then(function (res) {
            if (!res.success) return Toast.show({ type: 'danger', message: res.error });
            Mod.load();
          });
        }
      );
    },

    sort: function (ids) {
      apiPost(API, { action: 'sort', ids: ids });
    }
  };

  global.MatEditCategories = Mod;

})(window);
