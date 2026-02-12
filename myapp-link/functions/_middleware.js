import {
  buildDeviceCookie,
  detectDevice,
  getOrCreateDeviceId,
  getStoreUrls,
  logOpenEvent,
} from "./_shared.js";

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

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

  // Log redirect hit (do not block redirect)
  logOpenEvent(context, {
    device_id: deviceId,
    event_type: "root_store_redirect",
    path: url.pathname,
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
