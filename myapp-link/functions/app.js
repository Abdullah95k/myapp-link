import {
  buildDeviceCookie,
  detectDevice,
  getOrCreateDeviceId,
  getStoreUrls,
  logOpenEvent,
  parseTrackingParams,
} from "./_shared.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const tracking = parseTrackingParams(url);

  const uaRaw = request.headers.get("user-agent") || "";
  const device = detectDevice(uaRaw);

  const { deviceId, isNew } = getOrCreateDeviceId(request);
  const setCookie = isNew ? buildDeviceCookie(deviceId) : null;

  const { iosStore, androidStore } = getStoreUrls(env);
  const target = device.isIOS ? iosStore : device.isAndroid ? androidStore : "/?landing=1";

  logOpenEvent(context, {
    device_id: deviceId,
    event_type: "app_store_redirect",
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
