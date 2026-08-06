import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  component: TermosPage,
  head: () => ({
    meta: [
      { title: "Termos de Uso — Menuzin" },
      {
        name: "description",
        content:
          "Regras de uso da plataforma Menuzin para clientes e para estabelecimentos que publicam cardápio digital e recebem pedidos.",
      },
      { property: "og:title", content: "Termos de Uso — Menuzin" },
      {
        property: "og:description",
        content:
          "Regras de uso da plataforma Menuzin para clientes e estabelecimentos.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://menuzin.app/termos" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://menuzin.app/termos" }],
  }),
});

function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: 6 de agosto de 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Objeto</h2>
          <p>
            O Menuzin é uma plataforma tecnológica que conecta consumidores a
            estabelecimentos de alimentação. Não produzimos, vendemos nem entregamos os
            produtos: cada estabelecimento é o único responsável pelo preparo, preço,
            qualidade, prazo e entrega dos itens anunciados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Uso pelo cliente</h2>
          <p>
            Ao fazer um pedido, você declara que os dados informados (nome, WhatsApp e
            endereço) são verdadeiros. Pedidos confirmados podem ser cancelados apenas
            enquanto o estabelecimento não iniciar o preparo, conforme a política de
            cada loja.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Uso pelo estabelecimento</h2>
          <p>
            O lojista é responsável pelas informações do cardápio, preços, taxas de
            entrega, disponibilidade, notas fiscais e obrigações sanitárias e
            tributárias. É proibido anunciar produtos ilícitos, bebidas alcoólicas para
            menores de 18 anos ou conteúdo que infrinja direitos de terceiros.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Planos e pagamentos</h2>
          <p>
            O plano Presença é gratuito. Planos pagos são cobrados mensalmente e podem
            ser cancelados a qualquer momento, sem reembolso proporcional do período já
            iniciado. Destaques no Guia Menuzin são opcionais e pagos via PIX. Os
            pagamentos dos pedidos são processados pelo Mercado Pago, sujeito aos termos
            daquele provedor.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Disponibilidade</h2>
          <p>
            Empenhamo-nos em manter a plataforma disponível, mas não garantimos operação
            ininterrupta. Podemos suspender contas que violem estes termos ou a
            legislação vigente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Propriedade intelectual</h2>
          <p>
            A marca, o código e o layout do Menuzin pertencem à plataforma. As imagens e
            textos de cardápio pertencem a cada estabelecimento, que autoriza sua
            exibição no Menuzin e no Guia Menuzin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Foro e contato</h2>
          <p>
            Estes termos são regidos pela legislação brasileira. Contato: WhatsApp
            (86) 99931-2882 ou contato@menuzin.app.
          </p>
        </section>
      </div>

      <div className="mt-10 flex gap-4 text-sm">
        <Link to="/" className="font-semibold text-primary hover:underline">
          Voltar para o início
        </Link>
        <Link to="/privacidade" className="font-semibold text-primary hover:underline">
          Política de privacidade
        </Link>
      </div>
    </main>
  );
}
