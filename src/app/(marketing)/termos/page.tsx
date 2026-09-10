import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description:
    'Leia os Termos de Uso do Painel PNCP e conheça as condições de utilização da plataforma.',
}

export default function TermosPage() {
  return (
    <div className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Termos de Uso</h1>
          <p className="text-sm text-gray-400">Última atualização: 27 de agosto de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Aceitação dos termos</h2>
            <p className="text-gray-600 leading-relaxed">
              Ao acessar ou utilizar o Painel PNCP, você concorda com estes Termos de Uso. Se não
              concordar com algum dos termos, não utilize a plataforma. Reservamo-nos o direito de
              alterar estes termos a qualquer momento, sendo responsabilidade do usuário verificar
              periodicamente as atualizações.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Descrição do serviço</h2>
            <p className="text-gray-600 leading-relaxed">
              O Painel PNCP é uma plataforma independente de consulta e análise de dados públicos
              relativos a licitações públicas brasileiras, provenientes do Portal Nacional de
              Contratações Públicas (PNCP). A plataforma oferece ferramentas de busca, filtragem,
              análise, monitoramento e alertas relacionados a licitações públicas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Conta de usuário</h2>
            <p className="text-gray-600 leading-relaxed">
              Para acessar determinadas funcionalidades, é necessário criar uma conta de usuário. Você
              é responsável pela segurança de sua conta e por todas as atividades realizadas através
              dela. Concorda em fornecer informações precisas e atualizadas durante o cadastro e
              mantê-las atualizadas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Uso aceitável</h2>
            <p className="text-gray-600 leading-relaxed">
              Você concorda em utilizar a plataforma apenas para fins lícitos e em conformidade com
              estes termos. É proibido utilizar a plataforma para: (a) coletar dados de outros
              usuários sem autorização; (b) interferir no funcionamento da plataforma; (c) tentar
              acessar áreas restritas sem autorização; (d) utilizar automações para sobrecarregar os
              serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Propriedade intelectual</h2>
            <p className="text-gray-600 leading-relaxed">
              O código, design, funcionalidades e conteúdo original do Painel PNCP são de propriedade
              dos desenvolvedores da plataforma. Os dados públicos exibidos provenientes do PNCP
              pertencem aos respectivos órgãos públicos e estão sujeitos às políticas de dados abertos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Limitação de responsabilidade</h2>
            <p className="text-gray-600 leading-relaxed">
              O Painel PNCP é uma ferramenta de consulta e análise. Não garantimos a completude,
              precisão ou atualidade dos dados apresentados, uma vez que dependemos de informações
              disponibilizadas por órgãos públicos. O uso das informações da plataforma é de
              responsabilidade do usuário. Recomendamos sempre consultar a fonte oficial para
              informações definitivas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Planos e pagamentos</h2>
            <p className="text-gray-600 leading-relaxed">
              Determinadas funcionalidades podem requerer a contratação de um plano pago. Os valores
              e funcionalidades de cada plano estão descritos na página de Planos. Os pagamentos são
              processados por meio de parceiros de pagamento e estão sujeitos aos termos desses
              parceiros.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Cancelamento</h2>
            <p className="text-gray-600 leading-relaxed">
              Você pode cancelar sua assinatura a qualquer momento. O cancelamento será efetivo ao
              final do período de cobrança atual. Não oferecemos reembolso proporcional pelo tempo
              não utilizado do período vigente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Disponibilidade do serviço</h2>
            <p className="text-gray-600 leading-relaxed">
              Nós nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos
              disponibilidade ininterrupta. Podemos realizar manutenções programadas ou não
              programadas, com aviso prévio quando possível.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Alterações nestes termos</h2>
            <p className="text-gray-600 leading-relaxed">
              Reservamo-nos o direito de alterar estes Termos de Uso a qualquer momento. As
              alterações entrarão em vigor imediatamente após a publicação na plataforma. O uso
              continuado da plataforma após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">11. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Em caso de dúvidas sobre estes Termos de Uso, entre em contato conosco pela página
              Sobre da plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
