/* Path: Public/assets/js/pole_geolocate.js
 * 說明: 公開電桿地圖 - 手機自動定位（自動取定位 + fallback + logo pulse marker）
 * 規格：
 * 1) 載入頁面即嘗試取得定位；失敗/拒絕/timeout → fallback 座標
 * 2) 不提供「目前位置」按鈕
 * 3) 目前位置用 logo marker + 心臟跳動擴散效果
 * 4) 獨立檔案控制，pole_map.js 只做最小 init 串接
 */

(function (global) {
    'use strict';

    function isNum(v) { return typeof v === 'number' && isFinite(v); }

    var PoleGeolocate = {
        _map: null,
        _L: null,

        _fallback: { lat: 24.581154760722175, lng: 120.8326942049064 },
        _zoom: 15,

        _logoUrl: '',
        _marker: null,

        init: function (opts) {
            opts = opts || {};
            this._map = opts.map || null;
            this._L = opts.L || global.L || null;

            if (!this._map || !this._L) return;

            if (opts.fallback && isNum(opts.fallback.lat) && isNum(opts.fallback.lng)) {
                this._fallback = { lat: opts.fallback.lat, lng: opts.fallback.lng };
            }
            if (isNum(opts.zoom)) this._zoom = Number(opts.zoom);

            this._logoUrl = String(opts.logoUrl || global.POLE_LOGO_URL || '').trim();

            // 進場：先嘗試抓定位；失敗/拒絕/timeout 才 fallback
            this._tryGeolocation();
        },

        _tryGeolocation: function () {
            var self = this;

            if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== 'function') {
                // 不支援 → 直接使用 fallback（含 marker）
                self._applyFallback();
                return;
            }

            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    var lat = pos && pos.coords ? Number(pos.coords.latitude) : NaN;
                    var lng = pos && pos.coords ? Number(pos.coords.longitude) : NaN;
                    if (!isNum(lat) || !isNum(lng)) {
                        self._applyFallback();
                        return;
                    }

                    self._applyCenter(lat, lng, self._zoom, true);
                    self._setMyMarker(lat, lng);
                },
                function () {
                    self._applyFallback();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 30000
                }
            );
        },

        _applyFallback: function () {
            this._applyCenter(this._fallback.lat, this._fallback.lng, this._zoom, false);
            this._setMyMarker(this._fallback.lat, this._fallback.lng);
        },

        _applyCenter: function (lat, lng, zoom, animate) {
            try {
                this._map.setView([lat, lng], zoom, { animate: !!animate });
            } catch (e) {
                // ignore
            }
        },

        _setMyMarker: function (lat, lng) {
            var L = this._L;
            if (!L) return;

            // 建立/更新「目前位置」marker（logo + pulse）
            var html = ''
                + '<div class="pole-mypos">'
                + '  <span class="pole-mypos__pulse"></span>'
                + '  <span class="pole-mypos__pulse pole-mypos__pulse--2"></span>'
                + '  <span class="pole-mypos__dot">'
                + (this._logoUrl
                    ? ('<img class="pole-mypos__logo" alt="me" src="' + this._escapeAttr(this._logoUrl) + '">')
                    : '<span class="pole-mypos__fallbackDot"></span>')
                + '  </span>'
                + '</div>';

            var icon = L.divIcon({
                className: 'pole-mypos-icon',
                html: html,
                iconSize: [44, 44],
                iconAnchor: [22, 22]
            });

            if (!this._marker) {
                this._marker = L.marker([lat, lng], { icon: icon, interactive: false, keyboard: false });
                this._marker.addTo(this._map);
            } else {
                this._marker.setLatLng([lat, lng]);
                this._marker.setIcon(icon);
            }
        },

        _escapeAttr: function (s) {
            return String(s || '')
                .replaceAll('&', '&amp;')
                .replaceAll('"', '&quot;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll("'", '&#39;');
        }
    };

    global.PoleGeolocate = PoleGeolocate;
})(window);
