/* eslint-disable @typescript-eslint/no-explicit-any */
// Simulação do Firebase Authentication para a versão de demonstração.

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}
interface Conta extends User {
  senha: string
}
interface Estado {
  contas: Record<string, Conta>
  atual: string | null
}

const CHAVE = 'cockpit-pa-demo-auth'
function ler(): Estado {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) return JSON.parse(bruto) as Estado
  } catch {
    /* ignora */
  }
  return { contas: {}, atual: null }
}
const estado = ler()
function salvar(): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado))
  } catch {
    /* ignora */
  }
}
const ouvintes = new Set<(u: User | null) => void>()
function usuarioAtual(): User | null {
  const c = estado.atual ? estado.contas[estado.atual] : undefined
  if (!c) return null
  const { senha: _s, ...u } = c
  void _s
  return u
}
function notificar(): void {
  const u = usuarioAtual()
  for (const f of Array.from(ouvintes)) f(u)
}
function erro(code: string): Error {
  const e: any = new Error(code)
  e.code = code
  return e
}
function uidDe(email: string): string {
  let h = 0
  for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `demo-${h.toString(36)}`
}

export class GoogleAuthProvider {
  setCustomParameters(): void {}
}
export function getAuth(): any {
  return {
    get currentUser() {
      return usuarioAtual()
    },
  }
}
export function connectAuthEmulator(): void {}
export function onAuthStateChanged(_auth: any, cb: (u: User | null) => void): () => void {
  ouvintes.add(cb)
  queueMicrotask(() => cb(usuarioAtual()))
  return () => ouvintes.delete(cb)
}
export async function createUserWithEmailAndPassword(_auth: any, email: string, senha: string): Promise<{ user: User }> {
  const e = email.trim().toLowerCase()
  if (!e.includes('@')) throw erro('auth/invalid-email')
  if (senha.length < 6) throw erro('auth/weak-password')
  if (estado.contas[e]) throw erro('auth/email-already-in-use')
  estado.contas[e] = { uid: uidDe(e), email: e, displayName: null, photoURL: null, senha }
  estado.atual = e
  salvar()
  notificar()
  return { user: usuarioAtual()! }
}
export async function signInWithEmailAndPassword(_auth: any, email: string, senha: string): Promise<{ user: User }> {
  const e = email.trim().toLowerCase()
  const c = estado.contas[e]
  if (!c || c.senha !== senha) throw erro('auth/invalid-credential')
  estado.atual = e
  salvar()
  notificar()
  return { user: usuarioAtual()! }
}
export async function signInWithPopup(): Promise<{ user: User }> {
  const e = 'conta.google@demo.cockpit'
  if (!estado.contas[e]) estado.contas[e] = { uid: uidDe(e), email: e, displayName: 'Conta Google (demonstração)', photoURL: null, senha: '' }
  estado.atual = e
  salvar()
  notificar()
  return { user: usuarioAtual()! }
}
export async function sendPasswordResetEmail(): Promise<void> {}
export async function signOut(): Promise<void> {
  estado.atual = null
  salvar()
  notificar()
}
export async function updateProfile(user: User, dados: { displayName?: string; photoURL?: string }): Promise<void> {
  const c = user.email ? estado.contas[user.email] : undefined
  if (!c) return
  if (dados.displayName !== undefined) c.displayName = dados.displayName
  if (dados.photoURL !== undefined) c.photoURL = dados.photoURL
  salvar()
  notificar()
}
