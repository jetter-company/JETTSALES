import {
  addDays,
  addHours,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSaturday,
  isSunday,
  parseISO,
  set,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export const FUSO = 'America/Sao_Paulo'

export function hojeISO(agora: Date = new Date()): string {
  return format(agora, 'yyyy-MM-dd')
}

export function mesAtual(agora: Date = new Date()): string {
  return format(agora, 'yyyy-MM')
}

export function mesDe(iso: string): string {
  return iso.slice(0, 7)
}

export function diaDe(iso: string): string {
  return iso.slice(0, 10)
}

export function agoraISO(): string {
  return new Date().toISOString()
}

export function isoLocal(d: Date): string {
  // ISO com fuso local (o navegador do vendedor, esperado em America/Sao_Paulo).
  return format(d, "yyyy-MM-dd'T'HH:mm:ssxxx")
}

export function intervaloMes(mes: string): { inicio: string; fim: string; inicioDate: Date; fimDate: Date } {
  const inicioDate = startOfMonth(parseISO(`${mes}-01`))
  const fimDate = endOfMonth(inicioDate)
  return {
    inicio: format(inicioDate, 'yyyy-MM-dd'),
    fim: format(fimDate, 'yyyy-MM-dd'),
    inicioDate,
    fimDate,
  }
}

export function intervaloSemana(agora: Date = new Date()): { inicio: Date; fim: Date } {
  return { inicio: startOfWeek(agora, { weekStartsOn: 1 }), fim: endOfWeek(agora, { weekStartsOn: 1 }) }
}

export function diaUtil(d: Date, sabadoUtil = false): boolean {
  if (isSunday(d)) return false
  if (isSaturday(d)) return sabadoUtil
  return true
}

/** Dias úteis restantes no mês, incluindo hoje. */
export function diasUteisRestantes(agora: Date = new Date(), sabadoUtil = false): number {
  const fim = endOfMonth(agora)
  const dias = eachDayOfInterval({ start: startOfDay(agora), end: fim })
  return dias.filter((d) => diaUtil(d, sabadoUtil)).length
}

export function diasUteisNoMes(mes: string, sabadoUtil = false): number {
  const { inicioDate, fimDate } = intervaloMes(mes)
  return eachDayOfInterval({ start: inicioDate, end: fimDate }).filter((d) => diaUtil(d, sabadoUtil)).length
}

export function saudacao(agora: Date = new Date()): string {
  const h = agora.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function ehHoje(iso: string | null | undefined, agora: Date = new Date()): boolean {
  if (!iso) return false
  return isSameDay(parseISO(iso), agora)
}

export function ehPassado(iso: string | null | undefined, agora: Date = new Date()): boolean {
  if (!iso) return false
  return isBefore(parseISO(iso), agora)
}

export function ehAntesDeHoje(iso: string | null | undefined, agora: Date = new Date()): boolean {
  if (!iso) return false
  return isBefore(startOfDay(parseISO(iso)), startOfDay(agora))
}

export function diasDesde(iso: string | null | undefined, agora: Date = new Date()): number | null {
  if (!iso) return null
  return differenceInCalendarDays(agora, parseISO(iso))
}

export function estaNestaSemana(iso: string, agora: Date = new Date()): boolean {
  const { inicio, fim } = intervaloSemana(agora)
  const d = parseISO(iso)
  return !isBefore(d, inicio) && !isAfter(d, fim)
}

/** Atalhos de próxima ação. */
export function atalhoProximaAcao(tipo: 'hoje17' | 'amanha9' | 'em3dias' | 'em1hora', agora: Date = new Date()): Date {
  switch (tipo) {
    case 'hoje17':
      return set(agora, { hours: 17, minutes: 0, seconds: 0, milliseconds: 0 })
    case 'amanha9':
      return set(addDays(agora, 1), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 })
    case 'em3dias':
      return set(addDays(agora, 3), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 })
    case 'em1hora':
      return addHours(agora, 1)
  }
}

export function paraInputDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = parseISO(iso)
  return format(d, "yyyy-MM-dd'T'HH:mm")
}

export function deInputDateTime(valor: string): string {
  return isoLocal(parseISO(valor))
}

export function listaMeses(qtd = 12, agora: Date = new Date()): string[] {
  const meses: string[] = []
  for (let i = 0; i < qtd; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    meses.push(format(d, 'yyyy-MM'))
  }
  return meses
}
