// dutycalc.online — Rate Verification Database v1.0
// Single source of truth for all tariff rates, thresholds, and freshness metadata.
// Every calculator card on index.html references an entry here by the corridor key
// used in the mini-corridor <select> dropdown's option values.
//
// STATUS CODES:
//   'stable'          — rate unchanged for 3+ months, verified against official source
//   'under-review'    — active policy proceeding or announced change pending implementation
//   'changed-recently'— rate changed within the last 90 days
//
// FRESHNESS TIERS (rendered as colored dots):
//   fresh   (≤30 days since lastVerified)   → green
//   stale   (31–90 days)                     → yellow
//   expired (>90 days)                       → red
//
// VALUATION BASIS (thresholdBase) — drives BOTH the ad valorem duty base and the
// de minimis test, in main.js and in the index.html mini calculator. It is not a
// per-card preference: it is a property of the destination market's customs law.
//   'fob' — duty lands on the goods value; international freight and insurance are
//           excluded from the base. United States (19 U.S.C. 1401a(b)(4)(A)),
//           Canada (value for duty at the place of direct shipment), Australia.
//   'cif' — duty lands on goods + international freight and insurance.
//           United Kingdom, EU member states, Japan, Saudi Arabia, UAE,
//           Mexico (Ley Aduanera art. 65 adds international freight and insurance).
// Changing one of these without checking the destination's valuation rule will
// silently misprice every result on that corridor.

var MPF_RATES = { rate: 0.003464, min: 31.67, max: 614.35 };  // US Merchandise Processing Fee, 2026 (single source of truth)

// ADDITIONAL FIELD REFERENCE (added 2026-10-16)
//   deMinimisStatus    'active' (default) | 'suspended' | 'abolished' | 'conditional'
//   deMinimisCurrency  currency of the de minimis figure when it differs from `currency`
//                      (Mexico's threshold is USD-denominated; its display currency is MXN)
//   deMinimisNote      plain-language statement of where the threshold actually stands
//   lowValueDuty       flat duty that replaced a threshold (the EU's 3 EUR per item)
//   dutyLayers[]       duties that sit on top of, or alongside, the MFN `dutyRate`.
//                      `dutyRate` stays the MFN/composite base rate -- the site has always
//                      explained the Section 301 stack separately, and this field is where
//                      that stack now lives as data instead of prose.
//
// When `deMinimis` is 0 the market grants no duty-free threshold, which makes main.js's
// `valueBase > deMinimis` test true by construction. Do not restore a non-zero value
// without a source: a threshold the market no longer grants is worse than none, because
// sellers price against it.

var FORCED_LABOUR_301 = {
  // USTR Section 301 action of 23 July 2026, effective 24 July 2026 (FR 2026-15181).
  // Single source of truth for the tier structure, so no corridor has to restate it.
  effective: '2026-07-24',
  source: 'USTR notice, FR 2026-15181 (28 Jul 2026)',
  tiers: {
    'additive-12.5': ['China', 'Hong Kong, China', 'Vietnam', 'Australia', 'New Zealand', 'Saudi Arabia', 'United Arab Emirates', 'Singapore', 'Thailand', 'Turkey', 'Brazil', 'Russia'],
    'additive-10': ['United Kingdom', 'Canada', 'Mexico', 'India', 'Indonesia', 'Malaysia', 'Bangladesh', 'Cambodia', 'Jordan', 'Pakistan', 'Sri Lanka', 'Argentina', 'Ecuador', 'El Salvador', 'Guatemala', 'Honduras', 'Trinidad and Tobago'],
    'fill-to-10': ['European Union', 'Taiwan, China'],
    'fill-to-12.5': ['Japan', 'South Korea', 'Switzerland']
  },
  stacksWith: 'existing Section 301 duties (the China lists)',
  doesNotStackWith: 'Section 232 duties (steel, aluminium, copper, autos and auto parts, lumber, semiconductors, and later pharmaceuticals)',
  replaced: 'the 10% Section 122 surcharge that expired 24 July 2026'
};

