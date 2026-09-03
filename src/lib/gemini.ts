import { GoogleGenAI } from '@google/genai'

// A chave é injetada pela plataforma (AI Studio: process.env.GEMINI_API_KEY) ou
// por VITE_GEMINI_API_KEY. Nunca é gravada no Firestore nem exibida.
function chave(): string {
  const viteKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? ''
  const envKey = typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY ?? process.env.API_KEY ?? '') : ''
  return viteKey || envKey || ''
}

export const MODELO_GEMINI = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash'

export function geminiDisponivel(): boolean {
  return chave().length > 0
}

let cliente: GoogleGenAI | null = null
function obterCliente(): GoogleGenAI {
  if (!cliente) cliente = new GoogleGenAI({ apiKey: chave() })
  return cliente
}

export interface MensagemChat {
  papel: 'usuario' | 'assistente'
  texto: string
}

/**
 * Gera texto com streaming. Chama onTrecho a cada pedaço e resolve com o texto completo.
 */
export async function gerarComStreaming(
  instrucaoSistema: string,
  historico: MensagemChat[],
  onTrecho: (acumulado: string) => void,
  sinal?: AbortSignal,
): Promise<string> {
  const ai = obterCliente()
  const contents = historico.map((m) => ({
    role: m.papel === 'usuario' ? 'user' : 'model',
    parts: [{ text: m.texto }],
  }))
  const stream = await ai.models.generateContentStream({
    model: MODELO_GEMINI,
    contents,
    config: {
      systemInstruction: instrucaoSistema,
      temperature: 0.4,
      maxOutputTokens: 900,
      abortSignal: sinal,
    },
  })
  let acumulado = ''
  for await (const chunk of stream) {
    if (sinal?.aborted) break
    const t = chunk.text
    if (t) {
      acumulado += t
      onTrecho(acumulado)
    }
  }
  return acumulado.trim()
}
