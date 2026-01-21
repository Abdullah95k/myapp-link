export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  // Allow forcing landing page: /?landing=1
  if (url.searchParams.get("landing") === "1") return next();

  if (url.pathname === "/") {
    const ua = request.headers.get("user-agent") || "";
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

    if (isMobile) {
      return new Response(null, { status: 302, headers: { Location: "/app" } });
    }
  }

  return next();
}
