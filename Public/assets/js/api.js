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

  // Limited to file uploads; the rest of the site keeps the existing fetch wrapper.
  global.apiUploadForm = function (url, formData, observers) {
    observers = observers || {};
    return new Promise(function (resolve) {
      var xhr = new XMLHttpRequest();
      function notify(name, value) {
        try { if (typeof observers[name] === 'function') observers[name](value); } catch (_) { /* UI observers cannot break transport. */ }
      }
      function failure(message) { resolve({ success: false, data: null, error: message }); }
      xhr.open('POST', joinUrl(url), true);
      // Same-origin session cookies are sent by XHR by default, like credentials:same-origin.
      xhr.withCredentials = false;
      xhr.upload.onprogress = function (event) { notify('progress', event); };
      xhr.upload.onload = function () { notify('processing'); };
      xhr.onload = function () {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch (_) { failure('API 回傳非 JSON（可能 302/HTML）'); }
      };
      xhr.onerror = function () { failure('Network error'); };
      xhr.onabort = function () { failure('上傳連線中斷'); };
      xhr.ontimeout = function () { failure('上傳連線逾時'); };
      // Browser owns the multipart boundary; no new tokens or headers are introduced.
      try { xhr.send(formData); } catch (error) { failure(error.message || 'Network error'); }
    });
  };

  global.apiRequest = request;
  global.apiGet = function (url, params) {
    // params -> querystring
    if (params && typeof params === 'object') {
      var sp = new URLSearchParams();
      Object.keys(params).forEach(function (k) {
        var v = params[k];
        if (v === undefined || v === null || v === '') return;
        sp.append(k, String(v));
      });
      var qs = sp.toString();
      if (qs) url += (String(url).indexOf('?') >= 0 ? '&' : '?') + qs;
    }
    return request({ url: url, method: 'GET' });
  };

  global.apiPost = function (url, body) { return request({ url: url, method: 'POST', body: body }); };
  global.apiPostForm = function (url, formData) { return request({ url: url, method: 'POST', body: formData }); };

})(window);
