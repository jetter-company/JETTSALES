import { useEffect, useState } from 'react'
import { Phone, MessageCircle, Mail, Users, StickyNote, Clock } from 'lucide-react'
import { AreaTexto, Botao, Entrada, Modal, Selecao, useToast } from '@/components/ui'
import { useUsuario } from '@/features/auth/AuthProvider'
import { atalhoProximaAcao, deInputDateTime, isoLocal, paraInputDateTime } from '@/lib/datas'
import { ETAPAS, RESULTADOS_INTERACAO, type Etapa, type Lead, type ResultadoInteracao, type TipoInteracao, type TipoProximaAcao } from '@/lib/tipos'
import { registrarInteracao } from './dados'
import { cx } from '@/components/ui'

const ICONES: Record<TipoInteracao, typeof Phone> = { ligacao: Phone, whatsapp: MessageCircle, email: Mail, reuniao: Users, anotacao: StickyNote }
const NOMES: Record<TipoInteracao, string> = { ligacao: 'Ligação', whatsapp: 'WhatsApp', email: 'E-mail', reuniao: 'Reunião', anotacao: 'Anotação' }

/** Registrar uma interação em dois toques: tipo e resultado. O resto é opcional. */
export function ModalInteracao({ lead, aberto, aoFechar, aoSalvar, tipoInicial = 'ligacao' }: { lead: Lead | null; aberto: boolean; aoFechar: () => void; aoSalvar?: () => void; tipoInicial?: TipoInteracao }) {
  const usuario = useUsuario()
  const toast = useToast()
  const [tipo, setTipo] = useState<TipoInteracao>(tipoInicial)
  const [resultado, setResultado] = useState<ResultadoInteracao | ''>('')
  const [resumo, setResumo] = useState('')
  const [duracao, setDuracao] = useState('')
  const [proxima, setProxima] = useState<string>('')
  const [proximaTipo, setProximaTipo] = useState<TipoProximaAcao>('ligacao')
  const [etapa, setEtapa] = useState<Etapa | ''>('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aberto) {
      setTipo(tipoInicial)
      setResultado(tipoInicial === 'anotacao' ? 'n_a' : '')
      setResumo('')
      setDuracao('')
      setProxima('')
      setProximaTipo(tipoInicial === 'whatsapp' ? 'whatsapp' : 'ligacao')
      setEtapa('')
    }
  }, [aberto, tipoInicial])

  useEffect(() => {
    if (resultado === 'retorno_agendado' && !proxima) setProxima(paraInputDateTime(isoLocal(atalhoProximaAcao('amanha9'))))
  }, [resultado, proxima])

  async function salvar() {
    if (!lead) return
    if (tipo !== 'anotacao' && !resultado) {
      toast.erro('Escolha o resultado')
      return
    }
    setSalvando(true)
    try {
      await registrarInteracao(lead, usuario.id, {
        tipo,
        resultado: tipo === 'anotacao' ? 'n_a' : (resultado as ResultadoInteracao),
        resumo: resumo.trim(),
        duracaoMin: duracao ? Number(duracao) : undefined,
        proximaAcao: proxima ? { tipo: proximaTipo, dataHora: deInputDateTime(proxima), descricao: resumo.trim() ? resumo.trim().slice(0, 80) : undefined } : undefined,
        etapa: etapa || (resultado === 'sem_interesse' ? undefined : undefined),
      })
      toast.sucesso(tipo === 'anotacao' ? 'Anotação salva' : `${NOMES[tipo]} registrada`)
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
      titulo={lead ? `Registrar contato com ${lead.nome.split(' ')[0]}` : 'Registrar contato'}
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" onClick={() => void salvar()} carregando={salvando}>
            {tipo === 'anotacao' ? 'Salvar anotação' : `Registrar ${NOMES[tipo].toLowerCase()}`}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Tipo de interação">
          {(Object.keys(NOMES) as TipoInteracao[]).map((t) => {
            const Icone = ICONES[t]
            const ativo = tipo === t
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => {
                  setTipo(t)
                  if (t === 'anotacao') setResultado('n_a')
                  else if (resultado === 'n_a') setResultado('')
                }}
                className={cx(
                  'flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-sm border text-[11px] font-medium transition-colors cursor-pointer',
                  ativo ? 'border-acento/60 bg-acento/15 text-platina' : 'border-white/[0.08] bg-white/[0.03] text-prata-2 hover:bg-white/[0.06]',
                )}
              >
                <Icone className="h-5 w-5" />
                {NOMES[t]}
              </button>
            )
          })}
        </div>

        {tipo !== 'anotacao' && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Resultado">
            {RESULTADOS_INTERACAO.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={resultado === r.id}
                onClick={() => setResultado(r.id)}
                className={cx(
                  'h-10 rounded-full border px-4 text-sm font-medium transition-colors cursor-pointer',
                  resultado === r.id ? 'border-acento/60 bg-acento/15 text-platina' : 'border-white/[0.08] bg-white/[0.03] text-prata-2 hover:bg-white/[0.06]',
                )}
              >
                {r.nome}
              </button>
            ))}
          </div>
        )}

        <AreaTexto rotulo="Resumo curto" placeholder="O que foi conversado ou combinado" value={resumo} onChange={(e) => setResumo(e.target.value)} rows={2} />

        <div className="grid gap-4 sm:grid-cols-2">
          {tipo === 'ligacao' || tipo === 'reuniao' ? (
            <Entrada rotulo="Duração (min)" type="number" inputMode="numeric" min={0} value={duracao} onChange={(e) => setDuracao(e.target.value)} />
          ) : (
            <div />
          )}
          <Selecao rotulo="Mover para etapa" vazio="Manter etapa atual" opcoes={ETAPAS.filter((e) => e.id !== 'ganho' && e.id !== 'perdido').map((e) => ({ valor: e.id, nome: e.nome }))} value={etapa} onChange={(e) => setEtapa(e.target.value as Etapa | '')} />
        </div>

        <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-prata-2">
            <Clock className="h-3.5 w-3.5" /> Próxima ação
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ['hoje17', 'Hoje 17h'],
                ['amanha9', 'Amanhã 9h'],
                ['em3dias', 'Em 3 dias'],
              ] as const
            ).map(([k, nome]) => (
              <Botao key={k} tamanho="sm" variante="secundario" onClick={() => setProxima(paraInputDateTime(isoLocal(atalhoProximaAcao(k))))}>
                {nome}
              </Botao>
            ))}
            {proxima && (
              <Botao tamanho="sm" variante="fantasma" onClick={() => setProxima('')}>
                Limpar
              </Botao>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Entrada type="datetime-local" aria-label="Data e hora da próxima ação" value={proxima} onChange={(e) => setProxima(e.target.value)} />
            <Selecao
              aria-label="Tipo da próxima ação"
              opcoes={[
                { valor: 'ligacao', nome: 'Ligar' },
                { valor: 'whatsapp', nome: 'WhatsApp' },
                { valor: 'email', nome: 'E-mail' },
                { valor: 'reuniao', nome: 'Reunião' },
                { valor: 'outro', nome: 'Outro' },
              ]}
              value={proximaTipo}
              onChange={(e) => setProximaTipo(e.target.value as TipoProximaAcao)}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
