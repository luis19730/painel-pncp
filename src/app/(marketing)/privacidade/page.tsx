import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Saiba como o Painel PNCP coleta, utiliza e protege as suas informações pessoais.',
}

export default function PrivacidadePage() {
  return (
    <div className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Política de Privacidade</h1>
          <p className="text-sm text-gray-400">Última atualização: 27 de agosto de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Informações que coletamos</h2>
            <p className="text-gray-600 leading-relaxed">
              Coletamos informações que você nos fornece diretamente, como nome, e-mail e dados de
              perfil ao criar uma conta. Também coletamos dados de uso da plataforma, como
              pesquisas realizadas, licitações favoritas e preferências de perfil, para melhorar sua
              experiência.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Como utilizamos suas informações</h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos suas informações para: (a) fornecer e melhorar nossos serviços; (b)
              personalizar sua experiência na plataforma; (c) enviar alertas e notificações
              relevantes; (d) processar pagamentos para planos assinados; (e) comunicar-se com você
              sobre sua conta e atualizações da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Compartilhamento de dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Não vendemos ou compartilhamos suas informações pessoais com terceiros para fins de
              marketing. Podemos compartilhar dados apenas: (a) com provedores de serviços
              essenciais ao funcionamento da plataforma (ex: processamento de pagamentos, hosting);
              (b) quando exigido por lei ou autoridade competente; (c) para proteger os direitos e
              segurança do Painel PNCP e seus usuários.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Segurança dos dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Empregamos medidas de segurança razoáveis para proteger suas informações pessoais
              contra acesso não autorizado, alteração, divulgação ou destruição. Utilizamos
              criptografia em transmissão de dados (HTTPS) e autenticação segura por meio do
              Supabase Auth.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Retenção de dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Mantemos suas informações pessoais enquanto sua conta estiver ativa ou conforme
              necessário para fornecer nossos serviços. Ao excluir sua conta, removeremos seus dados
              pessoais dentro de um prazo razoável, exceto quando exigido por obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Seus direitos</h2>
            <p className="text-gray-600 leading-relaxed">
              Você tem direito a: (a) acessar seus dados pessoais; (b) corrigir dados incompletos ou
              desatualizados; (c) solicitar a exclusão de seus dados; (d) solicitar a portabilidade
              de seus dados; (e) revogar consentimentos previamente fornecidos. Para exercer esses
              direitos, entre em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos cookies essenciais para o funcionamento da plataforma e cookies de análise
              para entender como a plataforma é utilizada. Você pode gerenciar suas preferências de
              cookies nas configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Serviços de terceiros</h2>
            <p className="text-gray-600 leading-relaxed">
              A plataforma utiliza serviços de terceiros para funcionalidades essenciais, incluindo
              Supabase (autenticação e banco de dados) e parceiros de processamento de pagamentos.
              Cada serviço de terceiro possui sua própria política de privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Alterações nesta política</h2>
            <p className="text-gray-600 leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre
              alterações significativas por e-mail ou por meio de aviso na plataforma. O uso
              continuado da plataforma após as alterações constitui aceitação da política
              atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Em caso de dúvidas sobre esta Política de Privacidade, entre em contato conosco pela
              página Sobre da plataforma.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
