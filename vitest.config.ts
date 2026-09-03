import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Os testes de datas assumem o fuso do escritório.
process.env.TZ = 'America/Sao_Paulo'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
