import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Briefing } from '@/lib/tipos'

export function idBriefing(vendedorId: string, dia: string): string {
  return `${vendedorId}_${dia}`
}

export async function lerBriefing(vendedorId: string, dia: string): Promise<Briefing | null> {
  const snap = await getDoc(doc(db, 'briefings', idBriefing(vendedorId, dia)))
  return snap.exists() ? (snap.data() as Briefing) : null
}

export async function salvarBriefing(b: Briefing): Promise<void> {
  await setDoc(doc(db, 'briefings', idBriefing(b.vendedorId, b.data)), b)
}
