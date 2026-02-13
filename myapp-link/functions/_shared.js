// Shared helpers for Cloudflare Pages Functions (ESM)
const DEVICE_COOKIE = "tt_did";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function detectDevice(userAgentRaw) {
  const ua = (userAgentRaw || "").toLowerCase();

  const isIOS =
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod") ||
    (ua.includes("macintosh") && ua.includes("mobile")); // iPadOS Safari

  const isAndroid = ua.includes("android");
  const isMobile = isIOS || isAndroid;

  // In-app browser detection (best-effort)
  const isInAppBrowser =
    ua.includes("instagram") ||
    ua.includes("fbav") ||
    ua.includes("fban") ||
    ua.includes("fb_iab") ||
    ua.includes("tiktok") ||
    ua.includes("snapchat") ||
    ua.includes("line/") ||
    ua.includes("telegram") ||
    ua.includes("twitter") ||
    ua.includes("x.com") ||
    ua.includes("wv"); // Android WebView marker (often)

  const platform = isIOS ? "ios" : isAndroid ? "android" : "desktop";
  const deviceType = isMobile ? "mobile" : "desktop";

  return { ua, isIOS, isAndroid, isMobile, isInAppBrowser, platform, deviceType };
}

export function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

export function buildDeviceCookie(deviceId) {
  // HttpOnly: JS doesn't need it (server-side logging)
  // SameSite=Lax: allows normal navigations / QR flows
  return `${DEVICE_COOKIE}=${encodeURIComponent(deviceId)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; Secure; HttpOnly; SameSite=Lax`;
}

export function getOrCreateDeviceId(request) {
  const existing = getCookie(request, DEVICE_COOKIE);
  if (existing) return { deviceId: existing, isNew: false };

  const deviceId =
    crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return { deviceId, isNew: true };
}

export function getStoreUrls(env) {
  // Prefer environment variables for maintainability, fallback to repo defaults.
  const iosStore =
    env?.IOS_STORE_URL ||
    "https://apps.apple.com/dz/app/travel-tale-ترافل-تيل/id6743813106";
  const androidStore =
    env?.ANDROID_STORE_URL ||
    "https://play.google.com/store/apps/details?id=com.mycompany.traveltale";

  return { iosStore, androidStore };
}

export async function logOpenEvent(context, payload) {
  const { env } = context;

  const supabaseUrl = env?.SUPABASE_URL;
  const supabaseKey = env?.SUPABASE_SERVICE_ROLE_KEY || env?.SUPABASE_ANON_KEY;

  // If not configured, do nothing (won't break functions).
  if (!supabaseUrl || !supabaseKey) return;

  const table = env?.ANALYTICS_TABLE || "link_open_events";

  const body = JSON.stringify([payload]); // PostgREST accepts array inserts reliably

  const p = fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      prefer: "return=minimal",
    },
    body,
  }).catch(() => {});

  // Don't block the response if possible
  if (typeof context.waitUntil === "function") context.waitUntil(p);
  else await p;
}

// Tracking params (QR / campaigns)
// Supports multiple aliases so older printed QRs keep working.
export function parseTrackingParams(url) {
  const sp = url?.searchParams;
  if (!sp) return { ref: null, src: null, utm: {} };

  const ref = sp.get("ref") || sp.get("qr") || sp.get("code") || sp.get("r") || null;

  const src = sp.get("src") || sp.get("source") || sp.get("utm_source") || null;

  const utm = {
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
    utm_content: sp.get("utm_content"),
    utm_term: sp.get("utm_term"),
  };

  // Normalize empty strings to null
  const clean = (v) => (v && String(v).trim().length ? String(v).trim() : null);

  return {
    ref: clean(ref),
    src: clean(src),
    utm: {
      utm_source: clean(utm.utm_source),
      utm_medium: clean(utm.utm_medium),
      utm_campaign: clean(utm.utm_campaign),
      utm_content: clean(utm.utm_content),
      utm_term: clean(utm.utm_term),
    },
  };
}
