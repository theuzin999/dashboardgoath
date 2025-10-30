// middleware.js
export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  // páginas que não podem ser acessadas diretamente
  const bloqueadas = ["/dashboard.html", "/planilha.html", "/bot2x.html"];

  if (bloqueadas.includes(path)) {
    // redireciona direto pro index (sem tentar validar token)
    return Response.redirect(new URL("/", req.url), 302);
  }

  // libera todo o resto (index, js, css, etc)
  return fetch(req);
}
