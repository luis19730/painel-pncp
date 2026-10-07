// O `numero_controle_pncp` é algo como `53212344000120-1-000091/2025` e contém
// `/`, que NÃO pode ser um segmento de rota. Usamos um slug estável trocando
// `/` por `~` (símbolo que não aparece no identificador do PNCP).

export function encodePncpId(pncpId: string): string {
  return String(pncpId || '').trim().replace(/\//g, '~')
}

export function decodePncpId(slug: string): string {
  return decodeURIComponent(String(slug || '')).replace(/~/g, '/')
}
