/* Path: Public/assets/js/api.js
 * 說明: 統一 API 呼叫（回傳整包 JSON：{success,data,error}）
 * - 使用 window.BASE_URL
 * - 支援 JSON / FormData
 */

(function (global) {
  'use strict';

  function base() {
    var b = '';
    try { b = global.BASE_URL || ''; } catch (e) { b = ''; }
    if (!b) return '';
    return String(b).replace(/\/+$/, '');
  }

  function joinUrl(path) {
    path = String(path || '');
    if (path.charAt(0) !== '/') path = '/' + path;
    return base() + path;
  }

  function request(opts) {
    opts = opts || {};
    var url = joinUrl(opts.url || '/');
    var method = (opts.method || 'GET').toUpperCase();
    var body = opts.body || null;
    var headers = opts.headers || {};
    var isForm = (body && (typeof FormData !== 'undefined') && (body instanceof FormData));

    var fetchOpts = {
      method: method,
      credentials: 'same-origin',
      headers: headers
    };

    if (method !== 'GET' && method !== 'HEAD') {
      if (isForm) {
        fetchOpts.body = body;
      } else if (body !== null && body !== undefined) {
        fetchOpts.headers['Content-Type'] = 'application/json; charset=utf-8';
        fetchOpts.body = JSON.stringify(body);
      }
    }

    return fetch(url, fetchOpts)
      .then(function (res) {
        return res.json().catch(function () {
          return { success: false, data: null, error: 'API 回傳非 JSON（可能 302/HTML）' };
        });
      })
      .catch(function (e) {
        return { success: false, data: null, error: (e && e.message) ? e.message : 'Network error' };
      });
  }

  global.apiRequest = request;
  global.apiGet = function (url) { return request({ url: url, method: 'GET' }); };
  global.apiPost = function (url, body) { return request({ url: url, method: 'POST', body: body }); };
  global.apiPostForm = function (url, formData) { return request({ url: url, method: 'POST', body: formData }); };

})(window);
