/* eslint-disable @typescript-eslint/no-explicit-any */
// Simulação do Firestore para a versão de demonstração (build --mode demo).
// Implementa o subconjunto da API modular usado pelo app, com persistência no
// navegador. Não é usado na versão real: lá o alias não é aplicado.

type Dados = Record<string, any>

export class Timestamp {
  constructor(
    public seconds: number,
    public nanoseconds: number,
  ) {}
  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now())
  }
  static fromDate(d: Date): Timestamp {
    return Timestamp.fromMillis(d.getTime())
  }
  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6)
  }
  toDate(): Date {
    return new Date(this.toMillis())
  }
  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6)
  }
}

const MARCA_SERVER = '__serverTimestamp__'
export function serverTimestamp(): any {
  return { [MARCA_SERVER]: true }
}

const CHAVE = 'cockpit-pa-demo-db'
type Loja = Map<string, Map<string, Dados>>
const loja: Loja = carregar()
const ouvintes = new Set<() => void>()
let notificacaoAgendada = false

function serializar(v: any): any {
  if (v instanceof Timestamp) return { __ts: v.toMillis() }
  if (Array.isArray(v)) return v.map(serializar)
  if (v && typeof v === 'object') {
    const o: Dados = {}
    for (const [k, x] of Object.entries(v)) o[k] = serializar(x)
    return o
  }
  return v
}
function desserializar(v: any): any {
  if (Array.isArray(v)) return v.map(desserializar)
  if (v && typeof v === 'object') {
    if (typeof v.__ts === 'number' && Object.keys(v).length === 1) return Timestamp.fromMillis(v.__ts)
    const o: Dados = {}
    for (const [k, x] of Object.entries(v)) o[k] = desserializar(x)
    return o
  }
  return v
}
function carregar(): Loja {
  const m: Loja = new Map()
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return m
    const obj = JSON.parse(bruto) as Record<string, Record<string, Dados>>
    for (const [col, docs] of Object.entries(obj)) {
      const mm = new Map<string, Dados>()
      for (const [id, d] of Object.entries(docs)) mm.set(id, desserializar(d))
      m.set(col, mm)
    }
  } catch {
    /* sem persistência */
  }
  return m
}
function salvar(): void {
  try {
    const obj: Record<string, Record<string, Dados>> = {}
    for (const [col, docs] of loja) {
      obj[col] = {}
      for (const [id, d] of docs) obj[col][id] = serializar(d)
    }
    localStorage.setItem(CHAVE, JSON.stringify(obj))
  } catch {
    /* ignora */
  }
}
function notificar(): void {
  salvar()
  if (notificacaoAgendada) return
  notificacaoAgendada = true
  queueMicrotask(() => {
    notificacaoAgendada = false
    for (const f of Array.from(ouvintes)) f()
  })
}

function clonar<T>(v: T): T {
  if (v instanceof Timestamp) return v
  if (v instanceof Date) return new Date(v.getTime()) as any
  if (Array.isArray(v)) return v.map(clonar) as any
  if (v && typeof v === 'object') {
    const o: Dados = {}
    for (const [k, x] of Object.entries(v as Dados)) o[k] = clonar(x)
    return o as T
  }
  return v
}
function resolverSentinelas(v: any): any {
  if (v instanceof Date) return Timestamp.fromDate(v)
  if (v && typeof v === 'object' && v[MARCA_SERVER]) return Timestamp.now()
  if (Array.isArray(v)) return v.map(resolverSentinelas)
  if (v && typeof v === 'object' && !(v instanceof Timestamp)) {
    const o: Dados = {}
    for (const [k, x] of Object.entries(v)) o[k] = resolverSentinelas(x)
    return o
  }
  return v
}
function ehMapa(v: any): boolean {
  return v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Timestamp)
}
function mesclar(alvo: Dados, origem: Dados): Dados {
  const saida = { ...alvo }
  for (const [k, v] of Object.entries(origem)) {
    saida[k] = ehMapa(v) && ehMapa(saida[k]) ? mesclar(saida[k], v) : v
  }
  return saida
}
function lerCampo(d: Dados, caminho: string): any {
  return caminho.split('.').reduce((a: any, p) => (a == null ? undefined : a[p]), d)
}
function normalizar(v: any): any {
  return v instanceof Timestamp ? v.toMillis() : v
}
function comparar(a: any, b: any): number {
  const x = normalizar(a)
  const y = normalizar(b)
  if (x === y) return 0
  if (x === undefined) return 1
  if (y === undefined) return -1
  if (typeof x === 'string' && typeof y === 'string') return x < y ? -1 : 1
  return x < y ? -1 : 1
}

