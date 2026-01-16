/* Path: Public/assets/js/car_base_photo.js
 * 說明: 照片（顯示、覆蓋上傳、預覽、cache-busting）
 */

(function (global) {
  'use strict';

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function setBtnLoading(btn, on) {
    if (!btn) return;
    btn.classList.toggle('is-loading', !!on);
    btn.disabled = !!on;
  }

  var Mod = {
    app: null,
    img: null,
    empty: null,
    file: null,
    pickBtn: null,
    uploadBtn: null,
    _pickedFile: null,

    init: function (app) {
      this.app = app;

      this.img = qs('#carbPhotoImg');
      this.empty = qs('#carbPhotoEmpty');
      this.file = qs('#carbPhotoFile');
      this.pickBtn = qs('#carbPhotoPickBtn');
      this.uploadBtn = qs('#carbPhotoUploadBtn');

      var self = this;

      if (this.pickBtn && this.file) {
        this.pickBtn.addEventListener('click', function () {
          if (self.pickBtn.disabled) return;
          self.file.click();
        });
      }

      if (this.file) {
        this.file.addEventListener('change', function () {
          var f = self.file.files && self.file.files[0] ? self.file.files[0] : null;
          self._pickedFile = f || null;

          if (f && self.img) {
            var url = URL.createObjectURL(f);
            self.img.src = url;
            if (self.empty) self.empty.hidden = true;
          }
          if (self.uploadBtn) self.uploadBtn.disabled = !(self.app.state.activeId && self._pickedFile);
        });
      }

      if (this.uploadBtn) {
        this.uploadBtn.addEventListener('click', function () {
          self.upload();
        });
      }

      this.setEnabled(false);
    },

    setEnabled: function (enabled) {
      enabled = !!enabled;
      if (this.pickBtn) this.pickBtn.disabled = !enabled;
      if (this.uploadBtn) this.uploadBtn.disabled = !enabled || !this._pickedFile;
    },

    bindData: function (payload) {
      payload = payload || {};
      var v = payload.vehicle || null;

      var self = this;

      // 回傳 Promise：讓外部可以等照片載入後再關遮罩
      return new Promise(function (resolve) {
        self._pickedFile = null;
        if (self.file) self.file.value = '';

        if (!v) {
          if (self.img) self.img.removeAttribute('src');
          if (self.empty) self.empty.hidden = false;
          self.setEnabled(false);
          resolve(true);
          return;
        }

        // 顯示目前照片（若有）
        var p = v.photo_url || '';
        if (!p) {
          if (self.img) self.img.removeAttribute('src');
          if (self.empty) self.empty.hidden = false;
          self.setEnabled(true);
          resolve(true);
          return;
        }

        // ✅ 等圖片 load / error 再 resolve
        if (self.img) {
          self.img.onload = function () {
            if (self.empty) self.empty.hidden = true;   // ✅ 圖片真的成功後再保險關一次
            resolve(true);
          };
          self.img.onerror = function () {
            if (self.empty) self.empty.hidden = false;  // ✅ 載入失敗就顯示提示
            resolve(true);
          };

          // 先假設有圖：先把 empty 關掉，避免閃爍
          if (self.empty) self.empty.hidden = true;

          self.img.src = p;

          // 若瀏覽器快取直接完成，主動走一次 onload 的效果
          if (self.img.complete) {
            if (self.empty) self.empty.hidden = true;
            resolve(true);
          }
        } else {
          // 沒 img 元素就只能顯示提示
          if (self.empty) self.empty.hidden = false;
          resolve(true);
        }

        if (self.empty) self.empty.hidden = true;
        self.setEnabled(true);
      });
    },

    upload: function () {
      var self = this;
      var vid = Number(this.app.state.activeId || 0);
      if (!vid) return;

      if (!this._pickedFile) {
        Toast && Toast.show({ type: 'warning', title: '缺少檔案', message: '請先選擇照片' });
        return;
      }

      var fd = new FormData();
      fd.append('id', String(vid));
      fd.append('photo', this._pickedFile);

      setBtnLoading(this.uploadBtn, true);

      return apiPostForm('/api/car/car_photo_upload', fd)
        .then(function (j) {
          setBtnLoading(self.uploadBtn, false);

          if (!j || !j.success) {
            Toast && Toast.show({ type: 'danger', title: '上傳失敗', message: (j && j.error) ? j.error : '未知錯誤' });
            return;
          }

          Toast && Toast.show({ type: 'success', title: '已更新', message: '照片已覆蓋上傳' });

          // 更新 state.active.vehicle.photo_url
          if (self.app.state.active && self.app.state.active.vehicle && j.data && j.data.photo_url) {
            self.app.state.active.vehicle.photo_url = j.data.photo_url;
          }

          // reload img with cache-busting url
          if (self.img && j.data && j.data.photo_url) {
            self.img.src = j.data.photo_url;
            if (self.empty) self.empty.hidden = true;
          }

          self._pickedFile = null;
          if (self.file) self.file.value = '';
          self.setEnabled(true);
        })
        .catch(function (e) {
          setBtnLoading(self.uploadBtn, false);
          Toast && Toast.show({ type: 'danger', title: '上傳失敗', message: (e && e.message) ? e.message : '未知錯誤' });
        });
    }
  };

  global.CarBasePhoto = Mod;

})(window);
