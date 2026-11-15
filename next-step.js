/* DutyCalc — "next step" block for calculator results.
 *
 * Why this is a separate file rather than part of main.js: four pages with
 * calculators (index, container-loading, customs-bond, volume-weight) do not
 * load main.js at all, and the result containers are not uniform — corridor
 * pages use .result-display, older ones use .calc-results or #calc-results.
 * A delegated listener plus an ancestor walk handles both without a per-page
 * markup edit, and without guessing at nested div boundaries.
 *
 * The form posts natively rather than through fetch. That is deliberate: this
 * block appears on pages with no other JS wiring, so it has to work when
 * nothing else loaded. The CSP allows form-action to formsubmit.co, and the
 * confirmation screen doubles as proof that the address was accepted.
 */
(function () {
    'use strict';

    // Result containers are not uniform. Corridor cards use .result-display,
    // older pages use .calc-results, and the five bespoke tools each invented
    // their own: cl-results, bond-results, vw-results, hs-results, id-result.
    // The suffix selectors cover that family without listing every page.
    var HOSTS = '.result-display, .calc-results, #calc-results, #calc-result, #results, ' +
                '[id$="-results"], [id$="-result"], [class$="-results"]';
    var ENDPOINT = 'https://formsubmit.co/admin@dutycalc.online';

    // Buttons likewise: .btn-calc, .calc-btn, cl-calc-btn, bond-calc-btn,
    // vw-calc-btn, hs-calc-btn, id-calc-btn. Class or id contains "calc-btn".
    function isCalcButton(el) {
        if (!el || el.nodeType !== 1) return false;
        var cls = (typeof el.className === 'string') ? el.className : '';
        var id = el.id || '';
        if (cls.indexOf('calc-btn') !== -1 || cls.indexOf('btn-calc') !== -1) return true;
        return /-calc$/.test(id) || /-calc-btn$/.test(id);
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

    function mount(btn) {
        var host = findHost(btn);
        if (!host || !host.parentNode) return;

        // One block per result container. Re-running a calculation must not
        // stack a second copy, and index.html carries several cards at once.
        var parent = host.parentNode;
        var next = host.nextElementSibling;
        if (next && next.classList && next.classList.contains('dc-next-step')) return;
        if (parent.querySelector('.dc-next-step')) return;

        parent.insertBefore(parse(CTA_HTML), host.nextSibling);

        var form = parent.querySelector('.dc-next-step form');
        if (form) {
            form.addEventListener('submit', function () {
                if (window.dcTrack) window.dcTrack('subscribe_submit', { surface: 'calc-cta' });
            });
        }
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

    document.addEventListener('click', onClick, true);

    // Pages that print numbers on load never fire a click.
    document.addEventListener('DOMContentLoaded', function () {
        var autos = document.querySelectorAll('[data-autocalc]');
        for (var i = 0; i < autos.length; i++) {
            (function (el) { setTimeout(function () { mount(el); }, 250); })(autos[i]);
        }
    });
})();
