import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// A chave do Gemini pode vir de VITE_GEMINI_API_KEY (Vite) ou de GEMINI_API_KEY /
// API_KEY (padrão do Google AI Studio, que injeta process.env.* no build).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geminiKey = env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? env.API_KEY ?? ''
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.API_KEY': JSON.stringify(geminiKey),
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
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
