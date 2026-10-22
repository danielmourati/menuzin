// Funcionalidades ocultas da plataforma. Dados e configurações são preservados;
// para religar, troque o valor para false.
export const HIDDEN_FEATURES = {
  guia: true,
  whatsappApi: true,
  social: true,
  push: true,
  promotions: true,
  aiAgent: true,
  advancedCoupons: true,
} as const;

export type HideableFeature = keyof typeof HIDDEN_FEATURES;

export const isHidden = (f: HideableFeature) => HIDDEN_FEATURES[f];

/** Rotas do painel ocultas -> flag responsável. */
export const HIDDEN_ADMIN_ROUTES: Record<string, HideableFeature> = {
  "/admin/diretorio": "guia",
  "/admin/notificacoes": "push",
  "/admin/atendente-ia": "aiAgent",
  "/admin/configuracoes/whatsapp": "whatsappApi",
  "/admin/configuracoes/promocao": "promotions",
};

export function isAdminRouteHidden(path: string) {
  const f = HIDDEN_ADMIN_ROUTES[path];
  return !!f && isHidden(f);
}
