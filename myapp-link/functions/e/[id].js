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

  const uaRaw = request.headers.get("user-agent") || "";
  const device = detectDevice(uaRaw);

  const { deviceId, isNew } = getOrCreateDeviceId(request);
  const setCookie = isNew ? buildDeviceCookie(deviceId) : null;

  // Deep link to Experience inside the app
  // IMPORTANT: change "experience" if your FlutterFlow deep link route key is different.
  const deepLinkUrl = new URL(`traveltale://traveltale.app/experience/${idRaw}`);
  if (tracking.ref) deepLinkUrl.searchParams.set("ref", tracking.ref);
  if (tracking.src) deepLinkUrl.searchParams.set("src", tracking.src);
  if (tracking.utm.utm_source) deepLinkUrl.searchParams.set("utm_source", tracking.utm.utm_source);
  if (tracking.utm.utm_medium) deepLinkUrl.searchParams.set("utm_medium", tracking.utm.utm_medium);
  if (tracking.utm.utm_campaign) deepLinkUrl.searchParams.set("utm_campaign", tracking.utm.utm_campaign);
  if (tracking.utm.utm_content) deepLinkUrl.searchParams.set("utm_content", tracking.utm.utm_content);
  if (tracking.utm.utm_term) deepLinkUrl.searchParams.set("utm_term", tracking.utm.utm_term);

  const deepLink = deepLinkUrl.toString();

  const { iosStore, androidStore } = getStoreUrls(env);
  const storeUrl = device.isIOS ? iosStore : device.isAndroid ? androidStore : "https://download.traveltale.app/?landing=1";

  // Desktop fallback landing, preserve tracking
  const landingUrlObj = new URL("https://download.traveltale.app/?landing=1");
  if (tracking.ref) landingUrlObj.searchParams.set("ref", tracking.ref);
  if (tracking.src) landingUrlObj.searchParams.set("src", tracking.src);
  if (tracking.utm.utm_source) landingUrlObj.searchParams.set("utm_source", tracking.utm.utm_source);
  if (tracking.utm.utm_medium) landingUrlObj.searchParams.set("utm_medium", tracking.utm.utm_medium);
  if (tracking.utm.utm_campaign) landingUrlObj.searchParams.set("utm_campaign", tracking.utm.utm_campaign);
  if (tracking.utm.utm_content) landingUrlObj.searchParams.set("utm_content", tracking.utm.utm_content);
  if (tracking.utm.utm_term) landingUrlObj.searchParams.set("utm_term", tracking.utm.utm_term);
  const landingUrl = landingUrlObj.toString();

  // Log open (server-side)
  logOpenEvent(context, {
    device_id: deviceId,
    event_type: "deep_link_page_open",
    path: `/e/${idRaw}`,
    attraction_id: null, // keep null (your analytics table definitely has attraction_id)
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
    :root{--accent:#C37DFF;--text:#111827;--muted:#6b7280;--border:#eef0f4;}
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:0;padding:20px;background:#fff;color:var(--text)}
    .card{max-width:520px;margin:0 auto;background:#fff;border-radius:18px;padding:18px;border:1px solid var(--border);box-shadow:0 10px 28px rgba(17,24,39,.08)}
    h2{margin:0 0 8px;font-size:20px}
    p{margin:0 0 12px;color:var(--muted);line-height:1.4}
    .btn{display:block;text-align:center;margin:10px 0;padding:14px 14px;border-radius:12px;text-decoration:none;font-weight:800}
    .primary{background:var(--accent);color:#fff}
    .secondary{background:#f3f4f6;color:#111827}
    .small{font-size:13px;color:var(--muted)}
  </style>
</head>
<body>
  <div class="card">
    <h2>Opening Travel Tale…</h2>
    <p>If nothing happens, tap “Open in app”. If you’re in Instagram/TikTok, use “Open in Browser”.</p>

    <a class="btn primary" href="${deepLink}">Open in app</a>
    <a class="btn secondary" href="${storeUrl}">Download the app</a>

    <p class="small">Or continue on desktop: <a href="${landingUrl}">${landingUrl}</a></p>
  </div>

  <script>
    const deepLink = ${JSON.stringify(deepLink)};
    const storeUrl = ${JSON.stringify(storeUrl)};
    const shouldAutoStoreRedirect = ${JSON.stringify(shouldAutoStoreRedirect)};

    // try open app
    window.location.href = deepLink;

    if (shouldAutoStoreRedirect) {
      setTimeout(() => {
        if (!document.hidden) window.location.href = storeUrl;
      }, 1300);
    }
  </script>
</body>
</html>`;

  const headers = { "content-type": "text/html; charset=UTF-8" };
  if (setCookie) headers["set-cookie"] = setCookie;

  return new Response(html, { headers });
}
