import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const moedaFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const numeroFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const inteiroFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export function moeda(valor: number | null | undefined): string {
  return moedaFmt.format(valor ?? 0)
}

/** Valor em formato brasileiro sem o símbolo (para CSV): 1.234,56 */
export function numeroBR(valor: number | null | undefined): string {
  return numeroFmt.format(valor ?? 0)
}

export function inteiro(valor: number | null | undefined): string {
  return inteiroFmt.format(valor ?? 0)
}

export function percentual(valor: number, casas = 0): string {
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`
}

export function paraData(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null
  if (iso instanceof Date) return isValid(iso) ? iso : null
  const d = parseISO(iso)
  return isValid(d) ? d : null
}

export function data(iso: string | Date | null | undefined): string {
  const d = paraData(iso)
  return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : ''
}

export function dataHora(iso: string | Date | null | undefined): string {
  const d = paraData(iso)
  return d ? format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''
}

export function hora(iso: string | Date | null | undefined): string {
  const d = paraData(iso)
  return d ? format(d, 'HH:mm', { locale: ptBR }) : ''
}

export function dataCurta(iso: string | Date | null | undefined): string {
  const d = paraData(iso)
  return d ? format(d, "dd 'de' MMM", { locale: ptBR }) : ''
}

export function mesExtenso(mes: string): string {
  const d = parseISO(`${mes}-01`)
  return isValid(d) ? format(d, "MMMM 'de' yyyy", { locale: ptBR }) : mes
}

export function primeiroNome(nome: string | undefined | null): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? ''
}

export function iniciais(nome: string | undefined | null): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  const a = partes[0]?.[0] ?? ''
  const b = partes.length > 1 ? partes[partes.length - 1]?.[0] ?? '' : ''
  return (a + b).toUpperCase()
}

/** Converte texto em formato brasileiro ("1.234,56" ou "1234.56") para número. */
export function lerNumeroBR(texto: string | number | null | undefined): number {
  if (typeof texto === 'number') return texto
  if (!texto) return 0
  let t = String(texto).trim().replace(/[R$\s]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  // Sem vírgula: "200.000" ou "1.234.567" são milhares; "1234.5" é decimal.
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : 0
}

export function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`
}
