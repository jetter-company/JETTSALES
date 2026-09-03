import { initializeApp, getApps, getApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const firebaseConfigurado = Boolean(cfg.apiKey && cfg.projectId && cfg.appId)

export const app = getApps().length ? getApp() : initializeApp(cfg)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
})

// Emuladores locais (npm run emuladores) quando VITE_USE_EMULATORS=1.
if (import.meta.env.VITE_USE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export { serverTimestamp, Timestamp }

/** Converte Timestamps em ISO e adiciona o id. */
export function deDoc<T>(snap: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData | undefined }): T {
  const dados = snap.data() ?? {}
  const saida: Record<string, unknown> = { id: snap.id }
  for (const [k, v] of Object.entries(dados)) {
    saida[k] = v instanceof Timestamp ? v.toDate().toISOString() : v
  }
  return saida as T
}

/** Remove undefined e o campo id antes de gravar. */
export function paraDoc<T extends object>(obj: T): Record<string, unknown> {
  const saida: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'id' || v === undefined) continue
    saida[k] = v
  }
  return saida
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}
