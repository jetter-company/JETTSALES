import type { Transition, Variants } from 'framer-motion'

export const EASE = [0.22, 1, 0.36, 1] as const

export const mola: Transition = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }
export const molaSuave: Transition = { type: 'spring', stiffness: 220, damping: 28, mass: 1 }
export const molaRapida: Transition = { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }

export const suave: Transition = { duration: 0.42, ease: EASE }
export const curta: Transition = { duration: 0.22, ease: EASE }

/** Sequência orquestrada: o contêiner escalona os filhos com 60 a 90 ms. */
export const cascata = (atraso = 0, intervalo = 0.075): Variants => ({
  oculto: {},
  visivel: { transition: { staggerChildren: intervalo, delayChildren: atraso } },
})

export const itemCascata: Variants = {
  oculto: { opacity: 0, y: 14 },
  visivel: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export const surgir: Variants = {
  oculto: { opacity: 0, y: 8 },
  visivel: { opacity: 1, y: 0, transition: suave },
}

export const escala: Variants = {
  oculto: { opacity: 0, scale: 0.96 },
  visivel: { opacity: 1, scale: 1, transition: mola },
  sair: { opacity: 0, scale: 0.98, transition: curta },
}
