import {
  buildDeviceCookie,
  detectDevice,
  getOrCreateDeviceId,
  getStoreUrls,
  logOpenEvent,
} from "./_shared.js";

export async function onRequest(context) {
  const { request, env } = context;

  const uaRaw = request.headers.get("user-agent") || "";
  const device = detectDevice(uaRaw);

  const { deviceId, isNew } = getOrCreateDeviceId(request);
  const setCookie = isNew ? buildDeviceCookie(deviceId) : null;

  const { iosStore, androidStore } = getStoreUrls(env);
  const target = device.isIOS ? iosStore : device.isAndroid ? androidStore : "/?landing=1";

  // Log (best-effort)
  logOpenEvent(context, {
    device_id: deviceId,
    event_type: "store_redirect",
    path: "/app",
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
