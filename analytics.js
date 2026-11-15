/* DutyCalc — one analytics entry point for all 89 pages.
 *
 * Two problems this solves at once:
 *
 *   1. Nothing was measured. "Which of the calculators actually gets used" and
 *      "does the subscribe CTA convert" were both guesswork, because five pages
 *      had a script tag that turned out to be the English word "plausible" in
 *      body copy rather than a tracker.
 *
 *   2. Provider choice should be one string, not 89 edited files. The provider
 *      is read from <meta name="dc-analytics">:
 *
 *        umami:<website-id>   Umami Cloud. Custom events supported -> preferred,
 *                             because pageviews alone cannot answer "did anyone
 *                             run the GCC calculator".
 *        cf:<beacon-token>    Cloudflare Web Analytics. Pageviews only.
 *        empty or absent      Loads nothing at all. dcTrack() stays a no-op, so
 *                             the call sites can ship before the account does.
 *
 * Page identity comes from location.pathname rather than another meta tag, so
 * adding a page needs no second edit. sw.js serves *.js cache-first, which is
 * why every page references this file with a ?v= stamp maintained by build.ps1.
 */
(function () {
    'use strict';

    var conf = '';
    var meta = document.querySelector('meta[name="dc-analytics"]');
    if (meta) conf = (meta.getAttribute('content') || '').trim();

    var page = (function () {
        var p = location.pathname.replace(/\/+$/, '');
        p = p.replace(/^\/|\/index\.html$/g, '');
        return p || 'home';
    })();

    var pending = [];
    var flushed = false;
    var provider = conf.split(':')[0] || '';

    function push(name, props) {
        var payload = props || {};
        if (!payload.page) payload.page = page;
        if (provider === 'umami' && window.umami && typeof window.umami.track === 'function') {
            try { window.umami.track(name, payload); } catch (e) { /* tracker must never break the page */ }
            return true;
        }
        return false;
    }

    // Public API. Safe to call on every page whether or not a provider exists.
    window.dcTrack = function (name, props) {
        if (!conf) return;
        if (push(name, props)) return;
        pending.push([name, props]);
        // Bound the queue so a failing provider cannot grow memory without limit.
        if (pending.length > 60) pending.shift();
    };

    function flush() {
        if (flushed) return;
        flushed = true;
        var q = pending;
        pending = [];
        for (var i = 0; i < q.length; i++) push(q[i][0], q[i][1]);
    }

    if (!conf) return;

    var src, attrs;
    if (provider === 'umami') {
        src = 'https://cloud.umami.is/script.js';
        attrs = { 'data-website-id': conf.slice(6), 'data-auto-track': 'true' };
    } else if (provider === 'cf') {
        src = 'https://static.cloudflareinsights.com/beacon.min.js';
        attrs = { 'data-cf-beacon': JSON.stringify({ token: conf.slice(3) }) };
    } else {
        return;
    }

    var s = document.createElement('script');
    s.defer = true;
    s.src = src;
    s.onload = flush;
    for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) s.setAttribute(k, attrs[k]);
    }
    (document.head || document.documentElement).appendChild(s);
})();
