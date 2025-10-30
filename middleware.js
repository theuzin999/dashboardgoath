// middleware.js
export default function middleware(req) {
  const url = new URL(req.url);

  // 🔒 páginas que só podem ser acessadas depois do login
  const bloqueadas = [
    "/dashboard.html",
    "/bot2x.html",
    "/planilha.html"
  ];

  // se alguém tentar acessar direto (sem login)
  if (bloqueadas.includes(url.pathname)) {
    return new Response("🚫 Acesso negado. Faça login primeiro.", {
      status: 403,
      headers: { "content-type": "text/plain" },
    });
  }

  // se for qualquer outro arquivo (ex: index, scripts, css, worker etc)
  return new Response(null, { status: 200 });
}
