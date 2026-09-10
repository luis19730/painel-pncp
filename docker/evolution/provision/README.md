# Evolução WhatsApp — Provisionamento Automatizado

Este bundle automatiza tudo da infraestrutura. Só há **3 passos manuais** que
nenhum script pode fazer (exigem sua conta/celular):

1. **Criar a conta Oracle Always Free** (cloud.oracle.com) — e-mail + cartão p/ validar.
2. **`oci setup config`** — login que gera a API key da sua conta (feito uma única vez, numa máquina com admin).
3. **Escaneiar o QR** com o WhatsApp do seu número real.

---

## Resumo dos arquivos

| Arquivo | Onde roda | O que faz |
|---|---|---|
| `create-vps.sh` | Sua máquina (com OCI CLI) | Cria a VM Ubuntu (Ampere A1 free) e imprime o comando p/ entrar nela |
| `setup-on-vps.sh` | Dentro da VPS (via SSH) | Instala Docker, sobe a Evolution, cria a instância e imprime os 3 secrets |
| `../docker-compose.yml` | Dentro da VPS | O app Evolution (referência) |

---

## Passo a passo

### A) Crie a conta Oracle
- `cloud.oracle.com` → **Start for free** → confirme e-mail, senha, OTP e cartão (não cobra).

### B) Prepare a máquina que cria a VPS (precisa de **admin**)
Num Windows/PowerShell (admin) ou Linux:

```powershell
# 1) habilita caminhos longos (necessário) e reinicia
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name LongPathsEnabled -Value 1
```

Depois instale o **OCI CLI** e gere a chave SSH (já temos a chave em `~/.ssh/evolution_rsa`):

```bash
# Linux/macOS
curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh | bash
# Windows: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm (instalador oficial)
```

Faça o login (a única parte de credencial):
```bash
oci setup config
# regional: sa-saopaulo-1 (ou a da sua conta) | caminho da chave: deixe o padrão
```

### C) Crie a VPS (automatizado)
```bash
bash docker/evolution/provision/create-vps.sh
```
E o script imprime os comandos para entrar na VPS e rodar o setup:
```bash
scp -i ~/.ssh/evolution_rsa docker/evolution/provision/setup-on-vps.sh ubuntu@<IP>:
ssh  -i ~/.ssh/evolution_rsa ubuntu@<IP> 'bash setup-on-vps.sh'
```

Libere a porta **8080 TCP** no Security List da Oracle (VCN → Security List → Ingress → `0.0.0.0/0`), se quiser acesso direto — ou use um **Cloudflare Tunnel** para não expor IP.

### D) Conecte o WhatsApp (QR) — passo manual
```powershell
# túnel do seu PC para ver o manager:
ssh -i ~/.ssh/evolution_rsa -L 8080:localhost:8080 ubuntu@<IP>
```
Abra `http://localhost:8080/manager` → instância `painel-pncp` → escaneie o QR com o seu WhatsApp.

### E) Me passe os 3 valores (o setup imprime no final)
- `EVOLUTION_API_URL` = `http://<IP>:8080` (ou URL pública via tunnel)
- `EVOLUTION_INSTANCE` = `painel-pncp`
- `EVOLUTION_API_KEY` = a chave exibida

Eu testo e rodo os `wrangler secret put` (EVOLUTION_API_URL / EVOLUTION_INSTANCE / EVOLUTION_API_KEY) + redeploy.

---

## Alternativa sem Oracle (mais simples, mas exige admin/Docker local)
Instalar **Docker Desktop** no seu PC + **Cloudflare Tunnel** (expor `localhost:8080`). Mesmo fluxo D e E, sem conta Oracle. É a opção mais rápida se você tiver Docker funcionando.
