// Slugs reservados pelo sistema — não podem ser atribuídos a tenants
// pois colidiriam com rotas literais (/admin, /platform, /login etc.)
// ou com paths futuros da plataforma.

export const RESERVED_SLUGS = new Set<string>([
  "admin",
  "platform",
  "login",
  "logout",
  "signup",
  "cadastro",
  "api",
  "assets",
  "loja",          // legado
  "sounds",
  "static",
  "public",
  "_serverFn",
  "dashboard",
  "settings",
  "configuracoes",
  "produtos",
  "categorias",
  "pedidos",
  "aparencia",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "comece-agora",
  "guia",
]);
