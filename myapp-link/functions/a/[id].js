import {
  buildDeviceCookie,
  detectDevice,
  getOrCreateDeviceId,
  getStoreUrls,
  logOpenEvent,
} from "../_shared.js";

export async function onRequest(context) {
  const { params, request, env } = context;
  const idRaw = params.id;
  const attractionId = Number.parseInt(idRaw, 10);

  const uaRaw = request.headers.get("user-agent") || "";
  const device = detectDevice(uaRaw);

  const { deviceId, isNew } = getOrCreateDeviceId(request);
  const setCookie = isNew ? buildDeviceCookie(deviceId) : null;

  // Your deep link scheme
  const deepLink = `traveltale://traveltale.app/attraction/${idRaw}`;

  const { iosStore, androidStore } = getStoreUrls(env);
  const storeUrl = device.isIOS ? iosStore : device.isAndroid ? androidStore : "https://download.traveltale.app/?landing=1";

  // Log open attempt (server-side)
  logOpenEvent(context, {
    device_id: deviceId,
    event_type: "deep_link_page_open",
    path: `/a/${idRaw}`,
    attraction_id: Number.isFinite(attractionId) ? attractionId : null,
    platform: device.platform,
    device_type: device.deviceType,
    is_in_app_browser: device.isInAppBrowser,
    user_agent: uaRaw,
    referer: request.headers.get("referer"),
  });

  // Important behavior:
  // - If app is installed -> opening deepLink should launch it.
  // - If not installed -> user should be able to go to store easily.
  // Auto-redirect to store is helpful, but can be annoying if user cancels the prompt.
  // So we only auto-redirect when NOT in an in-app browser (IG/TikTok/etc), because in-app browsers often block deep linking.
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
    .pill{display:inline-block;font-size:12px;padding:7px 10px;border-radius:999px;background:rgba(195,125,255,.14);border:1px solid rgba(195,125,255,.30);color:#4b1e8f;margin-bottom:10px}
  </style>
</head>
<body>
  <div class="card">
    <div class="pill">Attraction ID: ${idRaw}</div>
    <h2>Opening Travel Tale…</h2>
    <p class="note">
      If nothing happens, tap <b>Open in app</b>.
      ${device.isInAppBrowser ? 'If you are inside Instagram/TikTok, use “Open in Browser”.' : ''}
    </p>

    <a class="btn primary" id="openBtn" href="${deepLink}">Open in app</a>
    <a class="btn secondary" id="downloadBtn" href="${storeUrl}">Download the app</a>

    <p class="note" style="margin-top:12px">
      If you’re on desktop: <a href="https://download.traveltale.app/?landing=1">open landing page</a>
    </p>
  </div>

  <script>
    const deepLink = ${JSON.stringify(deepLink)};
    const storeUrl = ${JSON.stringify(storeUrl)};
    const shouldAutoStoreRedirect = ${JSON.stringify(shouldAutoStoreRedirect)};

    // Try opening app quickly
    window.location.href = deepLink;

    // Only auto-redirect to store in normal browsers (not IG/TikTok webview)
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
