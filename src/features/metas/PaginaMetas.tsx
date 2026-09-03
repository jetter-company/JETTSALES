import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Trophy, Pencil } from 'lucide-react'
import { AnelProgresso, Botao, Cartao, Entrada, EsqueletoCartao, Etiqueta, Kpi, Modal, NumeroAnimado, Selecao, useToast, cx, Avatar } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { itemCascata } from '@/lib/motion'
import { extratoMensal, recebidoNoMes, ritmoMeta, ticketMedio, vendasDoMes, vendidoNoMes, comissaoCoordenador } from '@/lib/comissao'
import { hojeISO, intervaloMes, listaMeses, mesAtual, mesDe } from '@/lib/datas'
import { inteiro, lerNumeroBR, mesExtenso, moeda, numeroBR, percentual } from '@/lib/formatos'
import { ETAPAS, type Lead } from '@/lib/tipos'
import { useLeadsSobDemanda } from '@/features/leads/dados'
import { useParcelasRecebidasMes, useVendasMes } from '@/features/vendas/dados'
import { publicarResumo, salvarMeta, useMeta, useResumoMes } from './dados'

export function PaginaMetas() {
  const usuario = useUsuario()
  const { veTudo, ehGestor, equipe, config } = useAuth()
  const toast = useToast()
  const [mes, setMes] = useState(mesAtual())
  const [vendedorSel, setVendedorSel] = useState(veTudo ? 'todos' : usuario.id)
  const escopo = veTudo ? (vendedorSel === 'todos' ? null : vendedorSel) : usuario.id
  const vendedorFoco = escopo ?? usuario.id

  const leads = useLeadsSobDemanda(escopo)
  const vendas = useVendasMes(mes, escopo)
  const recebidas = useParcelasRecebidasMes(mes, escopo)
  const metaUsuario = equipe.find((u) => u.id === vendedorFoco)?.metaMensalRecebido ?? usuario.metaMensalRecebido ?? config.geral.metaPadraoRecebido
  const { meta } = useMeta(escopo ? vendedorFoco : null, mes, metaUsuario)
  const metaTime = useMemo(() => equipe.filter((u) => u.ativo && u.papel === 'vendedor').reduce((s, u) => s + (u.metaMensalRecebido ?? 0), 0), [equipe])
  const metaEfetiva = escopo ? meta : metaTime
  const resumo = useResumoMes(mes)
  const [editandoMeta, setEditandoMeta] = useState(false)

  const carregando = leads.carregando || vendas.carregando || recebidas.carregando
  const hoje = hojeISO()
  const { inicio, fim } = intervaloMes(mes)

  const leadsMes = useMemo(() => leads.dados.filter((l) => l.criadoEm && mesDe(l.criadoEm) === mes), [leads.dados, mes])
  const contatosMes = useMemo(() => leads.dados.filter((l) => l.ultimoContatoEm && mesDe(l.ultimoContatoEm) === mes).length, [leads.dados, mes])
  const qualificadosMes = leadsMes.filter((l) => l.qualificado).length
  const ganhosMes = useMemo(() => leads.dados.filter((l) => l.etapa === 'ganho' && l.atualizadoEm && mesDe(l.atualizadoEm) === mes).length, [leads.dados, mes])
  const vendasAtivas = vendasDoMes(vendas.dados, mes)
  const vendido = vendidoNoMes(vendas.dados, mes)
  const recebido = recebidoNoMes(recebidas.dados, mes)
  const ritmo = ritmoMeta(metaEfetiva, recebido, mes === mesAtual() ? new Date() : new Date(`${fim}T12:00:00`), config.geral.sabadoUtil)
  const extrato = useMemo(() => extratoMensal(vendas.dados, recebidas.dados, mes, vendedorFoco, config.comissao), [vendas.dados, recebidas.dados, mes, vendedorFoco, config.comissao])
  const comissaoCoord = comissaoCoordenador(vendido, config.comissao.percentualCoordenadorContratos)

  useEffect(() => {
    if (carregando || !escopo || escopo !== usuario.id) return
    void publicarResumo(mes, usuario.id, { nome: usuario.nome, recebido, vendido, contratos: vendasAtivas.length })
  }, [carregando, escopo, usuario.id, usuario.nome, mes, recebido, vendido, vendasAtivas.length])

  const funil = useMemo(() => ETAPAS.map((e) => ({ etapa: e.nome, total: leads.dados.filter((l) => l.etapa === e.id).length })), [leads.dados])

  const acumulado = useMemo(() => {
    const dias: { dia: string; recebido: number; meta: number }[] = []
    const d0 = new Date(`${inicio}T12:00:00`)
    const d1 = new Date(`${fim}T12:00:00`)
    const totalDias = d1.getDate()
    let soma = 0
    for (let d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10)
      if (iso > hoje && mes === mesAtual()) break
      soma += recebidas.dados.filter((p) => (p.dataRecebimento ?? '').slice(0, 10) === iso).reduce((s, p) => s + (p.valorRecebido ?? p.valor), 0)
      dias.push({ dia: String(d.getDate()).padStart(2, '0'), recebido: Math.round(soma), meta: Math.round((metaEfetiva * d.getDate()) / totalDias) })
    }
    return dias
  }, [recebidas.dados, inicio, fim, hoje, mes, metaEfetiva])

  const origens = useMemo(() => {
    const mapa = new Map<string, { leads: number; ganhos: number }>()
    for (const l of leads.dados) {
      const k = l.origem || 'Sem origem'
      const v = mapa.get(k) ?? { leads: 0, ganhos: 0 }
      v.leads++
      if (l.etapa === 'ganho') v.ganhos++
      mapa.set(k, v)
    }
    return Array.from(mapa.entries())
      .map(([origem, v]) => ({ origem: origem.replace('Meta Ads ', ''), leads: v.leads, conversao: v.leads ? Math.round((v.ganhos / v.leads) * 100) : 0 }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 8)
  }, [leads.dados])

  const ranking = useMemo(() => {
    const lista = Object.entries(resumo)
      .map(([id, r]) => ({ id, ...r }))
      .filter((r) => equipe.find((u) => u.id === r.id)?.ativo !== false)
      .sort((a, b) => b.recebido - a.recebido)
    return lista
  }, [resumo, equipe])
  const posicaoPropria = ranking.findIndex((r) => r.id === usuario.id)

  async function salvarNovaMeta(valor: number) {
    try {
      await salvarMeta(vendedorFoco, mes, valor)
      toast.sucesso('Meta atualizada')
    } catch {
      toast.erro('Não foi possível salvar a meta')
    }
  }

  return (
    <Pagina
      titulo="Performance e metas"
      subtitulo={`${mesExtenso(mes)}${escopo ? '' : ' · todo o time'}`}
      acoes={
        <>
          <Selecao aria-label="Mês" className="w-44" opcoes={listaMeses(12).map((m) => ({ valor: m, nome: mesExtenso(m) }))} value={mes} onChange={(e) => setMes(e.target.value)} />
          {veTudo && <Selecao aria-label="Vendedor" className="w-44" opcoes={[{ valor: 'todos', nome: 'Todo o time' }, ...equipe.filter((u) => u.ativo).map((u) => ({ valor: u.id, nome: u.nome }))]} value={vendedorSel} onChange={(e) => setVendedorSel(e.target.value)} />}
        </>
      }
    >
      {carregando ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EsqueletoCartao />
          <EsqueletoCartao />
          <EsqueletoCartao />
          <EsqueletoCartao />
        </div>
      ) : (
        <>
          <motion.div variants={itemCascata} className="flex flex-col gap-4">
            <Cartao className="p-5 flex flex-wrap items-center gap-6">
              <AnelProgresso percentual={ritmo.percentual} tamanho={150} espessura={11}>
                <span className="text-2xl font-semibold text-platina tabular">{Math.round(ritmo.percentual)}%</span>
                <span className="text-[11px] text-prata-3">da meta</span>
              </AnelProgresso>
              <div className="min-w-[200px] flex-1">
                <p className="text-xs text-prata-2">Meta de recebido</p>
                <p className="text-xl font-semibold text-platina tabular">{moeda(metaEfetiva)}</p>
                <p className="mt-2 text-xs text-prata-3">
                  {ritmo.falta > 0 ? (
                    <>
                      Faltam <span className="text-platina">{moeda(ritmo.falta)}</span>. Ritmo: <span className="text-platina">{moeda(ritmo.porDiaUtil)}</span> por dia útil ({ritmo.diasUteisRestantes} restantes).
                    </>
                  ) : (
                    'Meta batida.'
                  )}
                </p>
                {escopo && (veTudo || ehGestor) && (
                  <Botao className="mt-3" tamanho="sm" variante="fantasma" onClick={() => setEditandoMeta(true)} icone={<Pencil className="h-3.5 w-3.5" />}>
                    Editar meta
                  </Botao>
                )}
              </div>
            </Cartao>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <Cartao className="p-4">
                <Kpi rotulo="Vendido" valor={vendido} formatar={moeda} detalhe={`${vendasAtivas.length} contratos`} />
              </Cartao>
              <Cartao className="p-4">
                <Kpi rotulo="Recebido" valor={recebido} formatar={moeda} tom="recebido" detalhe={`${recebidas.dados.length} parcelas`} />
              </Cartao>
              <Cartao className="p-4">
                <Kpi rotulo="Ticket médio" valor={ticketMedio(vendasAtivas)} formatar={moeda} />
              </Cartao>
              <Cartao className="p-4">
                <Kpi rotulo={escopo ? 'Comissão prevista' : 'Comissão do coordenador'} valor={escopo ? extrato.totalPrevisto : comissaoCoord} formatar={moeda} tom="acento" detalhe={escopo ? `Faixa ${extrato.faixa}` : `${config.comissao.percentualCoordenadorContratos}% do vendido`} />
              </Cartao>
              <Cartao className="p-4">
                <Kpi rotulo="Leads do mês" valor={leadsMes.length} formatar={inteiro} />
              </Cartao>
              <Cartao className="p-4">
                <Kpi rotulo="Contatos feitos" valor={contatosMes} formatar={inteiro} />
              </Cartao>
              <Cartao className="p-4">
                <Kpi rotulo="Taxa de qualificação" valor={leadsMes.length ? (qualificadosMes / leadsMes.length) * 100 : 0} formatar={(n) => percentual(n)} detalhe={`${qualificadosMes} de ${leadsMes.length}`} />
              </Cartao>
              <Cartao className="p-4">
                <Kpi rotulo="Taxa de conversão" valor={qualificadosMes ? (ganhosMes / qualificadosMes) * 100 : 0} formatar={(n) => percentual(n)} detalhe={`${ganhosMes} ganhos sobre qualificados`} />
              </Cartao>
            </div>
          </motion.div>

          <motion.div variants={itemCascata} className="grid gap-4 lg:grid-cols-3">
            <Cartao className="p-5" brilho={false}>
              <h2 className="text-sm font-semibold text-platina mb-3">Recebido acumulado contra a meta</h2>
              <div className="h-[220px]">
                <ResponsiveContainer>
                  <AreaChart data={acumulado} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad-rec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5b7cff" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#8a5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fill: '#6b6b75', fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis tick={{ fill: '#6b6b75', fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<DicaGrafico />} />
                    <Area type="monotone" dataKey="meta" stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" fill="none" strokeWidth={1.5} name="Linha da meta" isAnimationActive={false} />
                    <Area type="monotone" dataKey="recebido" stroke="#7f9bff" strokeWidth={2.2} fill="url(#grad-rec)" name="Recebido" animationDuration={900} />
                    <ReferenceLine y={metaEfetiva} stroke="rgba(255,255,255,0.15)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Cartao>
            <Cartao className="p-5" brilho={false}>
              <h2 className="text-sm font-semibold text-platina mb-3">Funil por etapa</h2>
              <div className="h-[220px]">
                <ResponsiveContainer>
                  <BarChart data={funil} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="etapa" width={104} tick={{ fill: '#9a9aa3', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DicaGrafico />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="total" name="Leads" radius={[0, 6, 6, 0]} animationDuration={800}>
                      {funil.map((f, i) => (
                        <Cell key={f.etapa} fill={f.etapa === 'Ganho' ? '#3fb68b' : f.etapa === 'Perdido' ? '#3d3d47' : `rgba(127,155,255,${0.9 - i * 0.12})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Cartao>
            <Cartao className="p-5" brilho={false}>
              <h2 className="text-sm font-semibold text-platina mb-3">Origem dos leads e conversão</h2>
              <div className="h-[220px]">
                <ResponsiveContainer>
                  <BarChart data={origens} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="origem" tick={{ fill: '#6b6b75', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} height={40} textAnchor="end" />
                    <YAxis yAxisId="a" tick={{ fill: '#6b6b75', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <YAxis yAxisId="b" orientation="right" tick={{ fill: '#6b6b75', fontSize: 11 }} axisLine={false} tickLine={false} width={34} unit="%" />
                    <Tooltip content={<DicaGrafico />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar yAxisId="a" dataKey="leads" name="Leads" fill="rgba(201,202,209,0.55)" radius={[6, 6, 0, 0]} animationDuration={800} />
                    <Bar yAxisId="b" dataKey="conversao" name="Conversão %" fill="#7f9bff" radius={[6, 6, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Cartao>
          </motion.div>

          <motion.div variants={itemCascata} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            {escopo && (
              <Cartao className="p-5" brilho={false}>
                <h2 className="text-sm font-semibold text-platina mb-3">Extrato do mês</h2>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-prata-2">Vendido no mês</dt>
                  <dd className="text-right text-platina tabular">{moeda(extrato.vendido)}</dd>
                  <dt className="text-prata-2">Faixa</dt>
                  <dd className="text-right">
                    <Etiqueta tom="prata">{extrato.faixa}</Etiqueta>
                  </dd>
                  <dt className="text-prata-2">Fixo previsto pela faixa</dt>
                  <dd className="text-right text-platina tabular">{moeda(extrato.fixo)}</dd>
                  <dt className="text-prata-2">Recebido no mês</dt>
                  <dd className="text-right text-platina tabular">{moeda(extrato.recebido)}</dd>
                  <dt className="text-prata-2">Comissão ({extrato.percentual}% do recebido)</dt>
                  <dd className="text-right text-[#7ad7b3] tabular">{moeda(extrato.comissao)}</dd>
                  <dt className="text-platina font-semibold pt-2 border-t border-white/[0.08]">Total previsto</dt>
                  <dd className="text-right text-platina font-semibold tabular pt-2 border-t border-white/[0.08]">
                    <NumeroAnimado valor={extrato.totalPrevisto} formatar={moeda} />
                  </dd>
                </dl>
                <p className="mt-3 text-xs text-prata-3">
                  {extrato.proximaFaixa ? `Faltam ${moeda(extrato.faltaProximaFaixa)} vendidos para a faixa ${extrato.proximaFaixa.nome} (fixo ${moeda(extrato.proximaFaixa.valorFixo)}).` : 'Faixa máxima atingida.'}
                </p>
              </Cartao>
            )}
            <Cartao className="p-5" brilho={false}>
              <h2 className="text-sm font-semibold text-platina mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#f0c27a]" /> Ranking do time
              </h2>
              {ranking.length === 0 ? (
                <p className="text-sm text-prata-3">Ainda sem dados publicados neste mês. O ranking se monta conforme os vendedores abrem o app.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {ranking.map((r, i) => {
                    const mostrarNome = veTudo || r.id === usuario.id
                    return (
                      <li key={r.id} className={cx('flex items-center gap-3 rounded-md px-3 py-2', i === 0 ? 'bg-[linear-gradient(90deg,rgba(91,124,255,0.18),rgba(138,92,246,0.08))] border border-acento/30' : 'bg-white/[0.02] border border-white/[0.05]', r.id === usuario.id && i !== 0 && 'border-white/[0.14]')}>
                        <span className={cx('w-6 text-center text-sm font-semibold tabular', i === 0 ? 'text-[#f0c27a]' : 'text-prata-3')}>{i + 1}º</span>
                        <Avatar nome={mostrarNome ? r.nome : '?'} fotoUrl={equipe.find((u) => u.id === r.id)?.fotoUrl} tamanho={30} />
                        <span className="flex-1 truncate text-sm text-platina">{mostrarNome ? r.nome : 'Colega'}</span>
                        <span className="text-sm text-[#7ad7b3] tabular">{mostrarNome ? moeda(r.recebido) : ''}</span>
                      </li>
                    )
                  })}
                </ol>
              )}
              {!veTudo && posicaoPropria >= 0 && <p className="mt-3 text-xs text-prata-3">Você está em {posicaoPropria + 1}º lugar entre {ranking.length}.</p>}
            </Cartao>
          </motion.div>
        </>
      )}

      <ModalMeta aberto={editandoMeta} aoFechar={() => setEditandoMeta(false)} valorAtual={metaEfetiva} aoSalvar={salvarNovaMeta} />
    </Pagina>
  )
}

function ModalMeta({ aberto, aoFechar, valorAtual, aoSalvar }: { aberto: boolean; aoFechar: () => void; valorAtual: number; aoSalvar: (v: number) => Promise<void> }) {
  const [valor, setValor] = useState(numeroBR(valorAtual))
  useEffect(() => {
    if (aberto) setValor(numeroBR(valorAtual))
  }, [aberto, valorAtual])
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Meta de recebido do mês"
      largura="sm"
      rodape={
        <Botao
          variante="primario"
          onClick={() => {
            void aoSalvar(lerNumeroBR(valor)).then(aoFechar)
          }}
        >
          Salvar meta
        </Botao>
      }
    >
      <Entrada rotulo="Valor (R$)" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
    </Modal>
  )
}

function DicaGrafico({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="vidro-2 bg-fundo-1/95 rounded-sm px-3 py-2 text-xs">
      <p className="text-prata-3 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-platina tabular">
          {p.name}: {p.name.includes('%') ? `${p.value}%` : typeof p.value === 'number' && p.value > 999 ? moeda(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export type { Lead }
