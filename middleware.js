// middleware.js
export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // páginas protegidas
  const protegidas = ["/dashboard.html", "/planilha.html", "/bot2x.html"];
  if (!protegidas.includes(path)) return fetch(req);

  // tenta ler cookie de sessão
  const cookies = req.headers.get("cookie") || "";
  const match = cookies.match(/sessionId=([^;]+)/);
  const token = match ? match[1] : null;

  // se não tiver token, redireciona pro index
  if (!token) {
    return Response.redirect(new URL("/", req.url), 302);
  }

  // valida o token com o Worker
  try {
    const verify = await fetch("https://keysdash.espanhaserrita.workers.dev/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await verify.json().catch(() => ({}));
    if (verify.ok && data.ok) {
      // token válido → libera o acesso
      return fetch(req);
    }
  } catch (err) {
    console.error("Erro ao validar token:", err);
  }

  // token inválido ou erro → redireciona pro index
  return Response.redirect(new URL("/", req.url), 302);
}
