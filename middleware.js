// middleware.js
export default async function middleware(req) {
  try {
    const url = new URL(req.url);

    // rotas que queremos bloquear quando acessadas diretamente
    const bloqueadas = [
      "/dashboard.html",
      "/planilha.html",
      "/bot2x.html"
    ];

    // Se for uma rota bloqueada, devolve 403
    if (bloqueadas.includes(url.pathname)) {
      return new Response("🚫 Acesso negado. Faça login primeiro.", {
        status: 403,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // Permite tudo o mais (arquivos estáticos, /pages/*, /js/*, /css/*, index.html, app.html, etc)
    return fetch(req);
  } catch (err) {
    // Em erro, não bloquear — melhor permitir do que quebrar tudo
    console.error("Middleware error:", err);
    return fetch(req);
  }
}
