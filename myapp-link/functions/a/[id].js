import {
  buildDeviceCookie,
  detectDevice,
  getOrCreateDeviceId,
  getStoreUrls,
  logOpenEvent,
  parseTrackingParams,
} from "../_shared.js";

export async function onRequest(context) {
  const { params, request, env } = context;
  const url = new URL(request.url);
  const tracking = parseTrackingParams(url);

  const idRaw = params.id;
  const attractionId = Number.parseInt(idRaw, 10);

  const uaRaw = request.headers.get("user-agent") || "";
  const device = detectDevice(uaRaw);

  const { deviceId, isNew } = getOrCreateDeviceId(request);
  const setCookie = isNew ? buildDeviceCookie(deviceId) : null;

  const deepLinkUrl = new URL(`traveltale://traveltale.app/attraction/${idRaw}`);
  if (tracking.ref) deepLinkUrl.searchParams.set("ref", tracking.ref);
  if (tracking.src) deepLinkUrl.searchParams.set("src", tracking.src);
  if (tracking.utm.utm_source) deepLinkUrl.searchParams.set("utm_source", tracking.utm.utm_source);
  if (tracking.utm.utm_medium) deepLinkUrl.searchParams.set("utm_medium", tracking.utm.utm_medium);
  if (tracking.utm.utm_campaign) deepLinkUrl.searchParams.set("utm_campaign", tracking.utm.utm_campaign);
  const deepLink = deepLinkUrl.toString();

  const { iosStore, androidStore } = getStoreUrls(env);
  const storeUrl = device.isIOS
    ? iosStore
    : device.isAndroid
    ? androidStore
    : "https://download.traveltale.app/?landing=1";

  // Landing page link for desktop, preserve tracking params
  const landingUrlObj = new URL("https://download.traveltale.app/?landing=1");
  if (tracking.ref) landingUrlObj.searchParams.set("ref", tracking.ref);
  if (tracking.src) landingUrlObj.searchParams.set("src", tracking.src);
  if (tracking.utm.utm_source) landingUrlObj.searchParams.set("utm_source", tracking.utm.utm_source);
  if (tracking.utm.utm_medium) landingUrlObj.searchParams.set("utm_medium", tracking.utm.utm_medium);
  if (tracking.utm.utm_campaign) landingUrlObj.searchParams.set("utm_campaign", tracking.utm.utm_campaign);
  const landingUrl = landingUrlObj.toString();

  // Log
  logOpenEvent(context, {
    device_id: deviceId,
    event_type: "deep_link_page_open",
    path: url.pathname,
    attraction_id: Number.isFinite(attractionId) ? attractionId : null,
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

  const shouldAutoStoreRedirect = device.isMobile && !device.isInAppBrowser;

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
    code{background:#f3f4f6;padding:2px 6px;border-radius:8px}
  </style>
</head>
<body>
  <div class="card">
    <h2>Opening Travel Tale…</h2>
    <p class="note">
      Attraction: <code>${idRaw}</code><br />
      If nothing happens, tap <b>Open in app</b>.
      ${device.isInAppBrowser ? 'If you are inside Instagram/TikTok, use “Open in Browser”.' : ""}
    </p>

    <a class="btn primary" href="${deepLink}">Open in app</a>
    <a class="btn secondary" href="${storeUrl}">Download the app</a>

    <p class="note" style="margin-top:12px">
      If you’re on desktop: <a href="${landingUrl}">open landing page</a>
    </p>
  </div>

  <script>
    const deepLink = ${JSON.stringify(deepLink)};
    const storeUrl = ${JSON.stringify(storeUrl)};
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
