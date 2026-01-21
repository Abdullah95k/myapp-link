export async function onRequest({ request }) {
  const APP_STORE_URL = "https://apps.apple.com/us/app/travel-tale-ترافل-تيل/id6743813106";
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.mycompany.traveltale";

  const ua = (request.headers.get("user-agent") || "").toLowerCase();

  const isIOS =
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod") ||
    (ua.includes("macintosh") && ua.includes("mobile")); // iPadOS case

  const isAndroid = ua.includes("android");

  if (isIOS) return Response.redirect(APP_STORE_URL, 302);
  if (isAndroid) return Response.redirect(PLAY_STORE_URL, 302);

  // Desktop/unknown -> show branded landing page
  return Response.redirect("/", 302);
}
