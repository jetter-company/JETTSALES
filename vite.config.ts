import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// A chave do Gemini pode vir de VITE_GEMINI_API_KEY (Vite) ou de GEMINI_API_KEY /
// API_KEY (padrão do Google AI Studio, que injeta process.env.* no build).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geminiKey = env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? env.API_KEY ?? ''
  // `vite build --mode demo`: versão de demonstração sem Firebase, com dados no navegador,
  // em arquivo único (scripts/inline-unico.mjs).
  const demo = mode === 'demo'
  const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))
  const alias: Record<string, string> = demo
    ? {
        '@': src('./src'),
        'firebase/app': src('./src/lib/mock/app.ts'),
        'firebase/auth': src('./src/lib/mock/auth.ts'),
        'firebase/firestore': src('./src/lib/mock/firestore.ts'),
      }
    : { '@': src('./src') }
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_DEMO': JSON.stringify(demo ? '1' : ''),
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      modulePreload: !demo,
      assetsInlineLimit: demo ? 1e9 : 4096,
      rollupOptions: {
        output: demo
          ? { inlineDynamicImports: true }
          : {
              manualChunks: {
                firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
                charts: ['recharts'],
                motion: ['framer-motion'],
              },
            },
      },
    },
  }
})
