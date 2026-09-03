import { useCallback } from 'react'
import { useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { formatarTelefone, linkTelefone, linkWhatsApp, mensagemPadraoWhatsApp } from '@/lib/telefone'
import type { Lead } from '@/lib/tipos'
import { ORGAOS, TIPOS_VEICULO } from '@/lib/tipos'
import { moeda, data } from '@/lib/formatos'

export function nomeOrgao(id?: string): string {
  return ORGAOS.find((o) => o.id === id)?.nome ?? ''
}
export function nomeVeiculo(id?: string): string {
  return TIPOS_VEICULO.find((o) => o.id === id)?.nome ?? ''
}

export function textoCopiaLead(l: Lead): string {
  const linhas = [
    `Nome: ${l.nome}`,
    `Telefone: ${formatarTelefone(l.telefone)}`,
    l.email && `E-mail: ${l.email}`,
    `Tipo: ${l.tipoPessoa}${l.empresa ? ` · ${l.empresa}` : ''}`,
    (l.cidade || l.uf) && `Cidade: ${[l.cidade, l.uf].filter(Boolean).join('/')}`,
    l.origem && `Origem: ${l.origem}`,
    l.orgao && `Órgão: ${nomeOrgao(l.orgao)}`,
    l.tipoVeiculo && `Veículo: ${nomeVeiculo(l.tipoVeiculo)}`,
    l.dataApreensao && `Apreensão: ${data(l.dataApreensao)}${l.localApreensao ? ` em ${l.localApreensao}` : ''}`,
    l.carga && `Carga: ${l.carga}`,
    l.servicoInteresse && `Serviço: ${l.servicoInteresse}`,
    l.valorEstimado ? `Valor estimado: ${moeda(l.valorEstimado)}` : null,
    l.observacoes && `Obs.: ${l.observacoes}`,
  ].filter(Boolean)
  return linhas.join('\n')
}

/** Ações de um toque: ligar, WhatsApp e copiar dados. */
export function useAcoesLead() {
  const { usuario } = useAuth()
  const toast = useToast()
  const ligar = useCallback((l: Pick<Lead, 'telefone'>) => {
    window.location.href = linkTelefone(l.telefone)
  }, [])
  const whatsapp = useCallback(
    (l: Pick<Lead, 'telefone' | 'nome'>) => {
      const url = linkWhatsApp(l.telefone, mensagemPadraoWhatsApp(l.nome, usuario?.nome ?? ''))
      window.open(url, '_blank', 'noopener')
    },
    [usuario?.nome],
  )
  const copiar = useCallback(
    async (l: Lead) => {
      try {
        await navigator.clipboard.writeText(textoCopiaLead(l))
        toast.sucesso('Dados copiados')
      } catch {
        toast.erro('Não foi possível copiar')
      }
    },
    [toast],
  )
  return { ligar, whatsapp, copiar }
}
