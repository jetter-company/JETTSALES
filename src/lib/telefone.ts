/** Só dígitos. */
export function somenteDigitos(telefone: string | null | undefined): string {
  return (telefone ?? '').replace(/\D/g, '')
}

/** Normaliza para E.164 brasileiro sem o sinal de mais: 55 + DDD + número. */
export function normalizarTelefone(telefone: string | null | undefined): string {
  let d = somenteDigitos(telefone)
  if (!d) return ''
  if (d.startsWith('0')) d = d.replace(/^0+/, '')
  if ((d.length === 10 || d.length === 11) && !d.startsWith('55')) d = `55${d}`
  if (d.length === 12 || d.length === 13) return d
  if (d.length > 13 && d.startsWith('55')) return d.slice(0, 13)
  return d
}

/** Exibe (45) 99999-9999 quando possível. */
export function formatarTelefone(telefone: string | null | undefined): string {
  const d = normalizarTelefone(telefone)
  if (!d) return telefone ?? ''
  const nacional = d.startsWith('55') ? d.slice(2) : d
  const ddd = nacional.slice(0, 2)
  const resto = nacional.slice(2)
  if (resto.length === 9) return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`
  if (resto.length === 8) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`
  return `+${d}`
}

export function linkTelefone(telefone: string): string {
  const d = normalizarTelefone(telefone)
  return `tel:+${d}`
}

export function linkWhatsApp(telefone: string, mensagem?: string): string {
  const d = normalizarTelefone(telefone)
  const base = `https://wa.me/${d}`
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base
}

export function mensagemPadraoWhatsApp(nomeLead: string, nomeVendedor: string, escritorio = 'Pedrini & Azevedo Advogados'): string {
  const primeiro = nomeLead.trim().split(/\s+/)[0] ?? ''
  const vend = nomeVendedor.trim().split(/\s+/)[0] ?? ''
  return `Olá, ${primeiro}! Aqui é ${vend}, do ${escritorio}. Podemos conversar sobre a liberação do seu veículo?`
}
