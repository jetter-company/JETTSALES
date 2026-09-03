import { useMemo, useState } from 'react'
import { ClipboardCopy, FileDown } from 'lucide-react'
import { Botao, Caixa, Modal, useToast, Entrada } from '@/components/ui'
import { data as fmtData, moeda } from '@/lib/formatos'
import { formatarTelefone } from '@/lib/telefone'
import type { Lead, Venda } from '@/lib/tipos'
import { nomeOrgao, nomeVeiculo } from './acoesLead'

const CHECKLIST = [
  { id: 'rg', nome: 'Foto do RG ou CNH do proprietário' },
  { id: 'crlv', nome: 'Foto do CRLV' },
  { id: 'endereco', nome: 'Endereço completo' },
  { id: 'estadoCivil', nome: 'Estado civil' },
  { id: 'telefone', nome: 'Telefone' },
  { id: 'email', nome: 'E-mail' },
  { id: 'ecac', nome: 'Acesso ao e-CAC ou certificado digital (acesso obtido)' },
]

/**
 * Ficha de repasse para o jurídico. O app nunca armazena senhas de clientes:
 * o item do e-CAC é só a caixa "acesso obtido".
 */
export function FichaRepasse({ lead, venda, aberto, aoFechar, nomeVendedor }: { lead: Lead; venda?: Venda | null; aberto: boolean; aoFechar: () => void; nomeVendedor: string }) {
  const toast = useToast()
  const [marcados, setMarcados] = useState<Record<string, boolean>>({})
  const [endereco, setEndereco] = useState('')
  const [estadoCivil, setEstadoCivil] = useState('')
  const [obs, setObs] = useState('')

  const texto = useMemo(() => {
    const linhas = [
      'FICHA DE REPASSE PARA O JURÍDICO',
      `Escritório: Pedrini & Azevedo Advogados Associados`,
      `Gerada em: ${fmtData(new Date())} por ${nomeVendedor}`,
      '',
      'CLIENTE',
      `Nome: ${lead.nome}`,
      `Tipo: ${lead.tipoPessoa}${lead.empresa ? ` · ${lead.empresa}` : ''}`,
      `Telefone: ${formatarTelefone(lead.telefone)}`,
      `E-mail: ${lead.email ?? 'não informado'}`,
      `Cidade: ${[lead.cidade, lead.uf].filter(Boolean).join('/') || 'não informada'}`,
      `Endereço: ${endereco || 'pendente'}`,
      `Estado civil: ${estadoCivil || 'pendente'}`,
      '',
      'APREENSÃO',
      `Órgão: ${nomeOrgao(lead.orgao) || 'não informado'}`,
      `Veículo: ${nomeVeiculo(lead.tipoVeiculo) || 'não informado'}`,
      `Data: ${lead.dataApreensao ? fmtData(lead.dataApreensao) : 'não informada'}`,
      `Local: ${lead.localApreensao ?? 'não informado'}`,
      `Carga: ${lead.carga ?? 'não informada'}`,
      `Auto de infração: ${lead.autoInfracao ? 'sim' : 'não informado'}`,
      `Documentos em mãos: ${lead.documentosEmMaos?.length ? lead.documentosEmMaos.join(', ') : 'nenhum informado'}`,
      '',
      'CONTRATO',
      venda ? `Serviço: ${venda.servico}` : `Serviço de interesse: ${lead.servicoInteresse ?? 'não informado'}`,
      venda ? `Valor total: ${moeda(venda.valorTotal)} · Entrada: ${moeda(venda.entrada)} · ${venda.numParcelas}x` : '',
      venda ? `Fechamento: ${fmtData(venda.dataFechamento)}` : '',
      '',
      'CHECKLIST',
      ...CHECKLIST.map((c) => `[${marcados[c.id] ? 'x' : ' '}] ${c.nome}`),
      '',
      obs ? `Observações: ${obs}` : '',
      lead.observacoes ? `Observações do lead: ${lead.observacoes}` : '',
    ].filter((l) => l !== '' || true)
    return linhas.join('\n').replace(/\n{3,}/g, '\n\n')
  }, [lead, venda, marcados, endereco, estadoCivil, obs, nomeVendedor])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      toast.sucesso('Ficha copiada')
    } catch {
      toast.erro('Não foi possível copiar')
    }
  }

  async function pdf() {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text('Ficha de repasse para o jurídico', 48, 56)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      const linhas = doc.splitTextToSize(texto.split('\n').slice(1).join('\n'), 500) as string[]
      let y = 84
      for (const l of linhas) {
        if (y > 790) {
          doc.addPage()
          y = 56
        }
        doc.text(l, 48, y)
        y += 15
      }
      doc.save(`repasse-${lead.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível gerar o PDF')
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Ficha de repasse para o jurídico"
      descricao="Marque o que já foi recebido do cliente. Senhas nunca são guardadas aqui."
      largura="lg"
      rodape={
        <>
          <Botao variante="secundario" onClick={() => void copiar()} icone={<ClipboardCopy className="h-4 w-4" />}>
            Copiar como texto
          </Botao>
          <Botao variante="primario" onClick={() => void pdf()} icone={<FileDown className="h-4 w-4" />}>
            Exportar PDF
          </Botao>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1 text-[13px] font-medium text-prata-2">Checklist</p>
            {CHECKLIST.map((c) => (
              <Caixa key={c.id} rotulo={c.nome} checked={!!marcados[c.id]} onChange={(e) => setMarcados((m) => ({ ...m, [c.id]: e.target.checked }))} />
            ))}
          </div>
          <Entrada rotulo="Endereço completo" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          <Entrada rotulo="Estado civil" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} />
          <Entrada rotulo="Observações para o jurídico" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <pre className="vidro rounded-md p-4 text-[12px] leading-relaxed text-prata whitespace-pre-wrap font-sans max-h-[50dvh] overflow-auto">{texto}</pre>
      </div>
    </Modal>
  )
}
