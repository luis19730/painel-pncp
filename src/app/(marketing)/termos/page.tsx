import type { Metadata } from 'next'
import { Section, SectionHead } from '@/components/marketing/section'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description:
    'Leia os Termos de Uso do Painel PNCP e conheça as condições de utilização da plataforma.',
}

const SECOES: Array<{ titulo: string; texto: string }> = [
  {
    titulo: '1. Aceitação dos termos',
    texto:
      'Ao acessar ou utilizar o Painel PNCP, você concorda com estes Termos de Uso. Se não concordar com algum dos termos, não utilize a plataforma. Reservamo-nos o direito de alterar estes termos a qualquer momento, sendo responsabilidade do usuário verificar periodicamente as atualizações.',
  },
  {
    titulo: '2. Descrição do serviço',
    texto:
      'O Painel PNCP é uma plataforma independente de consulta e análise de dados públicos relativos a licitações públicas brasileiras, provenientes do Portal Nacional de Contratações Públicas (PNCP). A plataforma oferece ferramentas de busca, filtragem, análise, monitoramento e alertas relacionados a licitações públicas.',
  },
  {
    titulo: '3. Conta de usuário',
    texto:
      'Para acessar determinadas funcionalidades, é necessário criar uma conta de usuário. Você é responsável pela segurança de sua conta e por todas as atividades realizadas através dela. Concorda em fornecer informações precisas e atualizadas durante o cadastro e mantê-las atualizadas.',
  },
  {
    titulo: '4. Uso aceitável',
    texto:
      'Você concorda em utilizar a plataforma apenas para fins lícitos e em conformidade com estes termos. É proibido utilizar a plataforma para: (a) coletar dados de outros usuários sem autorização; (b) interferir no funcionamento da plataforma; (c) tentar acessar áreas restritas sem autorização; (d) utilizar automações para sobrecarregar os serviços.',
  },
  {
    titulo: '5. Propriedade intelectual',
    texto:
      'O código, design, funcionalidades e conteúdo original do Painel PNCP são de propriedade dos desenvolvedores da plataforma. Os dados públicos exibidos provenientes do PNCP pertencem aos respectivos órgãos públicos e estão sujeitos às políticas de dados abertos.',
  },
  {
    titulo: '6. Limitação de responsabilidade',
    texto:
      'O Painel PNCP é uma ferramenta de consulta e análise. Não garantimos a completude, precisão ou atualidade dos dados apresentados, uma vez que dependemos de informações disponibilizadas por órgãos públicos. O uso das informações da plataforma é de responsabilidade do usuário. Recomendamos sempre consultar a fonte oficial para informações definitivas.',
  },
  {
    titulo: '7. Planos e pagamentos',
    texto:
      'Determinadas funcionalidades podem requerer a contratação de um plano pago. Os valores e funcionalidades de cada plano estão descritos na página de Planos. Os pagamentos são processados por meio de parceiros de pagamento e estão sujeitos aos termos desses parceiros.',
  },
  {
    titulo: '8. Cancelamento',
    texto:
      'Você pode cancelar sua assinatura a qualquer momento. O cancelamento será efetivo ao final do período de cobrança atual. Não oferecemos reembolso proporcional pelo tempo não utilizado do período vigente.',
  },
  {
    titulo: '9. Disponibilidade do serviço',
    texto:
      'Nós nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta. Podemos realizar manutenções programadas ou não programadas, com aviso prévio quando possível.',
  },
  {
    titulo: '10. Alterações nestes termos',
    texto:
      'Reservamo-nos o direito de alterar estes Termos de Uso a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação na plataforma. O uso continuado da plataforma após as alterações constitui aceitação dos novos termos.',
  },
  {
    titulo: '11. Contato',
    texto:
      'Em caso de dúvidas sobre estes Termos de Uso, entre em contato conosco pela página Sobre da plataforma.',
  },
]

export default function TermosPage() {
  return (
    <Section narrow>
      <SectionHead
        title="Termos de Uso"
        subtitle="Última atualização: 27 de agosto de 2026"
        as="h1"
      />

      <div className="space-y-8">
        {SECOES.map((s) => (
          <section key={s.titulo}>
            <h2 className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mb-3">
              {s.titulo}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{s.texto}</p>
          </section>
        ))}
      </div>
    </Section>
  )
}
