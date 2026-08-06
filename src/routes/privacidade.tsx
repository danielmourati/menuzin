import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  component: PrivacidadePage,
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Menuzin" },
      {
        name: "description",
        content:
          "Como o Menuzin coleta, usa e protege os dados de clientes e lojistas na plataforma de cardápio digital e delivery.",
      },
      { property: "og:title", content: "Política de Privacidade — Menuzin" },
      {
        property: "og:description",
        content:
          "Como o Menuzin coleta, usa e protege os dados de clientes e lojistas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://menuzin.app/privacidade" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://menuzin.app/privacidade" }],
  }),
});

function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: 6 de agosto de 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">1. Quem somos</h2>
          <p>
            O Menuzin é uma plataforma que permite que restaurantes, lanchonetes,
            pizzarias e outros estabelecimentos publiquem seu cardápio digital e
            recebam pedidos. Esta política explica como tratamos os dados pessoais de
            clientes finais e de lojistas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">2. Dados que coletamos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Clientes:</strong> nome, número de WhatsApp, endereço de entrega
              (CEP, rua, número, bairro, complemento) e histórico de pedidos.
            </li>
            <li>
              <strong>Lojistas:</strong> nome, e-mail, telefone, dados do
              estabelecimento e informações de assinatura.
            </li>
            <li>
              <strong>Uso:</strong> páginas visitadas, cliques em lojas e produtos do
              Guia Menuzin e informações técnicas do dispositivo (tipo de navegador).
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">3. Como usamos os dados</h2>
          <p>
            Usamos os dados para processar e entregar pedidos, calcular taxas de
            entrega por região, preencher automaticamente seus dados em compras
            futuras, exibir lojas próximas no Guia Menuzin, prevenir fraudes e
            melhorar a plataforma. Não vendemos dados pessoais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">4. Compartilhamento</h2>
          <p>
            Os dados do pedido são compartilhados com o estabelecimento escolhido, para
            que ele possa preparar e entregar. Dados de pagamento são processados
            diretamente pelo Mercado Pago — o Menuzin não armazena números completos de
            cartão. Também usamos provedores de infraestrutura em nuvem para hospedar a
            aplicação e o banco de dados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">5. Armazenamento no dispositivo</h2>
          <p>
            Guardamos no seu navegador o carrinho de compras, o CEP informado e um
            identificador local que permite recuperar seus dados de cadastro sem
            necessidade de senha. Você pode apagar essas informações limpando os dados
            do site ou usando a opção “Não sou eu” no checkout.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">6. Seus direitos (LGPD)</h2>
          <p>
            Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus
            dados pessoais, bem como revogar consentimentos. Basta entrar em contato
            pelo WhatsApp (86) 99931-2882 ou pelo e-mail contato@menuzin.app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">7. Retenção</h2>
          <p>
            Mantemos os dados enquanto sua conta ou histórico de pedidos estiver ativo e
            pelo prazo exigido pela legislação fiscal e consumerista. Depois disso, os
            dados são excluídos ou anonimizados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">8. Contato</h2>
          <p>
            Dúvidas sobre esta política: WhatsApp (86) 99931-2882 ou
            contato@menuzin.app.
          </p>
        </section>
      </div>

      <div className="mt-10 flex gap-4 text-sm">
        <Link to="/" className="font-semibold text-primary hover:underline">
          Voltar para o início
        </Link>
        <Link to="/termos" className="font-semibold text-primary hover:underline">
          Termos de uso
        </Link>
      </div>
    </main>
  );
}
