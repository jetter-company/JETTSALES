import { useCallback, useEffect, useRef, useState } from 'react'
import { getDocs, onSnapshot, type Query, type DocumentData } from 'firebase/firestore'
import { deDoc } from './firebase'

export interface ResultadoConsulta<T> {
  dados: T[]
  carregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
}

/** Consulta sob demanda (getDocs). `chave` deve mudar quando a consulta mudar. */
export function useConsulta<T>(construir: () => Query<DocumentData> | null, chave: string): ResultadoConsulta<T> {
  const [dados, setDados] = useState<T[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const construirRef = useRef(construir)
  construirRef.current = construir

  const recarregar = useCallback(async () => {
    const q = construirRef.current()
    if (!q) {
      setDados([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    try {
      const snap = await getDocs(q)
      setDados(snap.docs.map((d) => deDoc<T>(d)))
      setErro(null)
    } catch (e) {
      if ((e as { code?: string })?.code !== 'permission-denied') console.error('Consulta falhou', e)
      setErro(mensagemErroFirestore(e))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, recarregar])

  return { dados, carregando, erro, recarregar }
}

/** Consulta em tempo real (onSnapshot). Só usar onde faz diferença. */
export function useTempoReal<T>(construir: () => Query<DocumentData> | null, chave: string): Omit<ResultadoConsulta<T>, 'recarregar'> {
  const [dados, setDados] = useState<T[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const construirRef = useRef(construir)
  construirRef.current = construir

  useEffect(() => {
    const q = construirRef.current()
    if (!q) {
      setDados([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    const parar = onSnapshot(
      q,
      (snap) => {
        setDados(snap.docs.map((d) => deDoc<T>(d)))
        setErro(null)
        setCarregando(false)
      },
      (e) => {
        if ((e as { code?: string })?.code !== 'permission-denied') console.error('Escuta falhou', e)
        setErro(mensagemErroFirestore(e))
        setCarregando(false)
      },
    )
    return parar
  }, [chave])

  return { dados, carregando, erro }
}

export function mensagemErroFirestore(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? ''
  if (codigo === 'permission-denied') return 'Sem permissão para acessar estes dados.'
  if (codigo === 'unavailable') return 'Sem conexão com o servidor. Mostrando dados locais, se houver.'
  if (codigo === 'failed-precondition') return 'Índice do Firestore ausente. Publique firestore.indexes.json.'
  return 'Não foi possível carregar os dados.'
}
