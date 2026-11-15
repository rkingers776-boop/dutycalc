/* DutyCalc — "next step" block for calculator results.
 *
 * Why this is a separate file rather than part of main.js: four pages with
 * calculators (index, container-loading, customs-bond, volume-weight) do not
 * load main.js at all, and the result containers are not uniform — corridor
 * pages use .result-display, older ones use .calc-results or #calc-results.
 * A delegated listener plus an ancestor walk handles both without a per-page
 * markup edit, and without guessing at nested div boundaries.
 *
 * Submitting used to post the form natively, which navigates away to the
 * newsletter page — the reader loses the number they just calculated, at the
 * one moment they were most engaged. It now posts with fetch and answers
 * inline, keeping the result on screen.
 *
 * The native POST is still the fallback, and still the only path when JS never
 * ran. Both go to /api/subscribe — same origin, because the deployed CSP header
 * carries form-action 'self' and connect-src 'self' and would block anything
 * else.
 */
(function () {
    'use strict';

    // Result containers are not uniform. Corridor cards use .result-display,
    // older pages use .calc-results, and the five bespoke tools each invented
    // their own: cl-results, bond-results, vw-results, hs-results, id-result.
    // The suffix selectors cover that family without listing every page.
    var HOSTS = '.result-display, .calc-results, #calc-results, #calc-result, #results, ' +
                '[id$="-results"], [id$="-result"], [class$="-results"], ' +
                // Four pages recalculate as you type and ship no button at all:
                // landed-cost (lc-results-wrap), vat (vc-results-wrap), de minimis
                // (detector-results-panel) and sourcing-comparison (sc-result-card).
                // They are the highest-intent tools on the site, so they cannot be
                // the ones that silently miss the block.
                '[id$="-results-wrap"], [class$="-results-wrap"], ' +
                '[class$="-results-panel"], [class$="-result-card"], ' +
                // tariff-calculator calls the panel a dossier and the trigger a lookup.
                '#dossier';
    var ENDPOINT = '/api/subscribe';

    // Buttons likewise: .btn-calc, .calc-btn, cl-calc-btn, bond-calc-btn,
    // vw-calc-btn, hs-calc-btn, id-calc-btn. Class or id contains "calc-btn".
    function isCalcButton(el) {
        if (!el || el.nodeType !== 1) return false;
        var cls = (typeof el.className === 'string') ? el.className : '';
        var id = el.id || '';
        if (cls.indexOf('calc-btn') !== -1 || cls.indexOf('btn-calc') !== -1) return true;
        // "Look up rates" is the same action with a different label.
        return /-calc$/.test(id) || /-calc-btn$/.test(id) || /-lookup$/.test(id);
    }

    var CTA_HTML =
        '<div class="dc-next-step">' +
        '<p class="ns-title">This number holds only until the rate changes</p>' +
        '<p class="ns-body">Rates, de minimis thresholds and valuation rules here are re-checked against ' +
        'official sources, and the written pages carry the date of the last check. Get one email when the ' +
        'figures on this corridor move. No newsletter, no drip sequence.</p>' +
        '<form class="newsletter-form" method="post" action="' + ENDPOINT + '" data-surface="calc-cta">' +
        '<input type="email" name="email" placeholder="Your email address" required ' +
        'aria-label="Email for rate change alerts">' +
        '<input type="text" name="_honey" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<input type="hidden" name="_subject" value="DutyCalc - rate alert signup (calculator result)">' +
        '<input type="hidden" name="_template" value="table">' +
        '<input type="hidden" name="_captcha" value="false">' +
        '<button type="submit">Notify me</button>' +
        '</form>' +
        '<p class="ns-status subscribe-status" role="status" aria-live="polite"></p>' +
        '</div>';

    function findHost(btn) {
        var node = btn;
        while (node && node !== document.body) {
            var hit = node.querySelector(HOSTS);
            if (hit) return hit;
            node = node.parentNode;
        }
        return document.querySelector(HOSTS);
    }

    // Answer inline, fall back to the native POST only when the request
    // itself fails. Anything else would throw away an address the reader
    // already typed, which is the exact failure this whole path exists to end.
    function wire(form) {
        var input   = form.querySelector('input[type="email"]');
        var button  = form.querySelector('button[type="submit"]');
        var status  = form.parentNode ? form.parentNode.querySelector('.ns-status') : null;
        if (!input || !button) return;
        var settled = false;

        function say(msg, kind) {
            if (!status) return;
            status.textContent = msg;
            status.className = 'ns-status subscribe-status ' + kind;
            status.style.display = 'block';
        }

        form.addEventListener('submit', function (e) {
            var email = (input.value || '').trim();
            if (!email || email.indexOf('@') < 1) return;

            var trap = form.querySelector('input[name="_honey"]');
            if (trap && trap.value) { e.preventDefault(); return; }

            e.preventDefault();
            var label = button.textContent;
            button.disabled = true;
            button.textContent = 'Sending...';
            say('Sending...', 'pending');
            if (window.dcTrack) window.dcTrack('subscribe_submit', { surface: 'calc-cta' });

            function restore() {
                button.disabled = false;
                button.textContent = label;
            }

            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ email: email })
            })
            .then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (data) {
                var ok = data && (data.success === 'true' || data.success === true);
                if (!ok) throw new Error('rejected');
                settled = true;
                form.style.display = 'none';
                say('You are on the list. One email when a rate here changes.', 'ok');
                if (window.dcTrack) window.dcTrack('subscribe_success', { surface: 'calc-cta' });
            })
            .catch(function () {
                if (settled) return;
                settled = true;
                if (window.dcTrack) window.dcTrack('subscribe_fail', { surface: 'calc-cta', mode: 'native' });
                restore();
                // Prototype submit does not re-fire this handler.
                HTMLFormElement.prototype.submit.call(form);
            });
        });
    }

    function mount(btn) {
        mountAt(findHost(btn));
    }

    function mountAt(host) {
        if (!host || !host.parentNode) return;

        // One block per result container. Re-running a calculation must not
        // stack a second copy, and index.html carries several cards at once.
        var parent = host.parentNode;
        var next = host.nextElementSibling;
        if (next && next.classList && next.classList.contains('dc-next-step')) return;
        if (parent.querySelector('.dc-next-step') || host.querySelector('.dc-next-step')) return;

        parent.insertBefore(parse(CTA_HTML), host.nextSibling);

        var form = parent.querySelector('.dc-next-step form');
        if (form) wire(form);
        if (window.dcTrack) window.dcTrack('cta_view', { surface: 'calc-cta' });
    }

    function parse(html) {
        var d = document.createElement('div');
        d.innerHTML = html;
        return d.firstChild;
    }

    function onClick(e) {
        var t = e.target;
        while (t && t !== document.body) {
            if (isCalcButton(t)) {
                var btn = t;
                // Result writing happens in the same click handler; let it land
                // first so the block is placed after the panel is unhidden.
                setTimeout(function () { mount(btn); }, 180);
                return;
            }
            t = t.parentNode;
        }
    }

    // A panel that is already on screen has numbers the reader is looking at.
    // Height is the test, not a class: .visible / .result-hidden / inline styles
    // all differ per page, and a zero-height panel means nothing to react to yet.
    function mountVisible() {
        var hosts = document.querySelectorAll(HOSTS);
        for (var i = 0; i < hosts.length; i++) {
            var box = hosts[i].getBoundingClientRect();
            if (box.height < 1) continue;
            mountAt(hosts[i]);
        }
    }

    document.addEventListener('click', onClick, true);

    // Typing recalculates on the four no-button pages, so that is the moment
    // their numbers become worth reacting to.
    document.addEventListener('input', function (e) {
        var t = e.target;
        if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'SELECT')) return;
        setTimeout(mountVisible, 220);
    }, true);

    // Pages that print numbers on load never fire a click.
    document.addEventListener('DOMContentLoaded', function () {
        var autos = document.querySelectorAll('[data-autocalc]');
        for (var i = 0; i < autos.length; i++) {
            (function (el) { setTimeout(function () { mount(el); }, 250); })(autos[i]);
        }
        setTimeout(mountVisible, 500);
    });
})();