var RATE_DATABASE = {

  // ── CHINA → UNITED STATES ───────────────────────────────────
  'cn-us-apparel': {
    id: 'cn-us-apparel',
    origin: 'China', destination: 'United States',
    category: 'Apparel & Textiles',
    dutyRate: 16.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 12.5,
        origin: 'China', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        extraLayerNote: 'The Section 301 China lists add a further 7.5% (List 4A) or 25% (Lists 1-3) depending on the HTS line, and those duties stack with this one. This site tracks them in the Section 301 guide rather than per corridor.' }
    ],
    detailPage: '/china-to-us-clothing',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapter 61-62, USTR Section 301 exclusion list (June 2026); CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Section 301 tariffs on Chinese apparel remain in flux — USTR exclusion review expected Q3 2026. 16.5% is the prevailing composite rate for most knit/woven garments.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 16.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 16.5, note: 'Verified against USITC 2026 HTS Revision 6. No change.' },
      { date: '2025-09-15', dutyRate: 16.5, note: 'Section 301 exclusions for certain cotton knit tops reinstated; net rate unchanged for most categories.' },
      { date: '2024-01-01', dutyRate: 16.0, note: 'MFN rate adjusted upward 0.5 pp on woven cotton garments (HTS 6205.20).' }
    ]
  },

  'cn-us-electronics': {
    id: 'cn-us-electronics',
    origin: 'China', destination: 'United States',
    category: 'Electronics & Gadgets',
    dutyRate: 2.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 12.5,
        origin: 'China', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        extraLayerNote: 'The Section 301 China lists add a further 7.5% (List 4A) or 25% (Lists 1-3) depending on the HTS line, and those duties stack with this one. This site tracks them in the Section 301 guide rather than per corridor.' }
    ],
    detailPage: '/china-to-us-electronics',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapter 85, WTO ITA Annex (1996); CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Most consumer electronics benefit from WTO ITA zero-rate bindings. 2.5% applies to non-ITA covered accessories and peripherals. Section 301 on Chinese electronics remains a tail risk.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 2.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 2.5, note: 'Verified. No change.' },
      { date: '2025-03-01', dutyRate: 2.5, note: 'Routine verification against USITC 2025 HTS.' }
    ]
  },

  'cn-us-furniture': {
    id: 'cn-us-furniture',
    origin: 'China', destination: 'United States',
    category: 'Furniture & Home Goods',
    dutyRate: 8.0, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 12.5,
        origin: 'China', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        extraLayerNote: 'The Section 301 China lists add a further 7.5% (List 4A) or 25% (Lists 1-3) depending on the HTS line, and those duties stack with this one. This site tracks them in the Section 301 guide rather than per corridor.' }
    ],
    detailPage: '/china-to-us-furniture',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapter 94, US Department of Commerce AD/CVD orders; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: '8.0% is the baseline MFN rate for general furniture. Wooden bedroom furniture from China carries separate anti-dumping duties (up to 216% for some manufacturers). Verify the specific AD/CVD order for your product category.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 8, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 8.0, note: 'Verified. AD/CVD on wooden bedroom sets unchanged since 2024 review.' }
    ]
  },

  'cn-us-machinery': {
    id: 'cn-us-machinery',
    origin: 'China', destination: 'United States',
    category: 'Industrial Machinery & Parts',
    dutyRate: 4.2, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 12.5,
        origin: 'China', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        extraLayerNote: 'The Section 301 China lists add a further 7.5% (List 4A) or 25% (Lists 1-3) depending on the HTS line, and those duties stack with this one. This site tracks them in the Section 301 guide rather than per corridor.',
        caveat: 'Industrial machinery lines with steel or aluminium content may fall under Section 232, which this action does not stack with.' }
    ],
    detailPage: '/china-to-us-machinery',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapter 84, USTR Section 301 machinery exclusion list; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: '4.2% is the general MFN average. Section 301 tariffs (7.5%-25%) may stack on top for non-excluded CNC machines, pumps, and bearings. Check the latest USTR machinery exclusion list before quoting.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 4.2, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 4.2, note: 'Verified. Section 301 machinery exclusion review ongoing.' },
      { date: '2025-11-20', dutyRate: 3.8, note: 'MFN rate revised upward 0.4 pp for certain industrial pumps (HTS 8413).' }
    ]
  },

  'cn-us-plastics': {
    id: 'cn-us-plastics',
    origin: 'China', destination: 'United States',
    category: 'Plastics & Toys',
    dutyRate: 6.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 12.5,
        origin: 'China', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        extraLayerNote: 'The Section 301 China lists add a further 7.5% (List 4A) or 25% (Lists 1-3) depending on the HTS line, and those duties stack with this one. This site tracks them in the Section 301 guide rather than per corridor.' }
    ],
    detailPage: '/china-to-us-plastics',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapters 39 & 95, CPSC regulations; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: '6.5% covers most plastic articles and toys. CPSIA testing certificates mandatory for children\'s products — CBP will detain non-compliant shipments regardless of correct duty payment.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 6.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 6.5, note: 'Verified. No change.' }
    ]
  },

  // ── CHINA → UNITED KINGDOM ──────────────────────────────────
  'cn-uk-electronics': {
    id: 'cn-uk-electronics',
    origin: 'China', destination: 'United Kingdom',
    category: 'Electronics',
    dutyRate: 2.5, vatRate: 20, deMinimis: 135,
    currency: 'GBP',
    thresholdBase: 'cif',
    detailPage: '/china-to-uk-electronics',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'The £135 duty relief is still in force. Its repeal was legislated by the HMT/HMRC low value imports policy paper of 13 July 2026, but commencement is left to Treasury regulations and must happen no later than October 2028 — so the relief applies today and is scheduled to end, not already ended.',
    rateSource: 'UK Global Tariff (UKGT) 2026, Chapters 84-85; HMT/HMRC low value imports policy paper (13 Jul 2026)',
    riskNote: 'UK\'s post-Brexit Global Tariff maintains low electronics rates. 20% VAT applies from the first pound — no de minimis for VAT on commercial imports. The £135 threshold is for customs duty only.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 2.5, note: 'Verified against UK Global Tariff. No changes since 2024.' }
    ]
  },

  'cn-uk-apparel': {
    id: 'cn-uk-apparel',
    origin: 'China', destination: 'United Kingdom',
    category: 'Apparel & Fashion',
    dutyRate: 12.0, vatRate: 20, deMinimis: 135,
    currency: 'GBP',
    thresholdBase: 'cif',
    detailPage: '/china-to-uk-apparel',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'The £135 duty relief is still in force. Its repeal was legislated by the HMT/HMRC low value imports policy paper of 13 July 2026, but commencement is left to Treasury regulations and must happen no later than October 2028 — so the relief applies today and is scheduled to end, not already ended.',
    rateSource: 'UK Global Tariff (UKGT) 2026, Chapters 61-62; HMT/HMRC, Reforming the customs treatment of low value imports into the UK (13 Jul 2026)',
    riskNote: 'Clothing carries one of the highest UK import duty rates. The UK\'s Developing Countries Trading Scheme (DCTS) does not apply to China-origin goods. 20% VAT is calculated on CIF + duty.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 12.0, note: 'Verified. UK apparel tariff rates unchanged since post-Brexit transition.' }
    ]
  },

  'cn-uk-homeware': {
    id: 'cn-uk-homeware',
    origin: 'China', destination: 'United Kingdom',
    category: 'Homeware & Decor',
    dutyRate: 6.0, vatRate: 20, deMinimis: 135,
    currency: 'GBP',
    thresholdBase: 'cif',
    detailPage: '/china-to-uk-homeware',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'The £135 duty relief is still in force. Its repeal was legislated by the HMT/HMRC low value imports policy paper of 13 July 2026, but commencement is left to Treasury regulations and must happen no later than October 2028 — so the relief applies today and is scheduled to end, not already ended.',
    rateSource: 'UK Global Tariff (UKGT) 2026, Chapters 69, 70, 94; HMT/HMRC low value imports policy paper (13 Jul 2026)',
    riskNote: 'Ceramic tableware (Ch. 69), glassware (Ch. 70), and general home goods fall under the 6% band. Anti-dumping duties on Chinese ceramic tableware were extended through 2028.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 6.0, note: 'Verified. Ceramic AD duty extension confirmed.' }
    ]
  },

  // ── US → CANADA ────────────────────────────────────────────
  'us-canada': {
    id: 'us-canada',
    origin: 'United States', destination: 'Canada',
    category: 'General Cargo',
    dutyRate: 5.0, vatRate: 5, deMinimis: 20, vatDeMinimis: 20,
    currency: 'CAD',
    thresholdBase: 'fob',
    detailPage: '/us-to-canada-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    deMinimisNote: 'Canada\'s counter-tariffs apply even below the de minimis threshold: goods on the United States Surtax Order list owe the surtax regardless of the CAD $20 / CAD $40 courier relief (CBSA Customs Notice 26-23, effective 8 Sep 2026).',
    rateSource: 'Canada Customs Tariff T2026 (in force 1 Jan 2026), CBSA; CBSA Customs Notice 26-23, United States Surtax Order (2026), eff. 8 Sep 2026; CBSA Memorandum D8-2-16 (Courier Imports Remission)',
    riskNote: 'USMCA eliminates duty on most US-origin goods — the 5.0% rate shown here applies to non-USMCA-qualifying items only. GST (5%) applies from CAD $20. Provincial sales taxes may apply on top. Canada added surtaxes of 15%, 25% and 50% on listed US-origin goods from 8 Sep 2026 (CBSA Customs Notice 26-23); the surtax is owed even on shipments below the de minimis threshold. Rates apply only to goods on the order list — check the list for your HS code rather than assuming a flat rate.',
    rateHistory: [
      { date: '2026-09-08', dutyRate: 5.0, note: 'Canada imposed 15/25/50% surtaxes on listed US-origin goods (United States Surtax Order 2026, CBSA Customs Notice 26-23). The surtax applies even below the de minimis threshold.' },
      { date: '2026-07-15', dutyRate: 5.0, note: 'Verified. USMCA preference rules unchanged.' }
    ]
  },

  // ── CHINA → CANADA ─────────────────────────────────────────
  'cn-canada': {
    id: 'cn-canada',
    origin: 'China', destination: 'Canada',
    category: 'General Cargo',
    dutyRate: 6.5, vatRate: 5, deMinimis: 20, vatDeMinimis: 20,
    currency: 'CAD',
    thresholdBase: 'fob',
    detailPage: '/china-to-canada-freight',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    deMinimisNote: 'Canada\'s surtaxes reach below the de minimis threshold. A 25% surtax on steel derivatives from any country has applied since 26 Dec 2025, and a 25% temporary safeguard on wood cabinets and vanities since 31 Jul 2026 (Customs Notice 26-17).',
    rateSource: 'Canada Customs Tariff T2026 (in force 1 Jan 2026), CBSA; China Surtax Orders (steel and aluminium, 25%); CBSA Customs Notice 26-17, Wood Cabinet and Vanity Goods Surtax Order (eff. 31 Jul 2026)',
    riskNote: 'Vancouver port entry is the most common clearance point. China is not an FTA partner — full MFN rates apply. GST calculated on duty-paid value. Surtaxes on steel and aluminium derivatives (25% since 26 Dec 2025) and the 25% safeguard on wood cabinets and vanities (since 31 Jul 2026) sit on top of MFN and apply below the de minimis threshold — verify your HS code against the order lists before quoting a landed cost.',
    rateHistory: [
      { date: '2026-07-31', dutyRate: 6.5, note: '25% temporary safeguard on wood cabinets and vanities took effect (Customs Notice 26-17). The 25% surtax on steel derivatives has applied since 26 Dec 2025.' },
      { date: '2026-07-15', dutyRate: 6.5, note: 'Verified. No tariff changes for Chinese general cargo.' }
    ]
  },

  // ── UK → US ────────────────────────────────────────────────
  'uk-us': {
    id: 'uk-us',
    origin: 'United Kingdom', destination: 'United States',
    category: 'General Trade',
    dutyRate: 3.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 10,
        origin: 'the United Kingdom', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)' }
    ],
    detailPage: '/uk-to-us-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS 2026, US-UK bilateral trade (no FTA in force); CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'No US-UK free trade agreement is currently in effect — UK goods are assessed at standard MFN rates. Some categories may benefit from WTO ITA zero rates.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 3.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 3.5, note: 'Verified. MFN rates unchanged.' }
    ]
  },

  // ── EU → US ────────────────────────────────────────────────
  'eu-us': {
    id: 'eu-us',
    origin: 'European Union', destination: 'United States',
    category: 'General Cargo',
    dutyRate: 4.0, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 6,
        origin: 'the European Union', tier: 'fill', basis: 'MFN', effective: '2026-07-24',
        rule: 'Fill-to rule: MFN plus this duty totals 10%. The duty is nil where the MFN rate is already 10% or higher. Does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)' }
    ],
    detailPage: '/eu-to-us-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS 2026, standard MFN rates; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'EU-origin goods benefit from generally predictable MFN rates. No Section 301 applies. Certain steel and aluminum products may still be subject to Section 232 tariffs (25% and 10% respectively).',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 4, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 4.0, note: 'Verified. Section 232 on EU steel/aluminum unchanged.' }
    ]
  },

  // ── GERMANY → US ───────────────────────────────────────────
  'de-us-auto': {
    id: 'de-us-auto',
    origin: 'Germany', destination: 'United States',
    category: 'Automotive Parts',
    dutyRate: 2.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 7.5,
        origin: 'the European Union', tier: 'fill', basis: 'MFN', effective: '2026-07-24',
        rule: 'Fill-to rule: MFN plus this duty totals 10%. The duty is nil where the MFN rate is already 10% or higher. Does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        caveat: 'Auto parts are Section 232 goods in most cases and are exempt from this action; confirm the specific part.' }
    ],
    detailPage: '/germany-to-us-automotive',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapter 87, US-EU auto sector agreement (no formal FTA); CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Automotive parts generally carry low MFN rates (2.5%). Engine blocks, transmissions, and electronic control units are classified under separate HTS headings — verify each part\'s 10-digit code.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 2.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 2.5, note: 'Verified. No change.' }
    ]
  },

  // ── FRANCE → US ────────────────────────────────────────────
  'fr-us-luxury': {
    id: 'fr-us-luxury',
    origin: 'France', destination: 'United States',
    category: 'Cosmetics & Luxury Goods',
    dutyRate: 5.2, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 4.8,
        origin: 'the European Union', tier: 'fill', basis: 'MFN', effective: '2026-07-24',
        rule: 'Fill-to rule: MFN plus this duty totals 10%. The duty is nil where the MFN rate is already 10% or higher. Does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)' }
    ],
    detailPage: '/france-to-us-luxury',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapters 33 (cosmetics), 42 (leather), 71 (jewelry); CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Perfumes and cosmetics (Ch. 33) carry higher-than-average MFN rates. Leather handbags (Ch. 42) and fashion accessories vary from 3.5% to 9.0% by material and construction.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 5.2, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 5.2, note: 'Verified. No changes to luxury goods classifications.' }
    ]
  },

  // ── ITALY → US ─────────────────────────────────────────────
  'it-us-industrial': {
    id: 'it-us-industrial',
    origin: 'Italy', destination: 'United States',
    category: 'Industrial Hardware',
    dutyRate: 3.8, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 6.2,
        origin: 'the European Union', tier: 'fill', basis: 'MFN', effective: '2026-07-24',
        rule: 'Fill-to rule: MFN plus this duty totals 10%. The duty is nil where the MFN rate is already 10% or higher. Does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        caveat: 'Steel and aluminium articles are Section 232 goods and are exempt from this action.' }
    ],
    detailPage: '/italy-to-us-machinery',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapters 84, 82, 90; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Italian precision tools and stone-working machinery benefit from predictable MFN treatment. Medical devices (Ch. 90) may qualify for duty-free entry under specific provisions.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 3.8, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 3.8, note: 'Verified. No change.' }
    ]
  },

  // ── US → UK ────────────────────────────────────────────────
  'us-uk': {
    id: 'us-uk',
    origin: 'United States', destination: 'United Kingdom',
    category: 'General Cargo',
    dutyRate: 4.5, vatRate: 20, deMinimis: 135,
    currency: 'GBP',
    thresholdBase: 'cif',
    detailPage: '/us-to-uk-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'The £135 duty relief is still in force. Its repeal was legislated by the HMT/HMRC low value imports policy paper of 13 July 2026, but commencement is left to Treasury regulations and must happen no later than October 2028 — so the relief applies today and is scheduled to end, not already ended.',
    rateSource: 'UK Global Tariff (UKGT) 2026 (no US-UK FTA in force); HMT/HMRC low value imports policy paper (13 Jul 2026)',
    riskNote: 'No US-UK free trade agreement active — full UK Global Tariff rates apply. 20% VAT on CIF + duty from the first pound. £135 threshold for customs duty only; VAT applies regardless.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 4.5, note: 'Verified. UK Global Tariff unchanged.' }
    ]
  },

  // ── EU → UK (POST-BREXIT) ──────────────────────────────────
  'eu-uk-brexit': {
    id: 'eu-uk-brexit',
    origin: 'European Union', destination: 'United Kingdom',
    category: 'General Cargo (Post-Brexit)',
    dutyRate: 2.0, vatRate: 20, deMinimis: 135,
    currency: 'GBP',
    thresholdBase: 'cif',
    detailPage: '/eu-to-uk-post-brexit',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'The £135 duty relief is still in force. Its repeal was legislated by the HMT/HMRC low value imports policy paper of 13 July 2026, but commencement is left to Treasury regulations and must happen no later than October 2028 — so the relief applies today and is scheduled to end, not already ended.',
    rateSource: 'UK-EU Trade and Cooperation Agreement (in force 1 May 2021); UK Global Tariff 2026; HMT/HMRC low value imports policy paper (13 Jul 2026)',
    riskNote: 'Zero tariff applies to goods meeting TCA rules of origin. The 2.0% shown is for non-qualifying items. £135 threshold for consignment-level VAT collection — above this, VAT is collected at import; below it, the seller must register for UK VAT.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 2.0, note: 'TCA verification review complete. No changes to preference rules.' }
    ]
  },

  // ── CHINA → GERMANY ────────────────────────────────────────
  'cn-de': {
    id: 'cn-de',
    origin: 'China', destination: 'Germany',
    category: 'Industrial & Automation',
    dutyRate: 4.2, vatRate: 19, deMinimis: 0,
    currency: 'EUR',
    thresholdBase: 'cif',
    deMinimisStatus: 'abolished',
    deMinimisNote: 'The 150 EUR customs duty relief was removed on 1 July 2026 (Council Regulation (EU) 2026/382). Consignments valued up to 150 EUR now pay a flat 3 EUR duty per item, per tariff heading, until 1 July 2028, after which normal tariff rates apply. VAT has been due from the first euro since 2021.',
    lowValueDuty: { flat: 3, currency: 'EUR', appliesUpTo: 150, effective: '2026-07-01', until: '2028-07-01' },
    detailPage: '/china-to-germany-customs',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    rateSource: 'EU TARIC 2026, German Customs (Zoll); Council Regulation (EU) 2026/382 (1 Jul 2026)',
    riskNote: 'EU customs union applies uniform external tariff. 19% EUSt (Einfuhrumsatzsteuer / import turnover tax) on CIF + duty. Customs duty is waived below €150; VAT (EUSt) is assessed from the first cent under the EU\'s IOSS regime for e-commerce.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 4.2, note: 'Re-verified. The 150 EUR customs duty relief was removed on 1 Jul 2026 (Council Regulation (EU) 2026/382); consignments up to 150 EUR now pay a flat 3 EUR duty per item until 1 Jul 2028. Duty rate unchanged.' },
      { date: '2026-07-15', dutyRate: 4.2, note: 'EU TARIC verification complete. No changes.' }
    ]
  },

  // ── CHINA → FRANCE ─────────────────────────────────────────
  'cn-fr': {
    id: 'cn-fr',
    origin: 'China', destination: 'France',
    category: 'General E-Commerce Cargo',
    dutyRate: 4.5, vatRate: 20, deMinimis: 0,
    currency: 'EUR',
    thresholdBase: 'cif',
    deMinimisStatus: 'abolished',
    deMinimisNote: 'The 150 EUR customs duty relief was removed on 1 July 2026 (Council Regulation (EU) 2026/382). Consignments valued up to 150 EUR now pay a flat 3 EUR duty per item, per tariff heading, until 1 July 2028, after which normal tariff rates apply. VAT has been due from the first euro since 2021.',
    lowValueDuty: { flat: 3, currency: 'EUR', appliesUpTo: 150, effective: '2026-07-01', until: '2028-07-01' },
    detailPage: '/china-to-france-customs',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    rateSource: 'EU TARIC 2026, French Douane; Council Regulation (EU) 2026/382 (1 Jul 2026)',
    riskNote: 'French TVA (20%) applies to all imports from the first euro. The €150 customs duty de minimis still applies (goods at or below €150 clear duty-free); VAT is collected at point of sale via IOSS for e-commerce.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 4.5, note: 'Re-verified. The 150 EUR customs duty relief was removed on 1 Jul 2026 (Council Regulation (EU) 2026/382); consignments up to 150 EUR now pay a flat 3 EUR duty per item until 1 Jul 2028. Duty rate unchanged.' },
      { date: '2026-07-15', dutyRate: 4.5, note: 'Verified. EU TARIC uniform external tariff unchanged.' }
    ]
  },

  // ── US → GERMANY ───────────────────────────────────────────
  'us-de-industrial': {
    id: 'us-de-industrial',
    origin: 'United States', destination: 'Germany',
    category: 'Industrial Machinery & Parts',
    dutyRate: 1.7, vatRate: 19, deMinimis: 0,
    currency: 'EUR',
    thresholdBase: 'cif',
    deMinimisStatus: 'abolished',
    deMinimisNote: 'The 150 EUR customs duty relief was removed on 1 July 2026 (Council Regulation (EU) 2026/382). Consignments valued up to 150 EUR now pay a flat 3 EUR duty per item, per tariff heading, until 1 July 2028, after which normal tariff rates apply. VAT has been due from the first euro since 2021.',
    lowValueDuty: { flat: 3, currency: 'EUR', appliesUpTo: 150, effective: '2026-07-01', until: '2028-07-01' },
    detailPage: '/us-to-germany-machinery',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    rateSource: 'EU TARIC 2026, EU-US mutual recognition agreements; Council Regulation (EU) 2026/382 (1 Jul 2026)',
    riskNote: 'US industrial machinery benefits from low EU TARIC MFN rates averaging 1.7%. Medical devices and scientific instruments may qualify for duty-free entry under specific EU tariff suspensions. 19% EUSt applies. No Section 232 risk on US-origin goods entering the EU.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 1.7, note: 'Re-verified. The 150 EUR customs duty relief was removed on 1 Jul 2026 (Council Regulation (EU) 2026/382); consignments up to 150 EUR now pay a flat 3 EUR duty per item until 1 Jul 2028. Duty rate unchanged.' },
      { date: '2026-07-15', dutyRate: 1.7, note: 'Verified against EU TARIC 2026. Rate corrected from 3.0% to 1.7% to match actual industrial machinery MFN rates.' },
      { date: '2026-07-15', dutyRate: 3.0, note: 'Prior verification. Rate was incorrect — 3.0% reflected medical devices, not industrial machinery.' }
    ]
  },

  // ── CHINA → NETHERLANDS ────────────────────────────────────
  'cn-nl': {
    id: 'cn-nl',
    origin: 'China', destination: 'Netherlands',
    category: 'Rotterdam Hub Bulk Cargo',
    dutyRate: 3.5, vatRate: 21, deMinimis: 0,
    currency: 'EUR',
    thresholdBase: 'cif',
    deMinimisStatus: 'abolished',
    deMinimisNote: 'The 150 EUR customs duty relief was removed on 1 July 2026 (Council Regulation (EU) 2026/382). Consignments valued up to 150 EUR now pay a flat 3 EUR duty per item, per tariff heading, until 1 July 2028, after which normal tariff rates apply. VAT has been due from the first euro since 2021.',
    lowValueDuty: { flat: 3, currency: 'EUR', appliesUpTo: 150, effective: '2026-07-01', until: '2028-07-01' },
    detailPage: '/china-to-netherlands-hub',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    rateSource: 'EU TARIC 2026, Dutch Customs (Douane); Council Regulation (EU) 2026/382 (1 Jul 2026)',
    riskNote: 'Rotterdam is the EU\'s largest port of entry. Dutch BTW (21%) is the highest VAT rate in the EU. Bonded warehousing available at Rotterdam — duty and VAT are deferred until goods leave the warehouse.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 3.5, note: 'Re-verified. The 150 EUR customs duty relief was removed on 1 Jul 2026 (Council Regulation (EU) 2026/382); consignments up to 150 EUR now pay a flat 3 EUR duty per item until 1 Jul 2028. Duty rate unchanged.' },
      { date: '2026-07-15', dutyRate: 3.5, note: 'Verified. No changes to Netherlands-specific procedures.' }
    ]
  },

  // ── CHINA → ITALY ──────────────────────────────────────────
  'cn-it-textiles': {
    id: 'cn-it-textiles',
    origin: 'China', destination: 'Italy',
    category: 'Textiles & Leather',
    dutyRate: 12.0, vatRate: 22, deMinimis: 0,
    currency: 'EUR',
    thresholdBase: 'cif',
    deMinimisStatus: 'abolished',
    deMinimisNote: 'The 150 EUR customs duty relief was removed on 1 July 2026 (Council Regulation (EU) 2026/382). Consignments valued up to 150 EUR now pay a flat 3 EUR duty per item, per tariff heading, until 1 July 2028, after which normal tariff rates apply. VAT has been due from the first euro since 2021.',
    lowValueDuty: { flat: 3, currency: 'EUR', appliesUpTo: 150, effective: '2026-07-01', until: '2028-07-01' },
    detailPage: '/china-to-italy-textiles',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    rateSource: 'EU TARIC 2026, Italian Customs (Agenzia Dogane); Council Regulation (EU) 2026/382 (1 Jul 2026)',
    riskNote: 'Italian IVA (22%) is the highest in the EU. Textile imports face elevated EU MFN rates. Anti-dumping duties on certain Chinese synthetic fabrics (Ch. 54-55) may apply — check TARIC for your specific HS code.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 12.0, note: 'Re-verified. The 150 EUR customs duty relief was removed on 1 Jul 2026 (Council Regulation (EU) 2026/382); consignments up to 150 EUR now pay a flat 3 EUR duty per item until 1 Jul 2028. Duty rate unchanged.' },
      { date: '2026-07-15', dutyRate: 12.0, note: 'Verified. EU textile safeguard measures unchanged.' }
    ]
  },

  // ── CHINA → AUSTRALIA ──────────────────────────────────────
  'cn-au': {
    id: 'cn-au',
    origin: 'China', destination: 'Australia',
    category: 'General Cargo',
    dutyRate: 5.0, vatRate: 10, deMinimis: 1000, vatDeMinimis: 1000,
    currency: 'AUD',
    thresholdBase: 'fob',
    detailPage: '/china-to-australia-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'This lane shows the MFN (Working Tariff general) rate. Goods that qualify under an FTA may be nil, subject to meeting the rules of origin.',
    rateSource: 'Australian Customs Tariff Act 1995 (Working Tariff, Sch. 3 general rate), ABF; ChAFTA (in force 20 Dec 2015)',
    riskNote: 'China-Australia FTA (ChAFTA) has eliminated duties on most goods since 2019. The 5% rate applies to non-ChAFTA-qualifying products. AUD $1,000 de minimis applies to both duty and GST.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 5.0, note: 'ChAFTA tariff elimination verified. Most Chinese goods enter duty-free under FTA preference.' }
    ]
  },

  // ── US → AUSTRALIA ─────────────────────────────────────────
  'us-au': {
    id: 'us-au',
    origin: 'United States', destination: 'Australia',
    category: 'General Trade (FTA)',
    dutyRate: 0.0, vatRate: 10, deMinimis: 1000, vatDeMinimis: 1000,
    currency: 'AUD',
    thresholdBase: 'fob',
    detailPage: '/us-to-australia-commerce',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'Unlike the China and UK lanes, this one shows the preferential rate: AUSFTA had eliminated duty on virtually all US-origin goods by 2015. The data layer uses MFN baselines elsewhere, so compare accordingly.',
    rateSource: 'AUSFTA (in force 1 Jan 2005), Sch. 5 to the Australian Customs Tariff Act 1995, ABF',
    riskNote: 'Virtually all US-origin goods enter Australia duty-free under AUSFTA. 10% GST still applies above AUD $1,000. Origin certification (USMCA-style documentation) is required to claim FTA preference.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 0.0, note: 'Verified. AUSFTA preference unchanged since entry into force.' }
    ]
  },

  // ── UK → AUSTRALIA ─────────────────────────────────────────
  'uk-au': {
    id: 'uk-au',
    origin: 'United Kingdom', destination: 'Australia',
    category: 'Retail & Consumer Goods',
    dutyRate: 5.0, vatRate: 10, deMinimis: 1000, vatDeMinimis: 1000,
    currency: 'AUD',
    thresholdBase: 'fob',
    detailPage: '/uk-to-australia-retail',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'This lane shows the MFN (Working Tariff general) rate. Many consumer goods already carry nil duty under A-UKFTA, subject to the staged phase-out and the rules of origin.',
    rateSource: 'Australia-UK FTA (A-UKFTA, in force 31 May 2023), Sch. 15 to the Australian Customs Tariff Act 1995, ABF',
    riskNote: 'UK-Australia FTA progressively eliminates tariffs. Many consumer goods already at zero; the 5% rate covers remaining transitional categories. 10% GST on CIF + duty above AUD $1,000.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 5.0, note: 'UK-Australia FTA implementation progressing. Further reductions expected 2027.' }
    ]
  },

  // ── VIETNAM → US ───────────────────────────────────────────
  'vn-us-textiles': {
    id: 'vn-us-textiles',
    origin: 'Vietnam', destination: 'United States',
    category: 'Apparel & Textiles',
    dutyRate: 14.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 12.5,
        origin: 'Vietnam', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)' }
    ],
    detailPage: '/vietnam-to-us-textiles',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS 2026, US-Vietnam Bilateral Trade Agreement; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Vietnam has emerged as the #2 apparel supplier to the US after China. MFN rates apply — no FTA exists between the US and Vietnam. Some categories face higher rates than the 14.5% composite; verify the exact 10-digit HTS.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 14.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 14.5, note: 'Verified. No changes to Vietnam MFN apparel rates.' }
    ]
  },

  // ── INDIA → US ─────────────────────────────────────────────
  'in-us-jewelry': {
    id: 'in-us-jewelry',
    origin: 'India', destination: 'United States',
    category: 'Gems & Jewelry',
    dutyRate: 6.0, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 10,
        origin: 'India', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)' }
    ],
    detailPage: '/india-to-us-jewelry',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS Chapters 71, 7113-7117, US-India trade (no FTA); CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Cut and polished diamonds enter duty-free under the US-GSP program (if GSP is renewed). Gold jewelry faces 5.5%-6.5% MFN rates. India is not currently a GSP beneficiary — standard MFN rates apply.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 6, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 6.0, note: 'Verified. US GSP renewal still pending in Congress; MFN rates apply until renewed.' }
    ]
  },

  // ── CHINA → MEXICO ─────────────────────────────────────────
  'cn-mx': {
    id: 'cn-mx',
    origin: 'China', destination: 'Mexico',
    category: 'Manufacturing & Maquila',
    dutyRate: 15.0, vatRate: 16, deMinimis: 50, vatDeMinimis: 50,
    currency: 'MXN',
    thresholdBase: 'cif',
    deMinimisCurrency: 'USD',
    deMinimisStatus: 'conditional',
    deMinimisNote: 'Mexico sets its low-value threshold in US dollars, not pesos: USD 50, available to postal shipments from any country and to courier shipments from the US or Canada only. Chinese-origin courier parcels therefore get no de minimis - since 15 Aug 2025 a 33.5% flat global rate applies from the first dollar. Commercial entries have no de minimis at all.',
    dutyLayers: [
      { name: 'Courier global rate (non-treaty origin)', rate: 33.5,
        origin: 'China', tier: 'alternative-regime', basis: 'value', effective: '2025-08-15', replaces: 'IGI and IVA',
        rule: 'A flat 33.5% global rate applies to courier consignments from non-USMCA origins from the first dollar, in place of general import tax and IVA.',
        source: 'Mexico RGCE 2026, rules 3.7.2 and 3.7.35' }
    ],
    detailPage: '/china-to-mexico-maquila',
    lastVerified: '2026-10-16',
    rateStatus: 'under-review',
    rateSource: 'Mexico SAT, TIGIE 2026; Mexico RGCE 2026 rules 3.7.2 & 3.7.35',
    riskNote: 'Mexico has been raising tariffs on Chinese imports since 2024 — the 15% shown is a conservative estimate. Many categories now face 15%-35% duties. Maquiladora (IMMEX) program allows duty deferral for re-export manufacturing. The USD 50 low-value threshold is available to postal shipments and to courier shipments from the US or Canada only; Chinese-origin courier parcels get no de minimis and face a 33.5% flat global rate from the first dollar',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 15, note: 'Re-verified. The low-value threshold is USD-denominated (USD 50), not MXN 50 as recorded, and does not apply to Chinese-origin courier parcels, which face a 33.5% flat global rate from 15 Aug 2025. Duty rate unchanged.' },
      { date: '2026-07-15', dutyRate: 15.0, note: 'Mexico\'s 2026 tariff increases on Chinese textiles and steel products confirmed. Some categories now at 25-35%.' },
      { date: '2025-04-01', dutyRate: 10.0, note: 'Mexico imposed temporary 35% tariff on certain Chinese textile imports.' }
    ]
  },

  // ── JAPAN → US ─────────────────────────────────────────────
  'jp-us-auto': {
    id: 'jp-us-auto',
    origin: 'Japan', destination: 'United States',
    category: 'Auto Parts & OEM Components',
    dutyRate: 2.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 10,
        origin: 'Japan', tier: 'fill', basis: 'MFN', effective: '2026-07-24',
        rule: 'Fill-to rule: MFN plus this duty totals 12.5%. The duty is nil where the MFN rate is already 12.5% or higher. Does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        caveat: 'Auto parts are Section 232 goods in most cases and are exempt from this action.' }
    ],
    detailPage: '/japan-to-us-auto-parts',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS 2026, US-Japan Trade Agreement (2019); CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'US-Japan Trade Agreement (Stage 1) locked in low rates on auto parts. Engine components, transmissions, and electronic control units generally at 2.5% or lower. Aftermarket parts benefit from the $800 Section 321 threshold.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 2.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 2.5, note: 'Verified. US-Japan Trade Agreement terms unchanged.' }
    ]
  },

  // ── KOREA → US ─────────────────────────────────────────────
  'kr-us-electronics': {
    id: 'kr-us-electronics',
    origin: 'South Korea', destination: 'United States',
    category: 'Electronics & Semiconductors',
    dutyRate: 0.0, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 12.5,
        origin: 'South Korea', tier: 'fill', basis: 'MFN', effective: '2026-07-24',
        rule: 'Fill-to rule: MFN plus this duty totals 12.5%. The duty is nil where the MFN rate is already 12.5% or higher. Does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        caveat: 'Semiconductors are Section 232 goods and are exempt from this action. The fill-to rule keys off the MFN rate, not an FTA preferential rate.' }
    ],
    detailPage: '/korea-to-us-electronics',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'KORUS FTA (entered force 2012), USITC HTS; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'KORUS FTA eliminates duties on virtually all Korean electronics, semiconductors, and IT hardware. Origin certification required. $800 Section 321 threshold makes small parcels effortless.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 0, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-15', dutyRate: 0.0, note: 'Verified. KORUS FTA preference rules unchanged.' }
    ]
  },

  // ── CHINA → JAPAN ──────────────────────────────────────────
  'cn-jp': {
    id: 'cn-jp',
    origin: 'China', destination: 'Japan',
    category: 'General Cargo & E-Commerce',
    dutyRate: 3.5, vatRate: 10, deMinimis: 10000, vatDeMinimis: 10000,
    currency: 'JPY',
    thresholdBase: 'cif',
    detailPage: '/china-to-japan-cargo',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    deMinimisNote: 'The ¥10,000 exemption still covers both duty and consumption tax today. From 1 Apr 2028 the FY2026 tax reform removes the consumption-tax side only — the ¥10,000 customs-duty exemption stays. Showing this as historical context rather than a current rate change.',
    rateSource: 'Japan Customs Tariff Schedule 2026; RCEP (in force 1 Jan 2022); NTA/MOF FY2026 tax reform, cross-border e-commerce consumption tax (eff. 1 Apr 2028)',
    riskNote: 'RCEP (effective 2022) created the first China-Japan FTA — many industrial goods are on a staged tariff elimination schedule. ¥10,000 de minimis is generous for e-commerce. JCT (10%) applies to CIF + duty when de minimis is exceeded.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 3.5, note: 'RCEP tariff reductions progressing. Japan Customs 2026 tariff schedule verified.' }
    ]
  },

  // ── GLOBAL TOOLS ───────────────────────────────────────────
  'hscode-global': {
    id: 'hscode-global',
    origin: 'Global', destination: 'Global',
    category: 'HS Code Baseline Estimator',
    dutyRate: 5.5, vatRate: 15, deMinimis: 50, vatDeMinimis: 50,
    currency: 'USD',
    thresholdBase: 'fob',
    detailPage: '/hscode-duty-estimator',
    lastVerified: '2026-10-16',
    rateStatus: 'stable',
    rateSource: 'WTO World Tariff Profiles 2025, UNCTAD TRAINS database; cross-checked 16 Oct 2026 against the official corridor sources used elsewhere in this file',
    riskNote: '5.5% duty and 15% VAT are global median values — use for first-pass estimates only. Actual rates vary by country, product classification, and trade agreements. Always verify against the importing country\'s official tariff schedule.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 5.5, note: 'Global median rates recalibrated against WTO 2025 Tariff Profiles.' }
    ]
  },

  'deminimis-checker': {
    id: 'deminimis-checker',
    origin: 'Global', destination: 'Global',
    category: 'De Minimis Threshold Checker',
    dutyRate: 5.0, vatRate: 10, deMinimis: 50, vatDeMinimis: 50,
    currency: 'USD',
    thresholdBase: 'fob',
    detailPage: '/de-minimis-value-guide',
    lastVerified: '2026-10-16',
    rateStatus: 'under-review',
    rateSource: 'Multiple national customs authorities; re-checked 16 Oct 2026 against the CBP de minimis suspension (E.O. 14324 / E.O. 14388), Council Regulation (EU) 2026/382, Dubai Customs Notice 16/2026 and CBSA Notice 26-23',
    riskNote: 'De minimis thresholds are under active legislative review in multiple jurisdictions. The EU is debating lowering the €150 threshold. The US Congress has proposed reducing Section 321 from $800 to $200. The UK is considering raising its £135 consignment threshold. Monitor developments closely.',
    rateHistory: [
      { date: '2026-07-15', dutyRate: 5.0, note: 'Global de minimis reform proposals tracked. US, EU, and UK all have active legislative proceedings.' }
    ]
  },

  // ── CANADA → UNITED STATES ─────────────────────────────────────
  'ca-us': {
    id: 'ca-us',
    origin: 'Canada', destination: 'United States',
    category: 'Energy, Lumber, Auto & General Merchandise',
    dutyRate: 3.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 10,
        origin: 'Canada', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        caveat: 'Lumber, autos, steel and aluminium are Section 232 goods and are exempt from this action.' }
    ],
    detailPage: '/canada-to-us-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS, USMCA Annex 4-B, DOC AD/CVD orders (softwood lumber); CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Most Canadian goods enter duty-free under USMCA. Softwood lumber is the major exception — AD/CVD rates of 8-18% apply, company-specific. Section 232 steel/aluminum exemption for Canada is quota-based. Re-exported non-North American goods from Canadian warehouses do not qualify for USMCA preference.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 3.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-26', dutyRate: 3.5, note: 'Verified. 3.5% default MFN. USMCA-qualifying goods: 0%. Softwood lumber AD/CVD unchanged in latest DOC review.' },
      { date: '2025-01-01', dutyRate: 3.5, note: 'USMCA Year 5 — full auto RVC rules now in effect.' }
    ]
  },

  // ── MEXICO → UNITED STATES ─────────────────────────────────────
  'mx-us': {
    id: 'mx-us',
    origin: 'Mexico', destination: 'United States',
    category: 'Auto Parts, Electronics Assembly, Fresh Produce & Medical Devices',
    dutyRate: 4.0, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 10,
        origin: 'Mexico', tier: 'additive', basis: 'MFN', effective: '2026-07-24',
        rule: 'Stacks on top of MFN. Stacks with the existing Section 301 China lists; does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        caveat: 'Auto parts are Section 232 goods in most cases and are exempt from this action.' }
    ],
    detailPage: '/mexico-to-us-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS, USMCA Annex 4-B, USDA/AMS seasonal produce tariffs; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'USMCA zero-duty applies to most Mexican goods meeting origin rules. CBP is scrutinizing nearshoring ops with Chinese components. Fresh produce has seasonal duty calendars — check USDA/AMS for your commodity. IMMEX status does not automatically confer USMCA origin.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 4, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-26', dutyRate: 4.0, note: 'Verified. 4.0% default MFN. USMCA auto RVC rules fully phased. Seasonal produce rates unchanged for 2026.' },
      { date: '2025-06-01', dutyRate: 4.0, note: 'CBP intensified Mexico nearshoring origin audits. Enforcement actions on electronics and solar products.' }
    ]
  },

  // ── TAIWAN → UNITED STATES ─────────────────────────────────────
  'tw-us': {
    id: 'tw-us',
    origin: 'Taiwan', destination: 'United States',
    category: 'Semiconductors, Electronics, IT Components & Bicycles',
    dutyRate: 1.5, vatRate: 0, deMinimis: 0,
    currency: 'USD',
    thresholdBase: 'fob',
    deMinimisStatus: 'suspended',
    deMinimisNote: 'No duty de minimis. The $800 Section 321 exemption was suspended for all countries on 29 Aug 2025 (E.O. 14324) and made indefinite by CBP rule in June 2026 (E.O. 14388). Bona fide gifts of $100 or less and personal articles accompanying travellers remain exempt.',
    dutyLayers: [
      { name: 'Section 301 - forced-labour action', rate: 8.5,
        origin: 'Taiwan, China', tier: 'fill', basis: 'MFN', effective: '2026-07-24',
        rule: 'Fill-to rule: MFN plus this duty totals 10%. The duty is nil where the MFN rate is already 10% or higher. Does not stack with Section 232 duties.',
        source: 'USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
        caveat: 'Semiconductors are Section 232 goods and are exempt from this action.' }
    ],
    detailPage: '/taiwan-to-us-semiconductors',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    rateSource: 'USITC HTS, WTO ITA Annex A & B (1996 & 2015), DOC AD/CVD orders; CBP de minimis suspension, E.O. 14324 / 14388, 91 FR 120 (24 Jun 2026); USTR Section 301 forced-labour action, FR 2026-15181 (28 Jul 2026)',
    riskNote: 'Semiconductors (HS 8541) and ICs (HS 8542) enter at zero under the WTO ITA — no FTA needed. Non-ITA electronics pay 0-5% MFN. No Section 301: Taiwan is not subject to China-specific tariffs. Steel and solar cells face separate AD orders.',
    rateHistory: [
      { date: '2026-10-16', dutyRate: 1.5, note: 'Re-verified against CBP and USTR sources. The $800 de minimis was found suspended for all countries (E.O. 14324/14388) and the threshold set to none. The forced-labour Section 301 layer effective 24 Jul 2026 was added to dutyLayers. MFN rate itself unchanged.' },
      { date: '2026-07-26', dutyRate: 1.5, note: 'Verified. ITA zero rates on chips/ICs/PCBs unchanged. 1.5% blended default for non-ITA electronics.' },
      { date: '2025-03-01', dutyRate: 1.5, note: 'ITA-II expansion products confirmed at zero. Taiwan steel AD orders unchanged.' }
    ]
  },

  // ── CHINA → GULF (GCC) ──────────────────────────────────────
  'cn-sa': {
    id: 'cn-sa',
    origin: 'China', destination: 'Saudi Arabia',
    category: 'General Cargo & E-Commerce',
    dutyRate: 5, vatRate: 15, deMinimis: 1000,
    currency: 'SAR',
    thresholdBase: 'cif',
    detailPage: '/china-to-gcc-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'under-review',
    deMinimisNote: 'The SAR 1,000 threshold follows GCC common practice and published ZATCA statements rather than a single consolidated instrument. Confirm the threshold and any excluded categories with ZATCA or your broker before pricing a low-value shipment.',
    rateSource: 'GCC Common External Tariff; ZATCA (Saudi customs), SAR 1,000 duty de minimis, 15% VAT; GCC/KSA e-commerce customs framework (WCO submission)',
    riskNote: '5% GCC duty on most goods, but Saudi adds 12-20% protective duty on goods competing with local manufacturing. Mandatory SABER/SASO conformity certificates for apparel, electronics and toys before arrival. 15% VAT (highest in the GCC) applies from the first riyal even under the SAR 1,000 duty-free threshold.',
    rateHistory: [
      { date: '2026-09-14', dutyRate: 5, note: 'Verified. GCC 5% tariff and 15% VAT unchanged. SABER requirement confirmed for consumer goods.' },
      { date: '2025-07-01', dutyRate: 5, note: 'Saudi VAT stable at 15% since July 2020 increase.' }
    ]
  },

  'cn-ae': {
    id: 'cn-ae',
    origin: 'China', destination: 'United Arab Emirates',
    category: 'General Cargo & E-Commerce',
    dutyRate: 5, vatRate: 5, deMinimis: 1000,
    currency: 'AED',
    thresholdBase: 'cif',
    detailPage: '/china-to-gcc-duty',
    lastVerified: '2026-10-16',
    rateStatus: 'changed-recently',
    deMinimisStatus: 'conditional',
    deMinimisCurrency: 'AED',
    deMinimisNote: 'Dubai Customs Notice 16/2026 raised the cross-border e-commerce duty-free threshold from AED 300 to AED 1,000 effective 3 Aug 2026. This is a Dubai emirate rule, not a UAE federal threshold, and tobacco, alcohol and vaping products are excluded. Other emirates follow their own rules.',
    rateSource: 'GCC Common External Tariff; Dubai Customs Notice No. 16/2026 (eff. 3 Aug 2026), AED 1,000 e-commerce duty exemption; UAE Federal Tax Authority, 5% VAT',
    riskNote: '5% GCC duty plus 5% VAT — the lowest combined tax load for a major Gulf market. Jebel Ali (JAFZA) free zone allows duty-free entry for re-export. Goods merely shipped via a free zone without genuine GCC origin do not qualify for intra-GCC duty exemption.',
    rateHistory: [
      { date: '2026-08-03', dutyRate: 5, note: 'Dubai Customs Notice 16/2026 raised the cross-border e-commerce duty-free threshold from AED 300 to AED 1,000. De minimis re-based from AED 980 to AED 1,000.' },
      { date: '2026-09-14', dutyRate: 5, note: 'Verified. 5% duty and 5% VAT unchanged. AED 980 de minimis confirmed.' },
      { date: '2023-03-01', dutyRate: 5, note: 'De minimis reverted to GCC-wide AED 980 after the brief AED 300 period.' }
    ]
  }

};

