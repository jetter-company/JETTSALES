import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Botao, useToast } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { FormularioLead } from './FormularioLead'
import { criarLead, type NovoLead } from './dados'

export function PaginaNovoLead() {
  const navegar = useNavigate()
  const toast = useToast()
  const [salvando, setSalvando] = useState(false)

  async function salvar(dados: NovoLead) {
    setSalvando(true)
    try {
      const id = await criarLead(dados)
      toast.sucesso('Lead salvo')
      navegar(`/leads/${id}`, { replace: true })
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível salvar o lead')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Pagina
      titulo="Novo lead"
      subtitulo="Só nome e telefone são obrigatórios."
      acoes={
        <Botao variante="fantasma" tamanho="sm" onClick={() => navegar(-1)} icone={<ArrowLeft className="h-4 w-4" />}>
          Voltar
        </Botao>
      }
    >
      <div className="max-w-3xl">
        <FormularioLead aoSalvar={salvar} salvando={salvando} />
      </div>
    </Pagina>
  )
}
