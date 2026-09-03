import { useCallback, useEffect, useRef, useState } from 'react'

/** Leitura em voz pt-BR pela Web Speech API. Nunca automática. */
export function useVoz() {
  const [falando, setFalando] = useState(false)
  const suportado = typeof window !== 'undefined' && 'speechSynthesis' in window
  const atual = useRef<SpeechSynthesisUtterance | null>(null)

  const parar = useCallback(() => {
    if (!suportado) return
    window.speechSynthesis.cancel()
    setFalando(false)
  }, [suportado])

  const falar = useCallback(
    (texto: string) => {
      if (!suportado || !texto) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(texto)
      u.lang = 'pt-BR'
      u.rate = 1.02
      const vozes = window.speechSynthesis.getVoices()
      const voz = vozes.find((v) => v.lang === 'pt-BR' && /google|luciana|francisca|natural/i.test(v.name)) ?? vozes.find((v) => v.lang === 'pt-BR') ?? vozes.find((v) => v.lang.startsWith('pt'))
      if (voz) u.voice = voz
      u.onend = () => setFalando(false)
      u.onerror = () => setFalando(false)
      atual.current = u
      setFalando(true)
      window.speechSynthesis.speak(u)
    },
    [suportado],
  )

  useEffect(() => () => parar(), [parar])
  return { suportado, falando, falar, parar }
}
