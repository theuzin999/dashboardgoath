export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;
  const protegidas = ["/dashboard.html", "/planilha.html", "/bot2x.html"];

   (HTTrack, wget, curl, etc.)
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  if (ua.includes("httrack") || ua.includes("wget") || ua.includes("curl")) {
    return new Response("Forbidden", { status: 403 });
  }

  
  if (!protegidas.includes(path)) return fetch(req);

  
  const cookies = req.headers.get("cookie") || "";
  const match = cookies.match(/sessionId=([^;]+)/);
  const token = match ? match[1] : null;

  if (!token) {
    
    return Response.redirect(new URL("/", req.url), 302);
  }

  try {
    
    const verify = await fetch("https://keysdash.espanhaserrita.workers.dev/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await verify.json().catch(() => ({}));

    if (verify.ok && data.ok) {
      // Token válido -> libera acesso
      return fetch(req);
    } else {
      
      return Response.redirect(new URL("/", req.url), 302);
    }
  } catch (e) {
    console.error("Erro na verificação remota:", e);
    return Response.redirect(new URL("/", req.url), 302);
  }
}
