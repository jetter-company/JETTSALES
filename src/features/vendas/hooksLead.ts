import { collection, limit, orderBy, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useConsulta } from '@/lib/consultas'
import type { Venda } from '@/lib/tipos'

/** Vendas de um lead. O filtro por vendedorId é exigido pelas regras para consultas de lista. */
export function useVendasDoLead(leadId: string | null, vendedorId: string | null) {
  return useConsulta<Venda>(
    () => (leadId && vendedorId ? query(collection(db, 'vendas'), where('vendedorId', '==', vendedorId), where('leadId', '==', leadId), orderBy('dataFechamento', 'desc'), limit(5)) : null),
    `${leadId ?? ''}:${vendedorId ?? ''}`,
  )
}