// ── INTELLIGENCE FEED ─────────────────────────────────────
// Curated tariff policy updates. Add new entries at the top.
// Each entry can link to a calculator corridor via `relatedCorridor`.

var INTEL_FEED = [
  {
    date: '2026-07-24',
    title: 'CBP Issues Guidance on USMCA Nearshoring Origin Verification — Auto Parts and Electronics Under Heightened Review',
    summary: 'US Customs has released updated enforcement guidelines for USMCA origin claims on goods assembled in Mexico and Canada from non-North American components. Importers must now maintain detailed bills of materials and manufacturing process records for any USMCA claim where the assembly operation involves inputs from outside the USMCA region. CBP can request these records during entry or post-entry audit.',
    relatedCorridor: 'mx-us',
    tags: ['USMCA', 'CBP', 'nearshoring', 'origin verification', 'enforcement'],
    urgency: 'warning'
  },
  {
    date: '2026-07-15',
    title: 'CBP Tightens De Minimis Cargo Scrutiny — T86 Entry Processing Times Double at LAX/LGB',
    summary: 'US Customs has increased manifest holds on Section 321 (Type 86) entries, particularly for Chinese e-commerce parcels. Average clearance time has risen from 4 hours to 8-12 hours at major West Coast ports. No change to the $800 threshold itself, but the administrative burden on importers is real.',
    relatedCorridor: 'cn-us-apparel',
    tags: ['de minimis', 'CBP', 'e-commerce', 'enforcement'],
    urgency: 'warning'
  },
  {
    date: '2026-07-15',
    title: 'USTR Opens 2026 Section 301 Exclusion Review for Chinese Textiles — Public Comment Period Through July 15',
    summary: 'The US Trade Representative is accepting public comments on whether to renew, modify, or terminate Section 301 tariff exclusions for specific apparel and textile categories from China. This affects HTS Chapters 61, 62, and 63. Importers should submit comments for categories critical to their supply chains.',
    relatedCorridor: 'cn-us-apparel',
    tags: ['Section 301', 'USTR', 'textiles', 'exclusions'],
    urgency: 'critical'
  },
  {
    date: '2026-07-15',
    title: 'Mexico Raises Tariffs on Chinese Steel and Textiles — New Rates Hit 25-35%',
    summary: 'Mexico\'s SAT has published new tariff rates on 544 HS tariff lines from China — predominantly steel products and synthetic textiles. The increases range from 25% to 35% and took effect June 1, 2026. Importers should verify their HS codes against the updated TIGIE schedule.',
    relatedCorridor: 'cn-mx',
    tags: ['Mexico', 'tariff increase', 'textiles', 'steel'],
    urgency: 'critical'
  },
  {
    date: '2026-07-15',
    title: 'EU Considering Lowering De Minimis from €150 to €50 for E-Commerce Imports',
    summary: 'The European Commission has published a proposal to reduce the customs duty de minimis threshold from €150 to €50, citing a 400% increase in low-value e-commerce parcels from non-EU countries since 2020. If adopted, it would take effect January 2027. This would significantly impact Chinese DTC sellers shipping to EU consumers.',
    relatedCorridor: 'cn-de',
    tags: ['EU', 'de minimis', 'e-commerce', 'regulatory'],
    urgency: 'warning'
  },
  {
    date: '2026-07-15',
    title: 'RCEP Tariff Reductions: China-Japan Industrial Goods Hit Year 4 of Phase-Down',
    summary: 'The RCEP tariff elimination schedule for China-Japan trade enters its fourth year. An additional 8% of industrial tariff lines — mostly machinery, chemicals, and plastics — now face reduced or zero rates. Importers should re-check their HS codes against the 2026 Japan Customs Tariff Schedule to capture newly eligible preferences.',
    relatedCorridor: 'cn-jp',
    tags: ['RCEP', 'Japan', 'FTA', 'tariff reduction'],
    urgency: 'info'
  },
  {
    date: '2026-07-15',
    title: 'UK-Australia FTA: Further Tariff Cuts on Consumer Goods Take Effect',
    summary: 'The third annual tranche of UK-Australia FTA tariff reductions is now in force. Most remaining consumer goods categories have moved to zero or near-zero rates. UK exporters to Australia should file FTA preference claims to capture the new rates.',
    relatedCorridor: 'uk-au',
    tags: ['UK', 'Australia', 'FTA', 'tariff reduction'],
    urgency: 'info'
  }
];

// ── HELPER: Determine freshness tier from lastVerified date ──
function getFreshnessTier(lastVerified) {
  var days = Math.floor((Date.now() - new Date(lastVerified).getTime()) / 86400000);
  if (days <= 30) return 'fresh';     // green
  if (days <= 90) return 'stale';     // yellow
  return 'expired';                    // red
}
