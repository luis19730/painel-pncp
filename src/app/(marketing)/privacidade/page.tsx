export default function PrivacidadePage() {
  return (
    <div className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Politica de Privacidade</h1>
          <p className="text-sm text-gray-400">Ultima atualizacao: [DATA]</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Informacoes que coletamos</h2>
            <p className="text-gray-600 leading-relaxed">
              Coletamos informacoes que voce nos fornece diretamente, como nome, e-mail e dados de
              perfil ao criar uma conta. Tambem coletamos dados de uso da plataforma, como
              pesquisas realizadas, licitacoes favoritas e preferencias de perfil, para melhorar sua
              experiencia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Como utilizamos suas informacoes</h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos suas informacoes para: (a) fornecer e melhorar nossos servicos; (b)
              personalizar sua experiencia na plataforma; (c) enviar alertas e notificacoes
              relevantes; (d) processar pagamentos para planos assinados; (e) comunicar-se com voce
              sobre sua conta e atualizacoes da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Compartilhamento de dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Nao vendemos ou compartilhamos suas informacoes pessoais com terceiros para fins de
              marketing. Podemos compartilhar dados apenas: (a) com provedores de servicos
              essenciais ao funcionamento da plataforma (ex: processamento de pagamentos, hosting);
              (b) quando exigido por lei ou autoridade competente; (c) para proteger os direitos e
              seguranca do Painel PNCP e seus usuarios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Seguranca dos dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Empregamos medidas de seguranca razoaveis para proteger suas informacoes pessoais
              contra acesso nao autorizado, alteracao, divulgacao ou destruicao. Utilizamos
              criptografia em transmissao de dados (HTTPS) e autenticacao segura por meio do
              Supabase Auth.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Retencao de dados</h2>
            <p className="text-gray-600 leading-relaxed">
              Mantemos suas informacoes pessoais enquanto sua conta estiver ativa ou conforme
              necessario para fornecer nossos servicos. Ao excluir sua conta, removeremos seus dados
              pessoais dentro de um prazo razoavel, exceto quando exigido por obrigacao legal.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Seus direitos</h2>
            <p className="text-gray-600 leading-relaxed">
              Voce tem direito a: (a) acessar seus dados pessoais; (b) corrigir dados incompletos ou
              desatualizados; (c) solicitar a exclusao de seus dados; (d) solicitar a portabilidade
              de seus dados; (e) revogar consentimentos previamente fornecidos. Para exercer esses
              direitos, entre em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              Utilizamos cookies essenciais para o funcionamento da plataforma e cookies de analise
              para entender como a plataforma e utilizada. Voce pode gerenciar suas preferencias de
              cookies nas configuracoes do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Servicos de terceiros</h2>
            <p className="text-gray-600 leading-relaxed">
              A plataforma utiliza servicos de terceiros para funcionalidades essenciais, incluindo
              Supabase (autenticacao e banco de dados) e parceiros de processamento de pagamentos.
              Cada servico de terceiro possui sua propria politica de privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Alteracoes nesta politica</h2>
            <p className="text-gray-600 leading-relaxed">
              Podemos atualizar esta Politica de Privacidade periodicamente. Notificaremos sobre
              alteracoes significativas por e-mail ou por meio de aviso na plataforma. O uso
              continuado da plataforma apos as alteracoes constitui aceitacao da politica
              atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Contato</h2>
            <p className="text-gray-600 leading-relaxed">
              Em caso de duvidas sobre esta Politica de Privacidade, entre em contato conosco atraves
              do e-mail [CONTATO].
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
