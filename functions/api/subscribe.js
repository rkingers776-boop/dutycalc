/**
 * POST /api/subscribe
 *
 * Why this route exists:
 *
 * The production site carries a CSP **response header** that this repo does not
 * own - `connect-src 'self'`, `form-action 'self'`. A meta tag cannot loosen a
 * header, because the browser intersects every policy it receives. That blocked
 * both browser-side paths to any external form backend at once.
 *
 * A same-origin path satisfies both directives, and the forward happens here, in
 * the worker, where CSP does not apply.
 *
 * Upstream selection:
 *   env.SUBSCRIBE_UPSTREAM   full POST URL of any JSON-accepting form endpoint
 *                            (Web3Forms, Formspree, a self-hosted collector).
 *                            Set it in the Pages project's environment
 *                            variables; no code change needed.
 *   default                  FormSubmit's AJAX endpoint.
 *
 * Note on the default: FormSubmit rate-limits the shared Cloudflare egress
 * ranges (HTTP 429), so it does not deliver reliably from this worker. The
 * default is kept only so the route degrades predictably; set
 * SUBSCRIBE_UPSTREAM to make it actually work.
 *
 * Why no 502 anywhere below: on the production custom domain the edge replaces
 * any 502 this Function returns with its own plain-text "error code: 502" page,
 * body and content-type both gone. Measured against 200/400/429/500/503, which
 * all pass through intact - 502 is the one status that gets rewritten. The
 * browser then cannot read the JSON and cannot tell rate limiting apart from a
 * dropped connection, so upstream failures answer 503 and a rate limit answers
 * 429, matching what actually happened.
 */

const DEFAULT_UPSTREAM = 'https://formsubmit.co/ajax/admin@dutycalc.online';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function onRequestPost(context) {
  try {
    return await handleSubscribe(context);
  } catch (err) {
    // Anything that escapes would otherwise surface as the platform's HTML 502
    // page, which says nothing about what broke.
    return json({
      success: 'false',
      message: 'handler error',
      detail: String((err && err.stack) || err).slice(0, 400)
    }, 500);
  }
}

async function handleSubscribe(context) {
  const request = context.request;
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  const debug = new URL(request.url).searchParams.get('debug') === '1';

  // A native form POST (the calculator CTA path) expects a page back, not JSON.
  const wantsHtml = (request.headers.get('accept') || '').indexOf('text/html') !== -1;

  let raw = '';
  try {
    if (contentType.indexOf('application/json') !== -1) {
      const data = await request.json();
      raw = data && data.email ? String(data.email) : '';
    } else {
      const form = await request.formData();
      raw = String(form.get('email') || '');
    }
  } catch (err) {
    return finish(wantsHtml, request, { success: 'false', message: 'Unreadable request body' }, 400, 'failed');
  }

  const email = raw.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return finish(wantsHtml, request, { success: 'false', message: 'Enter a valid email address' }, 400, 'invalid');
  }

  // Backend preference, in order:
  //   1. env.SUBSCRIBERS   KV namespace binding. Data stays in the owner's own
  //                        Cloudflare account, which is the right default for a
  //                        list that is meant to be an asset.
  //   2. env.SUBSCRIBE_UPSTREAM   any JSON form endpoint that accepts a POST.
  //   3. FormSubmit  - rate limited from Cloudflare egress, see header note.
  if (context.env && context.env.SUBSCRIBERS && typeof context.env.SUBSCRIBERS.put === 'function') {
    try {
      await context.env.SUBSCRIBERS.put('sub:' + email, JSON.stringify({
        email: email,
        first: new Date().toISOString(),
        source: request.headers.get('referer') || 'direct',
        ua: (request.headers.get('user-agent') || '').slice(0, 180)
      }));
      return finish(wantsHtml, request, { success: 'true', message: 'subscribed', store: 'kv' }, 200, 'ok');
    } catch (err) {
      return finish(wantsHtml, request, {
        success: 'false',
        message: 'Could not store the address',
        detail: debug ? String((err && err.message) || err) : undefined
      }, 503, 'failed');
    }
  }

  const upstreamUrl = (context.env && context.env.SUBSCRIBE_UPSTREAM) || DEFAULT_UPSTREAM;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': 'DutyCalc/1.0 (+https://www.dutycalc.online)'
      },
      body: JSON.stringify({
        email: email,
        subject: 'DutyCalc - new rate-change subscriber',
        _subject: 'DutyCalc - new rate-change subscriber',
        _template: 'table',
        _captcha: 'false'
      }),
      signal: AbortSignal.timeout(9000)
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return finish(wantsHtml, request, {
        success: 'false',
        message: upstream.status === 429
          ? 'The delivery service is rate limiting us'
          : 'The delivery service refused the address',
        status: upstream.status,
        detail: debug ? text.slice(0, 300) : undefined
      }, upstream.status === 429 ? 429 : 503, 'failed');
    }

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      parsed = null;
    }

    if (parsed && String(parsed.success) === 'false') {
      return finish(wantsHtml, request, { success: 'false', message: 'The delivery service refused the address' }, 503, 'failed');
    }

    return finish(wantsHtml, request, { success: 'true', message: 'subscribed' }, 200, 'ok');
  } catch (err) {
    return finish(wantsHtml, request, {
      success: 'false',
      message: 'The delivery service is unreachable',
      detail: debug ? String((err && err.message) || err) : undefined
    }, 503, 'failed');
  }
}

// JSON for fetch callers, a redirect for native form posts.
function finish(wantsHtml, request, body, status, state) {
  if (!wantsHtml) return json(body, status);
  const target = new URL('/newsletter', request.url);
  target.searchParams.set('subscribe', state);
  return new Response(null, { status: 303, headers: { location: target.toString() } });
}

export async function onRequestGet() {
  return json({ success: 'false', message: 'Use POST' }, 405);
}
