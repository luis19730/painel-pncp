#!/usr/bin/env bash
#
# ============================================================================
# CRIA A VPS NA ORACLE CLOUD (roda numa máquina com o OCI CLI configurado)
#
# Pré-requisitos (2 passos manuais, um só vez):
#   1) Ter uma conta Oracle Always Free criada  (cloud.oracle.com)
#   2) `oci setup config`  →  gera a API key ligada à sua conta (login manual)
#
# Depois:  bash create-vps.sh
# Ele cria a VM (Ubuntu, Ampere A1 free), gera a call de setup da VPS e imprime
# o comando SSH para você rodar o set-on-vps.sh dentro dela.
# ============================================================================
set -euo pipefail

REGION="${OCI_REGION:-sa-saopaulo-1}"          # troque se sua conta é de outra região
COMPUTE_SHAPE="${OCI_COMPUTE_SHAPE:-VM.Standard.A1.Flex}"
OCPU="${OCPU:-1}"
MEM_GB="${MEM_GB:-6}"
SSH_KEY_FILE="${SSH_KEY_FILE:-$HOME/.ssh/evolution_rsa.pub}"
INSTANCE_NAME="${VPS_NAME:-evolution}"

[ -f "$SSH_KEY_FILE" ] || { echo "SSH key não encontrada: $SSH_KEY_FILE"; exit 1; }

echo "==> Descobrindo tenancy/compartment..."
TENANCY_OCID=$(oci iam tenancy list --query "data[0].id" --raw-output 2>/dev/null)
# Melhor: usa o compartment raiz da tenancy
IFS=':' read -r _ _ _ _ _ _ COMPART_OCID <<< "$TENANCY_OCID"
echo "   tenancy: $TENANCY_OCID"
echo "   compartment: $COMPART_OCID"

echo "==> Buscando VCN/Subnet default..."
VCN_OCID=$(oci network vcn list --compartment-id "$COMPART_OCID" --query "data[0].id" --raw-output 2>/dev/null || true)
SUBNET_OCID=$(oci network subnet list --compartment-id "$COMPART_OCID" --query "data[0].id" --raw-output 2>/dev/null || true)

if [ -z "${SUBNET_OCID:-}" ]; then
  echo "   -> Sem VCN/subnet default. Favor criar no console ou preencher VCN_OCID/SUBNET_OCID acima."
  exit 1
fi
echo "   vcn: $VCN_OCID"
echo "   subnet: $SUBNET_OCID"

echo "==> Criando instância $INSTANCE_NAME (aguarde ~2-3 min)..."
LAUNCH=$(oci compute instance launch \
  --compartment-id "$COMPART_OCID" \
  --availability-domain "ad1" \
  --display-name "$INSTANCE_NAME" \
  --shape "$COMPUTE_SHAPE" \
  --shape-config "{\"ocpus\":$OCPU,\"memoryInGBs\":$MEM_GB}" \
  --image-id "$(oci compute image list --compartment-id "$COMPART_OCID" --operating-system Ubuntu --shape "$COMPUTE_SHAPE" --query "data[0].id" --raw-output)" \
  --subnet-id "$SUBNET_OCID" \
  --assign-public-ip true \
  --metadata "{\"ssh_authorized_keys\":\"$(cat "$SSH_KEY_FILE")\"}" \
  --wait-for-state RUNNING)

INSTANCE_OCID=$(echo "$LAUNCH" | jq -r '.data.id')
PUBLIC_IP=$(oci compute instance list-vnics --compartment-id "$COMPART_OCID" --instance-id "$INSTANCE_OCID" --query "data[0].\"public-ip\"" --raw-output)

echo ""
echo "======================================================================"
echo " VPS PRONTA: $PUBLIC_IP"
echo " Instância OCID: $INSTANCE_OCID"
echo ""
echo " Agora conecte (usuário ubuntu) e rode o setup dentro dela:"
echo ""
echo "   scp -i ~/.ssh/evolution_rsa docker/evolution/provision/setup-on-vps.sh ubuntu@$PUBLIC_IP:"
echo "   ssh -i ~/.ssh/evolution_rsa ubuntu@$PUBLIC_IP 'bash setup-on-vps.sh'"
echo ""
echo " (Opcional) Liberar porta no Security List:  porta 8080 TCP origem 0.0.0.0/0"
echo "======================================================================"
