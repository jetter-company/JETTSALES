import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import type { Meta } from '@/lib/tipos'

export function idMeta(vendedorId: string, mes: string): string {
  return `${vendedorId}_${mes}`
}

/** Meta do mês: doc metas/{vendedorId_AAAA-MM}; sem doc, usa a meta padrão do usuário. */
export function useMeta(vendedorId: string | null, mes: string, padrao: number) {
  const [meta, setMeta] = useState<number>(padrao)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    if (!vendedorId) return
    setCarregando(true)
    return onSnapshot(
      doc(db, 'metas', idMeta(vendedorId, mes)),
      (snap) => {
        const d = snap.data() as Partial<Meta> | undefined
        setMeta(typeof d?.metaRecebido === 'number' ? d.metaRecebido : padrao)
        setCarregando(false)
      },
      () => setCarregando(false),
    )
  }, [vendedorId, mes, padrao])
  return { meta, carregando }
}

export async function lerMeta(vendedorId: string, mes: string, padrao: number): Promise<number> {
  const snap = await getDoc(doc(db, 'metas', idMeta(vendedorId, mes)))
  const d = snap.data() as Partial<Meta> | undefined
  return typeof d?.metaRecebido === 'number' ? d.metaRecebido : padrao
}

export async function salvarMeta(vendedorId: string, mes: string, metaRecebido: number): Promise<void> {
  await setDoc(doc(db, 'metas', idMeta(vendedorId, mes)), { vendedorId, mes, metaRecebido }, { merge: true })
}

export interface ResumoVendedor {
  nome: string
  recebido: number
  vendido: number
  contratos: number
  atualizadoEm: string
}

export type ResumoMes = Record<string, ResumoVendedor>

/**
 * Resumo mensal do time para o ranking: cada vendedor publica apenas o próprio campo
 * (regra do Firestore), e todos leem o documento.
 */
export async function publicarResumo(mes: string, vendedorId: string, r: Omit<ResumoVendedor, 'atualizadoEm'>): Promise<void> {
  await setDoc(doc(db, 'resumos', mes), { [vendedorId]: { ...r, atualizadoEm: new Date().toISOString() } }, { merge: true }).catch(() => undefined)
}

export function useResumoMes(mes: string) {
  const [resumo, setResumo] = useState<ResumoMes>({})
  useEffect(() => {
    return onSnapshot(doc(db, 'resumos', mes), (snap) => setResumo((snap.data() as ResumoMes | undefined) ?? {}), () => setResumo({}))
  }, [mes])
  return resumo
}