let contadorId = 0
function novoId(): string {
  contadorId++
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${contadorId.toString(36)}`
}

export class CollectionReference {
  readonly type = 'collection'
  constructor(public path: string) {}
  get id(): string {
    return this.path.split('/').pop() ?? ''
  }
}
export class DocumentReference {
  readonly type = 'document'
  constructor(
    public path: string,
    public id: string,
  ) {}
  get colecao(): string {
    return this.path.slice(0, this.path.lastIndexOf('/'))
  }
}
interface Restricao {
  tipo: 'where' | 'orderBy' | 'limit'
  campo?: string
  op?: string
  valor?: any
  direcao?: 'asc' | 'desc'
  n?: number
}
export class Query {
  constructor(
    public colecao: string,
    public restricoes: Restricao[] = [],
  ) {}
}
export type DocumentData = Dados
export type QueryDocumentSnapshot<T = Dados> = DocumentSnapshot<T>
export class DocumentSnapshot<T = Dados> {
  constructor(
    public ref: DocumentReference,
    private dados: T | undefined,
  ) {}
  get id(): string {
    return this.ref.id
  }
  exists(): boolean {
    return this.dados !== undefined
  }
  data(): T | undefined {
    return this.dados === undefined ? undefined : clonar(this.dados)
  }
}
export class QuerySnapshot {
  constructor(public docs: DocumentSnapshot[]) {}
  get empty(): boolean {
    return this.docs.length === 0
  }
  get size(): number {
    return this.docs.length
  }
  forEach(f: (d: DocumentSnapshot) => void): void {
    this.docs.forEach(f)
  }
}

function caminho(base: any, segs: string[]): string {
  const prefixo = base && typeof base === 'object' && typeof base.path === 'string' ? base.path : ''
  return [prefixo, ...segs].filter(Boolean).join('/')
}

export function initializeFirestore(): any {
  return { tipo: 'demo' }
}
export function getFirestore(): any {
  return { tipo: 'demo' }
}
export function persistentLocalCache(): any {
  return {}
}
export function persistentMultipleTabManager(): any {
  return {}
}
export function connectFirestoreEmulator(): void {}

export function collection(base: any, ...segs: string[]): CollectionReference {
  return new CollectionReference(caminho(base, segs))
}
export function doc(base: any, ...segs: string[]): DocumentReference {
  if (base instanceof CollectionReference && segs.length === 0) {
    const id = novoId()
    return new DocumentReference(`${base.path}/${id}`, id)
  }
  const p = caminho(base, segs)
  return new DocumentReference(p, p.split('/').pop() ?? '')
}
export function query(base: CollectionReference | Query, ...restricoes: Restricao[]): Query {
  const col = base instanceof Query ? base.colecao : base.path
  const anteriores = base instanceof Query ? base.restricoes : []
  return new Query(col, [...anteriores, ...restricoes])
}
export function where(campo: string, op: string, valor: any): Restricao {
  return { tipo: 'where', campo, op, valor }
}
export function orderBy(campo: string, direcao: 'asc' | 'desc' = 'asc'): Restricao {
  return { tipo: 'orderBy', campo, direcao }
}
export function limit(n: number): Restricao {
  return { tipo: 'limit', n }
}

function colecaoDe(path: string): Map<string, Dados> {
  let m = loja.get(path)
  if (!m) {
    m = new Map()
    loja.set(path, m)
  }
  return m
}

function executar(q: Query | CollectionReference): DocumentSnapshot[] {
  const col = q instanceof Query ? q.colecao : q.path
  const restricoes = q instanceof Query ? q.restricoes : []
  let itens = Array.from(colecaoDe(col).entries()).map(([id, d]) => ({ id, d }))
  for (const r of restricoes) {
    if (r.tipo !== 'where') continue
    itens = itens.filter(({ d }) => {
      const v = lerCampo(d, r.campo!)
      const alvo = r.valor
      switch (r.op) {
        case '==':
          return normalizar(v) === normalizar(alvo)
        case '!=':
          return v !== undefined && normalizar(v) !== normalizar(alvo)
        case '<':
          return v !== undefined && comparar(v, alvo) < 0
        case '<=':
          return v !== undefined && comparar(v, alvo) <= 0
        case '>':
          return v !== undefined && comparar(v, alvo) > 0
        case '>=':
          return v !== undefined && comparar(v, alvo) >= 0
        case 'in':
          return Array.isArray(alvo) && alvo.some((x) => normalizar(x) === normalizar(v))
        case 'array-contains':
          return Array.isArray(v) && v.includes(alvo)
        default:
          return true
      }
    })
  }
  const ordens = restricoes.filter((r) => r.tipo === 'orderBy')
  if (ordens.length) {
    itens = itens.filter(({ d }) => ordens.every((o) => lerCampo(d, o.campo!) !== undefined))
    itens.sort((a, b) => {
      for (const o of ordens) {
        const c = comparar(lerCampo(a.d, o.campo!), lerCampo(b.d, o.campo!))
        if (c !== 0) return o.direcao === 'desc' ? -c : c
      }
      return 0
    })
  }
  const lim = restricoes.find((r) => r.tipo === 'limit')
  if (lim?.n) itens = itens.slice(0, lim.n)
  return itens.map(({ id, d }) => new DocumentSnapshot(new DocumentReference(`${col}/${id}`, id), clonar(d)))
}

export async function getDocs(q: Query | CollectionReference): Promise<QuerySnapshot> {
  return new QuerySnapshot(executar(q))
}
export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  const d = colecaoDe(ref.colecao).get(ref.id)
  return new DocumentSnapshot(ref, d === undefined ? undefined : clonar(d))
}
function gravarSet(ref: DocumentReference, dados: Dados, opcoes?: { merge?: boolean }): void {
  const col = colecaoDe(ref.colecao)
  const novo = resolverSentinelas(clonar(dados))
  const atual = col.get(ref.id)
  col.set(ref.id, opcoes?.merge && atual ? mesclar(atual, novo) : novo)
}
function gravarUpdate(ref: DocumentReference, dados: Dados): void {
  const col = colecaoDe(ref.colecao)
  const atual = col.get(ref.id)
  if (!atual) {
    const e: any = new Error('No document to update')
    e.code = 'not-found'
    throw e
  }
  const novo = resolverSentinelas(clonar(dados))
  const saida = { ...atual }
  for (const [k, v] of Object.entries(novo)) {
    if (k.includes('.')) {
      const partes = k.split('.')
      let alvo: Dados = saida
      for (let i = 0; i < partes.length - 1; i++) {
        alvo[partes[i]!] = ehMapa(alvo[partes[i]!]) ? { ...alvo[partes[i]!] } : {}
        alvo = alvo[partes[i]!]
      }
      alvo[partes[partes.length - 1]!] = v
    } else saida[k] = v
  }
  col.set(ref.id, saida)
}
export async function setDoc(ref: DocumentReference, dados: Dados, opcoes?: { merge?: boolean }): Promise<void> {
  gravarSet(ref, dados, opcoes)
  notificar()
}
export async function updateDoc(ref: DocumentReference, dados: Dados): Promise<void> {
  gravarUpdate(ref, dados)
  notificar()
}
export async function addDoc(col: CollectionReference, dados: Dados): Promise<DocumentReference> {
  const ref = doc(col)
  gravarSet(ref, dados)
  notificar()
  return ref
}
export async function deleteDoc(ref: DocumentReference): Promise<void> {
  colecaoDe(ref.colecao).delete(ref.id)
  // Subcoleções do documento também são removidas.
  for (const chave of Array.from(loja.keys())) if (chave.startsWith(`${ref.path}/`)) loja.delete(chave)
  notificar()
}
export function onSnapshot(alvo: Query | CollectionReference | DocumentReference, proximo: (s: any) => void, erro?: (e: any) => void): () => void {
  const emitir = () => {
    try {
      if (alvo instanceof DocumentReference) {
        const d = colecaoDe(alvo.colecao).get(alvo.id)
        proximo(new DocumentSnapshot(alvo, d === undefined ? undefined : clonar(d)))
      } else proximo(new QuerySnapshot(executar(alvo)))
    } catch (e) {
      erro?.(e)
    }
  }
  ouvintes.add(emitir)
  queueMicrotask(emitir)
  return () => ouvintes.delete(emitir)
}
export function writeBatch(): any {
  const ops: Array<() => void> = []
  return {
    set(ref: DocumentReference, dados: Dados, opcoes?: { merge?: boolean }) {
      ops.push(() => gravarSet(ref, dados, opcoes))
      return this
    },
    update(ref: DocumentReference, dados: Dados) {
      ops.push(() => gravarUpdate(ref, dados))
      return this
    },
    delete(ref: DocumentReference) {
      ops.push(() => {
        colecaoDe(ref.colecao).delete(ref.id)
        for (const chave of Array.from(loja.keys())) if (chave.startsWith(`${ref.path}/`)) loja.delete(chave)
      })
      return this
    },
    async commit() {
      for (const op of ops) op()
      notificar()
    },
  }
}
