// middleware.js
export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Páginas que precisam de login
  const paginasProtegidas = ["/dashboard.html", "/planilha.html", "/bot2x.html"];

  // Se for uma rota protegida, exigir token
  if (paginasProtegidas.includes(path)) {
    const token = req.headers.get("cookie")?.includes("sessionId=");

    // Se não houver cookie de sessão -> bloquear
    if (!token) {
      return new Response("🚫 Acesso negado. Faça login primeiro.", {
        status: 403,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }

  // Libera tudo o resto (index.html, js, css, imagens, etc)
  return fetch(req);
}
