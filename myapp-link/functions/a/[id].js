export async function onRequest(context) {
  const { params, request } = context;
  const id = params.id;

  // ✅ Your deep link
  const deepLink = `traveltale://traveltale.app/attraction/${id}`;

  // TODO: put your real store URLs here
  const iosStore = "https://apps.apple.com/dz/app/travel-tale-ترافل-تيل/id6743813106";
  const androidStore = "https://play.google.com/store/apps/details?id=com.mycompany.traveltale";

  const ua = request.headers.get("user-agent") || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const storeUrl = isIOS ? iosStore : isAndroid ? androidStore : "https://download.traveltale.app/";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Open Travel Tale</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:0;padding:24px;background:#f6f6f8}
    .card{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,.08)}
    .btn{display:block;text-align:center;margin:10px 0;padding:14px 14px;border-radius:12px;text-decoration:none;font-weight:700}
    .primary{background:#6f4cff;color:#fff}
    .secondary{background:#eee;color:#111}
    .note{font-size:13px;color:#555;line-height:1.4}
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin:0 0 8px">Opening Travel Tale…</h2>
    <p class="note">If nothing happens, tap “Open in app”. If you’re in Instagram/TikTok, use “Open in Browser”.</p>

    <a class="btn primary" href="${deepLink}">Open in app</a>
    <a class="btn secondary" href="${storeUrl}">Download the app</a>

    <p class="note" style="margin-top:12px">
      Fallback link: <a href="${storeUrl}">${storeUrl}</a>
    </p>
  </div>

  <script>
    // Attempt to open app
    const deepLink = ${JSON.stringify(deepLink)};
    const storeUrl = ${JSON.stringify(storeUrl)};

    // Try opening app immediately
    window.location.href = deepLink;

    // If app didn't open, go to store after a short delay.
    // (If app opens, page typically becomes hidden and redirect won't matter.)
    setTimeout(() => {
      if (!document.hidden) window.location.href = storeUrl;
    }, 1300);

    document.addEventListener("visibilitychange", () => {
      // If user left the page (app opened), do nothing.
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=UTF-8" },
  });
}
