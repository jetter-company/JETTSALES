// CSV compatível com Google Planilhas: separador ponto e vírgula, UTF-8 com BOM,
// valores em formato brasileiro.

export type LinhaCsv = Record<string, string | number | boolean | null | undefined>

function escapar(valor: string | number | boolean | null | undefined): string {
  if (valor === null || valor === undefined) return ''
  const s = String(valor)
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function gerarCsv(colunas: { chave: string; titulo: string }[], linhas: LinhaCsv[]): string {
  const cabecalho = colunas.map((c) => escapar(c.titulo)).join(';')
  const corpo = linhas.map((l) => colunas.map((c) => escapar(l[c.chave])).join(';'))
  return `﻿${[cabecalho, ...corpo].join('\r\n')}`
}

export function baixarCsv(nomeArquivo: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Parser simples de CSV com detecção de separador (; , ou tab) e aspas. */
export function lerCsv(texto: string): { cabecalho: string[]; linhas: string[][] } {
  const limpo = texto.replace(/^﻿/, '')
  const primeiraLinha = limpo.split(/\r?\n/)[0] ?? ''
  const candidatos = [';', ',', '\t']
  const sep = candidatos
    .map((c) => ({ c, n: (primeiraLinha.match(new RegExp(c === '\t' ? '\t' : `\\${c}`, 'g')) ?? []).length }))
    .sort((a, b) => b.n - a.n)[0]?.c ?? ','

  const linhas: string[][] = []
  let atual: string[] = []
  let campo = ''
  let emAspas = false
  for (let i = 0; i < limpo.length; i++) {
    const ch = limpo[i]
    if (emAspas) {
      if (ch === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"'
          i++
        } else emAspas = false
      } else campo += ch
      continue
    }
    if (ch === '"') emAspas = true
    else if (ch === sep) {
      atual.push(campo)
      campo = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && limpo[i + 1] === '\n') i++
      atual.push(campo)
      campo = ''
      if (atual.some((c) => c.trim() !== '')) linhas.push(atual)
      atual = []
    } else campo += ch
  }
  if (campo !== '' || atual.length) {
    atual.push(campo)
    if (atual.some((c) => c.trim() !== '')) linhas.push(atual)
  }
  const cabecalho = (linhas.shift() ?? []).map((c) => c.trim())
  return { cabecalho, linhas }
}

/** Sugere a coluna de origem para um campo pelo nome do cabeçalho. */
export function sugerirColuna(cabecalho: string[], campo: 'nome' | 'telefone' | 'email' | 'origem'): number {
  const padroes: Record<typeof campo, RegExp> = {
    nome: /nome|name|full/i,
    telefone: /tel|phone|celular|whats|fone/i,
    email: /e-?mail/i,
    origem: /origem|campanha|campaign|source|ad_?name|form/i,
  }
  const idx = cabecalho.findIndex((h) => padroes[campo].test(h))
  return idx
}
