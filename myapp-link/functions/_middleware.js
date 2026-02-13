import {
  buildDeviceCookie,
  detectDevice,
  getOrCreateDeviceId,
  getStoreUrls,
  logOpenEvent,
  parseTrackingParams,
} from "./_shared.js";

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  const tracking = parseTrackingParams(url);

  // Force landing page even on mobile: /?landing=1
  const forceLanding = url.searchParams.get("landing") === "1";

  if (url.pathname !== "/") {
    return next();
  }

  const uaRaw = request.headers.get("user-agent") || "";
  const device = detectDevice(uaRaw);

  const { deviceId, isNew } = getOrCreateDeviceId(request);
  const setCookie = isNew ? buildDeviceCookie(deviceId) : null;

  // If forced landing OR desktop => serve landing page (public/index.html)
  if (forceLanding || !device.isMobile) {
    const resp = await next();

    if (setCookie) resp.headers.append("Set-Cookie", setCookie);

    // Log landing view
    await logOpenEvent(context, {
      device_id: deviceId,
      event_type: "landing_view",
      path: url.pathname,
      ref_code: tracking.ref,
      source: tracking.src,
      utm_source: tracking.utm.utm_source,
      utm_medium: tracking.utm.utm_medium,
      utm_campaign: tracking.utm.utm_campaign,
      utm_content: tracking.utm.utm_content,
      utm_term: tracking.utm.utm_term,
      platform: device.platform,
      device_type: device.deviceType,
      is_in_app_browser: device.isInAppBrowser,
      user_agent: uaRaw,
      referer: request.headers.get("referer"),
    });

    return resp;
  }

  // Mobile on "/" => Store redirect helper
  const { iosStore, androidStore } = getStoreUrls(env);
  const target = device.isIOS ? iosStore : device.isAndroid ? androidStore : "/?landing=1";

  // Optional: make "/" behave like an app-open link (useful for QR codes not tied to a specific attraction)
  // Example: https://download.traveltale.app/?open=1&ref=QR_BAGHDAD_001
  const wantsOpenHelper = url.searchParams.get("open") === "1";
  if (wantsOpenHelper) {
    const deepLinkUrl = new URL("traveltale://traveltale.app/");
    if (tracking.ref) deepLinkUrl.searchParams.set("ref", tracking.ref);
    if (tracking.src) deepLinkUrl.searchParams.set("src", tracking.src);
    if (tracking.utm.utm_source) deepLinkUrl.searchParams.set("utm_source", tracking.utm.utm_source);
    if (tracking.utm.utm_medium) deepLinkUrl.searchParams.set("utm_medium", tracking.utm.utm_medium);
    if (tracking.utm.utm_campaign)
      deepLinkUrl.searchParams.set("utm_campaign", tracking.utm.utm_campaign);
    const deepLink = deepLinkUrl.toString();

    const shouldAutoStoreRedirect = device.isMobile && !device.isInAppBrowser;

    logOpenEvent(context, {
      device_id: deviceId,
      event_type: "root_open_helper",
      path: url.pathname,
      ref_code: tracking.ref,
      source: tracking.src,
      utm_source: tracking.utm.utm_source,
      utm_medium: tracking.utm.utm_medium,
      utm_campaign: tracking.utm.utm_campaign,
      utm_content: tracking.utm.utm_content,
      utm_term: tracking.utm.utm_term,
      platform: device.platform,
      device_type: device.deviceType,
      is_in_app_browser: device.isInAppBrowser,
      user_agent: uaRaw,
      referer: request.headers.get("referer"),
    });

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#C37DFF" />
  <title>Open Travel Tale</title>
  <style>
    :root{--accent:#C37DFF;--accent2:#7A35FF;--text:#111827;--muted:#6b7280;--border:#eef0f4;}
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:0;padding:20px;background:radial-gradient(1200px 600px at 50% -20%, rgba(195,125,255,.22), transparent 60%), #fff;color:var(--text)}
    .card{max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:18px;border:1px solid var(--border);box-shadow:0 10px 28px rgba(17,24,39,.08)}
    h2{margin:0 0 8px;font-size:20px}
    .note{font-size:13px;color:var(--muted);line-height:1.45;margin:0 0 12px}
    .btn{display:block;text-align:center;margin:10px 0;padding:14px 14px;border-radius:14px;text-decoration:none;font-weight:800;border:1px solid transparent}
    .primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
    .secondary{background:#fff;color:var(--text);border-color:var(--border)}
  </style>
</head>
<body>
  <div class="card">
    <h2>Opening Travel Tale…</h2>
    <p class="note">
      If nothing happens, tap <b>Open in app</b>.
      ${device.isInAppBrowser ? 'If you are inside Instagram/TikTok, use “Open in Browser”.' : ""}
    </p>

    <a class="btn primary" href="${deepLink}">Open in app</a>
    <a class="btn secondary" href="${target}">Download the app</a>
  </div>

  <script>
    const deepLink = ${JSON.stringify(deepLink)};
    const storeUrl = ${JSON.stringify(target)};
    const shouldAutoStoreRedirect = ${JSON.stringify(shouldAutoStoreRedirect)};

    // Try opening the app
    window.location.href = deepLink;

    // If the app didn't open, send user to the store (normal browsers only)
    if (shouldAutoStoreRedirect) {
      setTimeout(() => {
        if (!document.hidden) window.location.href = storeUrl;
      }, 1600);
    }
  </script>
</body>
</html>`;

    const headers = new Headers({
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store",
    });
    if (setCookie) headers.append("Set-Cookie", setCookie);

    return new Response(html, { headers });
  }

  // Log redirect hit (do not block redirect)
  logOpenEvent(context, {
    device_id: deviceId,
    event_type: "root_store_redirect",
    path: url.pathname,
    ref_code: tracking.ref,
    source: tracking.src,
    utm_source: tracking.utm.utm_source,
    utm_medium: tracking.utm.utm_medium,
    utm_campaign: tracking.utm.utm_campaign,
    utm_content: tracking.utm.utm_content,
    utm_term: tracking.utm.utm_term,
    platform: device.platform,
    device_type: device.deviceType,
    is_in_app_browser: device.isInAppBrowser,
    user_agent: uaRaw,
    referer: request.headers.get("referer"),
  });

  const headers = new Headers({
    Location: target,
    "Cache-Control": "no-store",
  });
  if (setCookie) headers.append("Set-Cookie", setCookie);

  return new Response(null, { status: 302, headers });
}
