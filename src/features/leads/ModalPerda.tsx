import { useState } from 'react'
import { Botao, Modal, Selecao, AreaTexto, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import type { Lead } from '@/lib/tipos'
import { moverEtapa } from './dados'

/** Ao marcar Perdido, o motivo é obrigatório. */
export function ModalPerda({ lead, aberto, aoFechar, aoConcluir }: { lead: Lead | null; aberto: boolean; aoFechar: () => void; aoConcluir?: () => void }) {
  const { config } = useAuth()
  const toast = useToast()
  const [motivo, setMotivo] = useState('')
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    if (!lead || !motivo) {
      toast.erro('Escolha o motivo da perda')
      return
    }
    setSalvando(true)
    try {
      await moverEtapa(lead.id, 'perdido', { motivoPerda: motivo, proximaAcao: null, observacoes: obs.trim() ? `${lead.observacoes ? `${lead.observacoes}\n` : ''}Perda: ${obs.trim()}` : lead.observacoes })
      toast.info('Lead marcado como perdido')
      aoConcluir?.()
      aoFechar()
      setMotivo('')
      setObs('')
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Marcar como perdido"
      descricao={lead ? `${lead.nome}. O motivo é obrigatório.` : undefined}
      largura="sm"
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="perigo" onClick={() => void confirmar()} carregando={salvando}>
            Marcar como perdido
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Selecao rotulo="Motivo" required vazio="Escolha o motivo" opcoes={config.listas.motivosPerda.map((m) => ({ valor: m, nome: m }))} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <AreaTexto rotulo="Observação (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
      </div>
    </Modal>
  )
}
