/* DutyCalc.online — Service Worker v2
 * Offline-first caching for core assets, network-first for HTML pages.
 * Version bump this constant (or the file) to invalidate old caches.
 *
 * v2: the CACHE string was never bumped past v1, and CORE listed style.css /
 * main.js / rate-data.js WITHOUT the "?v=" query they are actually requested
 * with, so those three precache entries could never be matched — dead weight
 * that also let a stale copy of an unversioned asset sit in the cache forever.
 * Asset caching is handled at fetch time by the cache-first branch below; the
 * bump here clears the old cache. */
var CACHE = 'dutycalc-v2';
var CORE = [
  '/',
  '/manifest.json',
  '/404.html',
  '/landed-cost-calculator',
  '/import-duty-calculator',
  '/vat-calculator',
  '/tariff-calculator',
  '/de-minimis-checker',
  '/de-minimis-value-guide'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(CORE).catch(function () { /* tolerate partial failure */ });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Versioned static assets (style.css?v=... / main.js?v=...) and sw assets: cache-first
  if (/\.(css|js)(\?|$)/.test(url.pathname) || url.pathname.indexOf('manifest.json') !== -1) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (resp) {
          if (resp && resp.status === 200) {
            var copy = resp.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return resp;
        });
      })
    );
    return;
  }

  // HTML pages: network-first, fall back to cache (offline)
  event.respondWith(
    fetch(req).then(function (resp) {
      if (resp && resp.status === 200) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return resp;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('/404.html');
      });
    })
  );
});
