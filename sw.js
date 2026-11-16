/* Service Worker: macht die App offline nutzbar.
 * Strategie "Netz zuerst": online kommt immer die aktuelle Version, offline der zuletzt geladene Stand aus dem Cache.
 * Bei Änderungen CACHE erhöhen und ?v= in index.html/tests.html anpassen. */
var CACHE = 'schallschutz-v1';
var DATEIEN = ['./', './index.html', './app.css', './data.js', './calc.js', './app.js', './manifest.json',
  './icon.svg', './icon-192.png', './icon-512.png', './skizzen.svg', './tests.html', './tests.js'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(DATEIEN); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./index.html'); });
  }));
});
