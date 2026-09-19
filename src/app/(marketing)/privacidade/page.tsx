import type { Metadata } from 'next'
import { Section, SectionHead } from '@/components/marketing/section'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Saiba como o Painel PNCP coleta, utiliza e protege as suas informações pessoais.',
}

const SECOES: Array<{ titulo: string; texto: string }> = [
  {
    titulo: '1. Informações que coletamos',
    texto:
      'Coletamos informações que você nos fornece diretamente, como nome, e-mail e dados de perfil ao criar uma conta. Também coletamos dados de uso da plataforma, como pesquisas realizadas, licitações favoritas e preferências de perfil, para melhorar sua experiência.',
  },
  {
    titulo: '2. Como utilizamos suas informações',
    texto:
      'Utilizamos suas informações para: (a) fornecer e melhorar nossos serviços; (b) personalizar sua experiência na plataforma; (c) enviar alertas e notificações relevantes; (d) processar pagamentos para planos assinados; (e) comunicar-se com você sobre sua conta e atualizações da plataforma.',
  },
  {
    titulo: '3. Compartilhamento de dados',
    texto:
      'Não vendemos ou compartilhamos suas informações pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas: (a) com provedores de serviços essenciais ao funcionamento da plataforma (ex: processamento de pagamentos, hosting); (b) quando exigido por lei ou autoridade competente; (c) para proteger os direitos e segurança do Painel PNCP e seus usuários.',
  },
  {
    titulo: '4. Segurança dos dados',
    texto:
      'Empregamos medidas de segurança razoáveis para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos criptografia em transmissão de dados (HTTPS) e autenticação segura por meio do Supabase Auth.',
  },
  {
    titulo: '5. Retenção de dados',
    texto:
      'Mantemos suas informações pessoais enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços. Ao excluir sua conta, removeremos seus dados pessoais dentro de um prazo razoável, exceto quando exigido por obrigação legal.',
  },
  {
    titulo: '6. Seus direitos',
    texto:
      'Você tem direito a: (a) acessar seus dados pessoais; (b) corrigir dados incompletos ou desatualizados; (c) solicitar a exclusão de seus dados; (d) solicitar a portabilidade de seus dados; (e) revogar consentimentos previamente fornecidos. Para exercer esses direitos, entre em contato conosco.',
  },
  {
    titulo: '7. Cookies',
    texto:
      'Utilizamos cookies essenciais para o funcionamento da plataforma e cookies de análise para entender como a plataforma é utilizada. Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.',
  },
  {
    titulo: '8. Serviços de terceiros',
    texto:
      'A plataforma utiliza serviços de terceiros para funcionalidades essenciais, incluindo Supabase (autenticação e banco de dados) e parceiros de processamento de pagamentos. Cada serviço de terceiro possui sua própria política de privacidade.',
  },
  {
    titulo: '9. Alterações nesta política',
    texto:
      'Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas por e-mail ou por meio de aviso na plataforma. O uso continuado da plataforma após as alterações constitui aceitação da política atualizada.',
  },
  {
    titulo: '10. Contato',
    texto:
      'Em caso de dúvidas sobre esta Política de Privacidade, entre em contato conosco pela página Sobre da plataforma.',
  },
]

export default function PrivacidadePage() {
  return (
    <Section narrow>
      <SectionHead
        title="Política de Privacidade"
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
