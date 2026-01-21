export async function onRequest({ request }) {
  try {
    const ua = request.headers.get("user-agent") || "";
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    // ✅ put your real links here
    const IOS_STORE = "https://apps.apple.com/app/id6743813106";
    const ANDROID_STORE =
      "https://play.google.com/store/apps/details?id=YOUR.ANDROID.PACKAGE";

    const target = isIOS ? IOS_STORE : isAndroid ? ANDROID_STORE : "/";

    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    // fail open
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }
}
