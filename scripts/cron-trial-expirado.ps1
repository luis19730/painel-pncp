# ============================================================================
# Dispara o endpoint /api/cron/trial-expirado manualmente (ou via Agendador de
# Tarefas do Windows). Envia o e-mail de "período de teste terminou" para os
# usuários cujo trial expirou e que não possuem plano ativo.
#
# Uso:
#   powershell -File scripts\cron-trial-expirado.ps1 -CronSecret "SEU_SECRET"
#   # ou via variável de ambiente:
#   $env:CRON_SECRET = "SEU_SECRET"
#   powershell -File scripts\cron-trial-expirado.ps1
#
# Para agendar diariamente às 09:00 no Windows:
#   schtasks /Create /SC DAILY /ST 09:00 /TN "PainelPNCP Trial Expirado" `
#     /TR "powershell.exe -NoProfile -File C:\caminho\scripts\cron-trial-expirado.ps1"
#   (defina CRON_SECRET como variável de ambiente do usuário/máquina)
# ============================================================================

param(
  [string]$BaseUrl = "https://www.painelpncp.com.br",
  [string]$CronSecret = ""
)

if (-not $CronSecret) {
  $CronSecret = $env:CRON_SECRET
}

if (-not $CronSecret) {
  Write-Error "Defina o CRON_SECRET (parâmetro -CronSecret ou variável de ambiente CRON_SECRET)."
  exit 1
}

$uri = "$($BaseUrl.TrimEnd('/'))/api/cron/trial-expirado"

try {
  $resp = Invoke-RestMethod -Uri $uri -Method Get -Headers @{ "x-cron-secret" = $CronSecret } -TimeoutSec 120
  Write-Output "OK: $($resp | ConvertTo-Json -Compress)"
} catch {
  Write-Error "Falha ao chamar o endpoint: $($_.Exception.Message)"
  exit 1
}
