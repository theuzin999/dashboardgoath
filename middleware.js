// middleware.js
export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Páginas que exigem login
  const paginasProtegidas = ["/dashboard.html", "/planilha.html", "/bot2x.html"];

  // Se for rota protegida
  if (paginasProtegidas.includes(path)) {
    const cookies = req.headers.get("cookie") || "";
    const temSessao = cookies.includes("sessionId=");

    // Se não tiver cookie de login, redireciona pro index.html
    if (!temSessao) {
      return Response.redirect(new URL("/", req.url), 302);
    }
  }

  // Libera o restante normalmente
  return fetch(req);
}
