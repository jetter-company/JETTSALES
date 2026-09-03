import { useEffect, useState } from 'react'
import { Botao, Entrada, Modal, Selecao, useToast } from '@/components/ui'
import { hojeISO } from '@/lib/datas'
import { lerNumeroBR, moeda, numeroBR } from '@/lib/formatos'
import { FORMAS_PAGAMENTO, type FormaPagamento, type Parcela } from '@/lib/tipos'
import { marcarRecebida } from './dados'

/** Marcar como recebido pede data e valor (permite parcial). */
export function ModalRecebimento({ parcela, aberto, aoFechar, aoSalvar }: { parcela: Parcela | null; aberto: boolean; aoFechar: () => void; aoSalvar?: () => void }) {
  const toast = useToast()
  const [dataRec, setDataRec] = useState(hojeISO())
  const [valor, setValor] = useState('')
  const [forma, setForma] = useState<FormaPagamento | ''>('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto && parcela) {
      setDataRec(hojeISO())
      setValor(numeroBR(parcela.valor))
      setForma(parcela.formaPagamento ?? '')
    }
  }, [aberto, parcela])

  const valorNum = lerNumeroBR(valor)
  const parcial = parcela ? valorNum > 0 && valorNum < parcela.valor - 0.009 : false

  async function salvar() {
    if (!parcela) return
    if (valorNum <= 0) return toast.erro('Informe o valor recebido')
    if (valorNum > parcela.valor + 0.009) return toast.erro('O valor não pode ser maior que a parcela')
    setSalvando(true)
    try {
      await marcarRecebida(parcela, dataRec, valorNum, forma || undefined)
      toast.sucesso('Recebimento registrado', parcial ? `Saldo de ${moeda(parcela.valor - valorNum)} continua previsto.` : undefined)
      aoSalvar?.()
      aoFechar()
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível registrar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Marcar como recebido"
      descricao={parcela ? `${parcela.clienteNome} · parcela ${parcela.numero || 'entrada'} de ${moeda(parcela.valor)}` : undefined}
      largura="sm"
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="sucesso" onClick={() => void salvar()} carregando={salvando}>
            Marcar como recebido
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Entrada rotulo="Data do recebimento" type="date" value={dataRec} onChange={(e) => setDataRec(e.target.value)} required />
        <Entrada rotulo="Valor recebido (R$)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} dica={parcial ? `Recebimento parcial. O saldo de ${moeda((parcela?.valor ?? 0) - valorNum)} fica como nova parcela prevista.` : undefined} />
        <Selecao rotulo="Forma de pagamento" vazio="Não informar" opcoes={FORMAS_PAGAMENTO.map((f) => ({ valor: f.id, nome: f.nome }))} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento | '')} />
      </div>
    </Modal>
  )
}
