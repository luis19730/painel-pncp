// ============================================================================
// Verificação de configuração das credenciais do serviço.
// Usado pelo worker (cron) para decidir se pode processar os alertas.
// ============================================================================

export function isConfigured(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key.includes('placeholder')) return false
  return true
}
