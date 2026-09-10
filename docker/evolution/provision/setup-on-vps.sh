#!/usr/bin/env bash
#
# ============================================================================
# PROVISION EVOLUTION API NA VPS (executa DENTRO da VPS, via SSH)
#
# Faz tudo automaticamente:
#   - instala Docker
#   - sobe a Evolution API (atendai/evolution-api)
#   - cria a instância "painel-pncp"
#   - imprime no final: a URL, a instância e a chave (para os secrets do worker)
#
# Uso:   bash setup-on-vps.sh
# ============================================================================
set -euo pipefail

# --- 1) Configuração (edite aqui se quiser outro nome/porta) -----------------
INSTANCE_NAME="${EVOLUTION_INSTANCE:-painel-pncp}"
PORT="${EVOLUTION_PORT:-8080}"
# Gera uma chave forte se EVOLUTION_API_KEY não vier do ambiente.
if [[ -z "${EVOLUTION_API_KEY:-}" ]]; then
  EVOLUTION_API_KEY="evok_$(head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)"
fi
export EVOLUTION_API_KEY

echo "==> Instância: $INSTANCE_NAME | Porta: $PORT"
echo "==> Barra de progresso:"
log() { printf '  [%s] %s\n' "$(date +%H:%M:%S)" "$1"; }

# --- 2) Docker ---------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Instalando Docker..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y -qq
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "$(id -un)"
  systemctl enable --now docker
fi
log "Docker: $(docker --version)"

# --- 3) docker-compose.yml ---------------------------------------------------
log "Gravando docker-compose.yml..."
mkdir -p /opt/evolution
cat > /opt/evolution/docker-compose.yml <<YAML
services:
  evolution-api:
    image: atendai/evolution-api:v1.8.0
    container_name: evolution-api
    restart: unless-stopped
    ports:
      - "${PORT}:8080"
    environment:
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
volumes:
  evolution_instances:
  evolution_store:
YAML

# --- 4) Subir a Evolution ----------------------------------------------------
log "Subindo a Evolution API..."
cd /opt/evolution
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  curl -sL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi
docker compose up -d

log "Aguardando a Evolution responder..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/" >/dev/null 2>&1; then break; fi
  sleep 2
done

# --- 5) Criar a instância ----------------------------------------------------
log "Criando instância '${INSTANCE_NAME}' com QR..."
CREATE_JSON=$(curl -sS -X POST "http://localhost:${PORT}/instance/create" \
  -H "apikey: ${EVOLUTION_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"instanceName\":\"${INSTANCE_NAME}\",\"qrcode\":true}" || true)
echo "  resposta create: $CREATE_JSON"

# --- 6) Firewall (Oracle p/ porta) -------------------------------------------
log "Abrindo porta ${PORT} no firewall da instância (ufw, se houver)..."
if command -v ufw >/dev/null 2>&1; then
  ufw allow "${PORT}/tcp" >/dev/null 2>&1 || true
  ufw allow OpenSSH >/dev/null 2>&1 || true
fi

# --- 7) Resultado ------------------------------------------------------------
cat <<EOF

========================================================================================
 PROVISIONAMENTO CONCLUÍDO. Guarde estes 3 valores (os SECRETS do worker):

   EVOLUTION_API_URL  = http://<IP_OU_DOMINIO_DESTA_VPS>:${PORT}
   EVOLUTION_INSTANCE = ${INSTANCE_NAME}
   EVOLUTION_API_KEY  = ${EVOLUTION_API_KEY}

 Para verificar as instâncias:        curl http://localhost:${PORT}/instance/fetchInstances -H "apikey: ${EVOLUTION_API_KEY}"
 Para escanear o QR (do seu PC):      ssh -L ${PORT}:localhost:${PORT} <USUARIO>@<IP>  →  http://localhost:${PORT}/manager
========================================================================================
EOF
