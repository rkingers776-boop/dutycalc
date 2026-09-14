// dutycalc.online — Production Grade Pure Static Client-Side Tariff Engine
// v3.0 — Rate verification timestamps, intelligence cross-linking,
//        risk notes, newsletter handler, freshness indicators.

(function () {
    'use strict';

    var MAX_INPUT_VALUE = 99999999;

    // ── CORE DUTY CALCULATION ENGINE ─────────────────────
    function globalDutyCalc(buttonElement) {
        var card = buttonElement.closest('.calculator-card');
        if (!card) return;

        var dutyRate   = parseFloat(card.getAttribute('data-duty-rate')) || 0;
        var vatRate    = parseFloat(card.getAttribute('data-vat-rate')) || 0;
        var deMinimis  = parseFloat(card.getAttribute('data-deminimis')) || 0;
        var vatDeMinimis = 0;
        if (card.hasAttribute('data-vat-deminimis')) {
            vatDeMinimis = parseFloat(card.getAttribute('data-vat-deminimis')) || 0;
        }
        // Threshold base: 'fob' (default, goods value only) or 'cif' (goods + shipping,
        // required for UK £135 consignment rule and Japan ¥10,000 CIF rule)
        var thresholdBase = card.getAttribute('data-threshold-base') || 'fob';

        var itemValue    = parseFloat(card.querySelector('.item-value').value);
        var shippingCost = parseFloat(card.querySelector('.shipping-cost').value) || 0;

        if (isNaN(itemValue) || itemValue <= 0) {
            alert("Please enter a valid item value greater than zero.");
            return;
        }
        if (itemValue > MAX_INPUT_VALUE) {
            alert("Please enter an item value no larger than " + MAX_INPUT_VALUE.toLocaleString() + ".");
            return;
        }
        if (shippingCost > MAX_INPUT_VALUE) {
            alert("Please enter a shipping cost no larger than " + MAX_INPUT_VALUE.toLocaleString() + ".");
            return;
        }

        var totalCIF       = itemValue + shippingCost;
        var calculatedDuty = 0;
        var calculatedVAT  = 0;
        // De minimis is tested against the correct base: UK/Japan compare CIF (incl. freight)
        var dmBase = thresholdBase === 'cif' ? totalCIF : itemValue;

        if (dmBase > deMinimis) {
            calculatedDuty = totalCIF * (dutyRate / 100);
        }
        if (dmBase > vatDeMinimis) {
            calculatedVAT = (totalCIF + calculatedDuty) * (vatRate / 100);
        }

        var totalTax        = calculatedDuty + calculatedVAT;
        var finalLandedCost = totalCIF + totalTax;

        var sym = getCurrencySymbol(card);
        var resultBox = card.querySelector('.result-display');
        if (resultBox && !resultBox.hasAttribute('role')) {
            resultBox.setAttribute('role', 'status');
            resultBox.setAttribute('aria-live', 'polite');
        }
        // Null-safe result fill — some corridor cards expose only a subset of fields
        function setRes(sel, val) {
            var el = card.querySelector(sel);
            if (el) el.innerText = val;
        }
        setRes('.res-duty',      sym + calculatedDuty.toFixed(2));
        setRes('.res-vat',       sym + calculatedVAT.toFixed(2));
        setRes('.res-total-tax', sym + totalTax.toFixed(2));
        setRes('.res-landed',    sym + finalLandedCost.toFixed(2));

        resultBox.classList.remove('result-hidden');

        // Show relevant intelligence cross-link after calculation
        renderResultIntel(card);
    }

    // ── CURRENCY SYMBOL RESOLUTION ────────────────────
    function getCurrencySymbol(card) {
        var data = findCorridorData(card);
        var currency = (data && data.currency) ? data.currency : 'USD';
        var map = { USD:'$', GBP:'£', EUR:'€', CAD:'CA$', AUD:'A$', MXN:'MX$', JPY:'¥' };
        return map[currency] || '$';
    }

    // ── LEGACY CALCULATOR HANDLER (class="calculator" blocks) ──
    // Several corridor pages ship their own markup (unique input/result ids) and
    // previously had no wiring, leaving the Calculate button dead. This generic
    // handler reads the data-* attributes + known element ids and fills results.
    var LEGACY_SYMBOLS = { USD:'$', GBP:'£', EUR:'€', CAD:'CA$', AUD:'A$', MXN:'MX$', JPY:'¥', AED:'AED ', SAR:'SR ' };

    function legacyFirst(root, candidates) {
        for (var i = 0; i < candidates.length; i++) {
            var el = root.querySelector(candidates[i]);
            if (el) return el;
        }
        return null;
    }

    function legacyUnhide(startEl, stopEl) {
        var node = startEl.parentElement;
        while (node && node !== stopEl) {
            if (node.style && node.style.display === 'none') node.style.display = 'block';
            node = node.parentElement;
        }
    }

    function runLegacyCalc(root) {
        var goodsEl = legacyFirst(root, ['#goods-value', '#goodsValue', '#machinery-value', '#cargo-value', '.calc-goods', '.item-value']);
        var shipEl  = legacyFirst(root, ['#shipping-cost', '#shippingCost', '.calc-ship', '.shipping-cost']);
        if (!goodsEl) return;

        var dutyRate  = parseFloat(root.getAttribute('data-duty-rate')) || 0;
        var vatRate   = parseFloat(root.getAttribute('data-vat-rate')) || 0;
        var deMinimis = parseFloat(root.getAttribute('data-deminimis')) || 0;
        var vatDeMin  = parseFloat(root.getAttribute('data-vat-deminimis'));
        if (isNaN(vatDeMin)) vatDeMin = 0;
        var thresholdBase = root.getAttribute('data-threshold-base') || 'fob';

        var currency = root.getAttribute('data-currency') || 'USD';
        var sym = LEGACY_SYMBOLS[currency] || '$';

        var goods = parseFloat(goodsEl.value);
        var ship  = shipEl ? parseFloat(shipEl.value) : 0;
        if (isNaN(goods) || goods <= 0) {
            alert('Please enter a valid value greater than zero.');
            return;
        }
        if (!isNaN(ship) && ship > MAX_INPUT_VALUE) {
            alert('Please enter shipping no larger than ' + MAX_INPUT_VALUE.toLocaleString() + '.');
            return;
        }

        var cif = goods + (isNaN(ship) ? 0 : ship);
        var dmBase = thresholdBase === 'cif' ? cif : goods;
        var duty = dmBase > deMinimis ? cif * (dutyRate / 100) : 0;
        var vat  = (dmBase > vatDeMin && vatRate > 0) ? (cif + duty) * (vatRate / 100) : 0;
        var total = cif + duty + vat;

        function fill(span, val) {
            if (!span) return;
            span.textContent = sym + val.toFixed(2);
            legacyUnhide(span, root);
        }

        fill(legacyFirst(root, ['#duty-result', '#dutyResult', '#result-duty', '#tariff-result']), duty);
        fill(legacyFirst(root, ['#vat-result', '#vatResult', '#result-vat', '#jctResult']), vat);
        fill(legacyFirst(root, ['#total-result', '#landed-result', '#landedResult', '#result-total']), total);

        var mpfSpan = legacyFirst(root, ['#result-mpf', '#mpfResult']);
        if (mpfSpan) {
            var mpfCfg = window.MPF_RATES || { rate: 0.003464, min: 31.67, max: 614.35 };
            var mpf = dmBase > deMinimis ? Math.min(mpfCfg.max, Math.max(mpfCfg.min, cif * mpfCfg.rate)) : 0;
            fill(mpfSpan, mpf);
        }
    }

    function initLegacyCalculators() {
        var roots = document.querySelectorAll('.calculator');
        for (var i = 0; i < roots.length; i++) {
            var root = roots[i];
            if (!root.hasAttribute('data-duty-rate')) continue;
            var btn = root.querySelector('.calc-btn');
            if (!btn) continue;
            (function (r) {
                btn.addEventListener('click', function () { runLegacyCalc(r); });
            })(root);
        }
    }

    // ── CORRIDOR LOOKUP: match by detail-link href ──────
    function findCorridorData(card) {
        if (!window.RATE_DATABASE) return null;
        var link = card.querySelector('.detail-link');
        if (!link) return null;
        var href = link.getAttribute('href') || '';
        var allData = window.RATE_DATABASE;
        var key;
        for (key in allData) {
            if (allData.hasOwnProperty(key) && allData[key].detailPage === href) {
                return allData[key];
            }
        }
        return null;
    }

    // ── RATE VERIFICATION BADGE (per card) ───────────────
    function renderRateMeta(card) {
        var data = findCorridorData(card);
        if (!data) return;

        // Remove any existing rate-meta to avoid duplicates
        var existing = card.querySelector('.rate-meta');
        if (existing) existing.remove();

        var tier = getFreshnessTier(data.lastVerified);
        var tierLabel = tier === 'fresh' ? 'Verified' : (tier === 'stale' ? 'Due for review' : 'Rates may be outdated');
        var statusClass = data.rateStatus;
        var statusLabel = data.rateStatus === 'stable' ? 'Stable' :
                          (data.rateStatus === 'under-review' ? 'Under Review' : 'Recently Changed');

        var meta = document.createElement('div');
        meta.className = 'rate-meta';
        meta.innerHTML =
            '<span class="verified-dot ' + tier + '" title="' + tierLabel + '"></span>' +
            '<span class="verified-label">' + tierLabel + ':</span>' +
            '<span class="verified-date">' + formatDate(data.lastVerified) + '</span>' +
            '<span class="rate-status-badge ' + statusClass + '">' + statusLabel + '</span>' +
            '<a href="' + data.detailPage + '#rate-history" style="font-size:0.7rem;color:var(--accent);margin-left:auto;" title="View rate change history">History →</a>';

        // Insert after the card description, before the first input group
        var firstInput = card.querySelector('.input-group');
        if (firstInput) {
            card.insertBefore(meta, firstInput);
        }
    }

    // ── RISK NOTE (per card) ─────────────────────────────
    function renderRiskNote(card) {
        var data = findCorridorData(card);
        if (!data || !data.riskNote) return;

        // Remove existing risk note
        var existing = card.querySelector('.risk-note');
        if (existing) existing.remove();

        var note = document.createElement('div');
        note.className = 'risk-note visible';
        note.innerHTML = '<span class="risk-icon">⚠️</span><strong>Risk note:</strong> ' + data.riskNote;

        // Insert before the detail link
        var detailLink = card.querySelector('.detail-link');
        if (detailLink) {
            card.insertBefore(note, detailLink);
        } else {
            card.appendChild(note);
        }
    }

    // ── RESULT INTEL CROSS-LINK ──────────────────────────
    function renderResultIntel(card) {
        var data = findCorridorData(card);
        if (!data || !window.INTEL_FEED) return;

        var corridorId = data.id;

        // Find matching intel items for this corridor
        var matches = window.INTEL_FEED.filter(function(item) {
            return item.relatedCorridor === corridorId;
        });

        var resultBox = card.querySelector('.result-display');
        if (!resultBox) return;

        // Remove existing intel note
        var existing = resultBox.querySelector('.result-intel-note');
        if (existing) existing.remove();

        if (matches.length > 0) {
            var latest = matches[0]; // most recent
            var note = document.createElement('div');
            note.className = 'result-intel-note visible';
            note.innerHTML = '📡 <strong>Latest policy alert:</strong> ' +
                '<a href="#intel-' + latest.date + '" onclick="document.querySelector(\'[data-intel-date=' + latest.date + ']\').scrollIntoView({behavior:\'smooth\'});return false;">' +
                latest.title + '</a> — ' + formatDate(latest.date);
            resultBox.appendChild(note);
        }
    }

    // ── INTELLIGENCE FEED RENDERER ────────────────────────
    function renderIntelFeed(container) {
        if (!container || !window.INTEL_FEED) return;

        var html = '';
        window.INTEL_FEED.forEach(function(item, index) {
            var urgencyClass = item.urgency === 'critical' ? ' critical' : '';
            var alertIcon = item.urgency === 'critical' ? '🔴' :
                            (item.urgency === 'warning' ? '🟡' : '🔵');

            html +=
                '<div class="intel-item intel-alert-bar' + urgencyClass + '" data-intel-date="' + item.date + '" id="intel-' + item.date + '">' +
                '  <span class="alert-icon">' + alertIcon + '</span>' +
                '  <div class="alert-body">' +
                '    <div class="alert-date">' + formatDate(item.date) + '</div>' +
                '    <div class="alert-title">' + item.title + '</div>' +
                '    <div class="alert-summary">' + item.summary + '</div>' +
                '    <div class="alert-tags">' +
                        item.tags.map(function(t) { return '<span class="alert-tag">' + t + '</span>'; }).join('') +
                '    </div>' +
                '  </div>' +
                (item.relatedCorridor && window.RATE_DATABASE && window.RATE_DATABASE[item.relatedCorridor]
                    ? '<a class="alert-link" href="' + window.RATE_DATABASE[item.relatedCorridor].detailPage + '">Check your rates →</a>'
                    : '') +
                '</div>';
        });

        container.innerHTML = html;

        // If more than 3 items, wrap in compact mode with toggle
        if (window.INTEL_FEED.length > 3) {
            container.classList.add('intel-feed-compact');
            var toggle = document.createElement('button');
            toggle.className = 'intel-toggle-btn';
            toggle.textContent = 'Show all ' + window.INTEL_FEED.length + ' updates';
            toggle.addEventListener('click', function() {
                container.classList.toggle('expanded');
                toggle.textContent = container.classList.contains('expanded')
                    ? 'Show fewer'
                    : 'Show all ' + window.INTEL_FEED.length + ' updates';
            });
            container.parentNode.insertBefore(toggle, container.nextSibling);
        }
    }

    // ── NEWSLETTER HANDLER ────────────────────────────────
    function initNewsletter() {
        var form = document.getElementById('newsletter-form');
        if (!form) return;

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var emailInput = form.querySelector('input[type="email"]');
            var confirmEl = document.getElementById('newsletter-confirm');
            if (emailInput && emailInput.value && confirmEl) {
                // Client-side only — stores email intent locally.
                // Delivery service (ConvertKit / Mailchimp / Buttondown) is wired up
                // before launch; the UI now states the briefing is coming soon.
                try {
                    var subs = JSON.parse(localStorage.getItem('dc_newsletter_subs') || '[]');
                    if (subs.indexOf(emailInput.value) === -1) {
                        subs.push(emailInput.value);
                        localStorage.setItem('dc_newsletter_subs', JSON.stringify(subs));
                    }
                } catch (ignore) {}
                emailInput.value = '';
                confirmEl.style.display = 'block';
                setTimeout(function() {
                    confirmEl.style.display = 'none';
                }, 6000);
            }
        });
    }

    // ── UTILITY: Format date for display ──────────────────
    function formatDate(isoString) {
        var d = new Date(isoString);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    // (getFreshnessTier is defined once in rate-data.js — single source of truth)

    // ── BOOTSTRAP: Bind buttons + render meta for all cards
    function initAll() {
        // Bind calculator buttons
        var buttons = document.querySelectorAll('.btn-calc');
        var i;
        for (i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', function () {
                globalDutyCalc(this);
            });
        }

        // Bind legacy (class="calculator") corridor calculators
        initLegacyCalculators();

        // Render rate verification badges on all calculator cards
        var cards = document.querySelectorAll('.calculator-card');
        for (i = 0; i < cards.length; i++) {
            renderRateMeta(cards[i]);
            renderRiskNote(cards[i]);
        }

        // Render intelligence feed if container present
        var intelContainer = document.getElementById('intel-feed');
        if (intelContainer) {
            renderIntelFeed(intelContainer);
        }

        // Init newsletter
        initNewsletter();

        // Add freshness dot to page-meta-line if present
        var metaDot = document.getElementById('page-freshness-dot');
        if (metaDot && metaDot.getAttribute('data-last-verified')) {
            var tier = getFreshnessTier(metaDot.getAttribute('data-last-verified'));
            metaDot.className = 'meta-dot ' + tier;
        }

        // Register service worker for offline / PWA support (best effort)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function () {});
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

})();
