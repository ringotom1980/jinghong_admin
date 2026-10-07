/* Path: Public/assets/js/pole_map.js
 * 說明: 公開電桿地圖控制器（搜尋 / 建議 / 定位 / 導航）
 * - Leaflet + Carto Positron
 * - autocomplete >=2、debounce 300ms、最多 10
 * - 點選後 setView zoom=17 + marker
 * - 一鍵 Google Maps 導航（URL）
 */

(function () {
    'use strict';

    function qs(sel, root) { return (root || document).querySelector(sel); }
    function escapeHtml(s) {
        return String(s || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function debounce(fn, wait) {
        var t = null;
        return function () {
            var args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(null, args); }, wait);
        };
    }

    function apiUrl(path) {
        var base = (window.BASE_URL || '').replace(/\/+$/, '');
        path = String(path || '');
        if (!path.startsWith('/')) path = '/' + path;
        return base + path;
    }

    // --- DOM
    var inputEl = qs('#poleSearchInput');
    var clearEl = qs('#poleSearchClear');
    var wrapEl = qs('#poleSuggestWrap');
    var listEl = qs('#poleSuggestList');
    var navBtn = qs('#poleNavBtn');
    var pickedMetaEl = qs('#polePickedMeta');
    var pickedPoleEl = qs('#polePickedPoleNo');
    var pickedAddrEl = qs('#polePickedAddr');
    // --- iOS keyboard viewport fix (avoid 100vh stuck)
    function setVhVar() {
        var h = window.innerHeight || document.documentElement.clientHeight || 0;
        document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
    }
    setVhVar();
    window.addEventListener('resize', setVhVar);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setVhVar);
        window.visualViewport.addEventListener('scroll', setVhVar);
    }

    // --- Map
    var map = L.map('map', { zoomControl: true });

    // --- Base layers (Voyager default + Positron optional)
    var baseVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });

    var basePositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    });

    // ✅ Default: Voyager
    baseVoyager.addTo(map);

    // ✅ Layer switcher（放在縮放按鈕下方同側）
    L.control.layers(
        { 'Voyager': baseVoyager, 'Positron': basePositron },
        null,
        { position: 'topleft' }
    ).addTo(map);

    // ✅ fallback（桌機永遠用；手機先定位失敗才用）
    var FALLBACK = { lat: 24.581154760722175, lng: 120.8326942049064 };
    var FALLBACK_ZOOM = 15;

    // ✅ 只用 UA 判斷「真手機」：避免觸控筆電誤判
    var ua = String(navigator.userAgent || '');
    var isRealMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (!isRealMobile) {
        // =========================
        // 🖥 桌機模式
        // =========================
        // 1️⃣ 視角只在這裡設定一次（永遠 fallback）
        map.setView([FALLBACK.lat, FALLBACK.lng], FALLBACK_ZOOM);

        // 2️⃣ 只畫「目前點」marker（不定位、不 setView）
        if (window.PoleGeolocate && typeof window.PoleGeolocate.init === 'function') {
            window.PoleGeolocate.init({
                map: map,
                L: L,
                fallback: FALLBACK,
                zoom: FALLBACK_ZOOM,
                logoUrl: (window.POLE_LOGO_URL || ''),
                markerOnly: true   // ✅ 關鍵：只畫 marker，完全不碰視角
            });
        }

    } else {
        // =========================
        // 📱 手機模式
        // =========================
        // 交給 PoleGeolocate：
        // - 先嘗試定位
        // - 成功 → 定位點 + marker
        // - 失敗 → fallback + marker
        if (window.PoleGeolocate && typeof window.PoleGeolocate.init === 'function') {
            window.PoleGeolocate.init({
                map: map,
                L: L,
                fallback: FALLBACK,
                zoom: FALLBACK_ZOOM,
                logoUrl: (window.POLE_LOGO_URL || '')
            });
        } else {
            // 保底（理論上不會發生）
            map.setView([FALLBACK.lat, FALLBACK.lng], FALLBACK_ZOOM);
        }
    }

    var picked = { lat: null, lng: null, label: '' };
    var marker = null;

    function setNavVisible(visible) {
        if (!navBtn) return;
        if (visible) {
            navBtn.hidden = false;
        } else {
            navBtn.hidden = true;
        }
    }

    // 初始：導覽按鈕不顯示
    setNavVisible(false);

    function setPicked(item) {
        if (!item || typeof item.lat !== 'number' || typeof item.lng !== 'number') return;

        picked.lat = item.lat;
        picked.lng = item.lng;
        picked.label = item.label || '';

        if (marker) map.removeLayer(marker);
        marker = L.marker([picked.lat, picked.lng]).addTo(map);

        map.setView([picked.lat, picked.lng], 17, { animate: true });
        // ✅ 選到項目後：回填輸入框顯示文字
        if (inputEl) {
            inputEl.value = String(item.display || item.label || '').trim();
        }
        // ✅ 顯示「桿號 / 地址」在搜尋框下方
        if (pickedMetaEl) {
            var pn = String(item.pole_no || '').trim();
            var ad = String(item.address || '').trim();

            if (pickedPoleEl) pickedPoleEl.textContent = pn || '—';
            if (pickedAddrEl) pickedAddrEl.textContent = ad || '—';

            pickedMetaEl.hidden = false;
        }

        // ✅ 選到點後才顯示「用 Google 導航」
        setNavVisible(true);

        hideSuggest();
    }

    function hideSuggest() {
        if (!wrapEl) return;
        wrapEl.hidden = true;
        if (listEl) listEl.innerHTML = '';
    }

    function showSuggest(items) {
        if (!wrapEl || !listEl) return;

        if (!Array.isArray(items) || items.length === 0) {
            hideSuggest();
            return;
        }

        var html = '';
        for (var i = 0; i < items.length; i++) {
            var it = items[i] || {};
            var label = String(it.label || '');
            var mapRef = String(it.map_ref || '');
            var poleNo = String(it.pole_no || '');
            var addr = String(it.address || '');
            var lat = (typeof it.lat === 'number') ? it.lat : null;
            var lng = (typeof it.lng === 'number') ? it.lng : null;
            var displayText = String(mapRef || poleNo || label || '');

            html += ''
                + '<li class="pole-suggest__item" role="option" tabindex="0"'
                + ' data-lat="' + escapeHtml(lat) + '"'
                + ' data-lng="' + escapeHtml(lng) + '"'
                + ' data-label="' + escapeHtml(label) + '"'
                + ' data-display="' + escapeHtml(displayText) + '"'
                + ' data-pole="' + escapeHtml(poleNo) + '"'
                + ' data-addr="' + escapeHtml(addr) + '">'
                + '<div class="pole-suggest__title">' + escapeHtml(mapRef || label) + '</div>'
                + '<div class="pole-suggest__meta">'
                + (poleNo ? ('桿號：' + escapeHtml(poleNo) + '　') : '')
                + (addr ? ('地址：' + escapeHtml(addr)) : '')
                + '</div>'
                + '</li>';
        }

        listEl.innerHTML = html;
        wrapEl.hidden = false;
    }

    function fetchSuggest(q) {
        var url = apiUrl('/api/public/pole/suggest') + '?q=' + encodeURIComponent(q);

        return fetch(url, { method: 'GET', credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (j) {
                if (!j || j.success !== true || !Array.isArray(j.data)) return [];
                return j.data.slice(0, 10);
            })
            .catch(function () { return []; });
    }

    var onInput = debounce(function () {
        var q = (inputEl && inputEl.value) ? String(inputEl.value).trim() : '';
        if (q.length < 2) {
            hideSuggest();
            return;
        }
        fetchSuggest(q).then(showSuggest);
    }, 300);

    if (inputEl) {
        inputEl.addEventListener('input', onInput);

        // iOS Safari: focus 時會自行縮放/位移 viewport（即使 overflow:hidden）
        // 解法：focus 暫時鎖 meta viewport + 用 visualViewport 把 pageTop 拉回 0；blur 還原
        var _vpMeta = document.querySelector('meta[name="viewport"]');
        var _vpOrig = _vpMeta ? (_vpMeta.getAttribute('content') || '') : '';
        var _vvTimer = null;

        function _lockViewportForIOS() {
            if (!_vpMeta) return;
            // focus 才鎖，避免影響平常 pinch-zoom（地圖操作）
            _vpMeta.setAttribute(
                'content',
                'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
            );
        }

        function _restoreViewport() {
            if (!_vpMeta) return;
            _vpMeta.setAttribute('content', _vpOrig);
        }

        function _startVVGuard() {
            if (!window.visualViewport) return;
            if (_vvTimer) return;

            _vvTimer = window.setInterval(function () {
                // iOS 會把 visual viewport 往下推（pageTop > 0），這時把它拉回去
                // 注意：scrollY 可能仍是 0，所以要看 visualViewport.pageTop
                var vt = window.visualViewport.pageTop || 0;
                if (vt > 0) {
                    window.scrollTo(0, 0);
                }
            }, 50);
        }

        function _stopVVGuard() {
            if (_vvTimer) {
                window.clearInterval(_vvTimer);
                _vvTimer = null;
            }
        }

        inputEl.addEventListener('focus', function () {
            setVhVar();
            onInput();

            // 記住原本位置（雖然這頁通常 scrollY=0，但保留）
            inputEl._prevScrollY = window.scrollY || 0;

            // 只對 iOS 做 viewport lock（避免影響 Android/桌機）
            var ua = String(navigator.userAgent || '');
            var isIOS = /iPhone|iPad|iPod/i.test(ua);

            if (isIOS) {
                _lockViewportForIOS();
                _startVVGuard();
            }
        });

        inputEl.addEventListener('blur', function () {
            setTimeout(function () {
                setVhVar();

                // 還原 viewport（恢復 pinch-zoom）
                _stopVVGuard();
                _restoreViewport();

                // 回到 focus 前的位置（保底）
                window.scrollTo(0, inputEl._prevScrollY || 0);

                map.invalidateSize(true);
            }, 150);
        });
    }

    if (clearEl) {
        clearEl.addEventListener('click', function () {
            if (inputEl) inputEl.value = '';
            hideSuggest();
            // ✅ 清除後：把「桿號/地址」資訊列一起收起來
            if (pickedMetaEl) pickedMetaEl.hidden = true;
            if (pickedPoleEl) pickedPoleEl.textContent = '';
            if (pickedAddrEl) pickedAddrEl.textContent = '';

            // ✅ 清除後：導覽按鈕回到不顯示
            setNavVisible(false);

            picked.lat = picked.lng = null;
            picked.label = '';

            if (marker) {
                map.removeLayer(marker);
                marker = null;
            }
            if (inputEl) inputEl.focus();
        });
    }

    if (listEl) {
        listEl.addEventListener('click', function (e) {
            var li = e.target && e.target.closest ? e.target.closest('.pole-suggest__item') : null;
            if (!li) return;

            var lat = Number(li.getAttribute('data-lat'));
            var lng = Number(li.getAttribute('data-lng'));
            var label = li.getAttribute('data-label') || '';
            var display = li.getAttribute('data-display') || label;
            var poleNo = li.getAttribute('data-pole') || '';
            var addr = li.getAttribute('data-addr') || '';
            if (!isFinite(lat) || !isFinite(lng)) return;
            setPicked({ lat: lat, lng: lng, label: label, display: display, pole_no: poleNo, address: addr });
        });

        listEl.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            var li = e.target && e.target.classList && e.target.classList.contains('pole-suggest__item') ? e.target : null;
            if (!li) return;

            var lat = Number(li.getAttribute('data-lat'));
            var lng = Number(li.getAttribute('data-lng'));
            var label = li.getAttribute('data-label') || '';
            var display = li.getAttribute('data-display') || label;
            var poleNo = li.getAttribute('data-pole') || '';
            var addr = li.getAttribute('data-addr') || '';
            if (!isFinite(lat) || !isFinite(lng)) return;
            setPicked({ lat: lat, lng: lng, label: label, display: display, pole_no: poleNo, address: addr });
        });
    }

    if (navBtn) {
        navBtn.addEventListener('click', function () {
            if (!isFinite(picked.lat) || !isFinite(picked.lng)) return;

            var url = 'https://www.google.com/maps/dir/?api=1'
                + '&destination=' + encodeURIComponent(picked.lat + ',' + picked.lng)
                + '&travelmode=driving';

            window.open(url, '_blank', 'noopener');
        });
    }

    map.on('click', function () { hideSuggest(); });
})();
