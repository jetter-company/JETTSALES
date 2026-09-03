// Gera um único arquivo HTML (dist-demo/cockpit-pa-demo.html) com CSS e JS embutidos,
// a partir do build feito com `vite build --mode demo`. Usado para publicar a
// demonstração como página única (Artifact). Uso: node scripts/inline-unico.mjs
import fs from 'node:fs'
import path from 'node:path'

const dist = 'dist'
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')

const scripts = [...html.matchAll(/<script type="module"[^>]*src="\/?(assets\/[^"]+)"[^>]*><\/script>/g)].map((m) => m[1])
const estilos = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\/?(assets\/[^"]+)"[^>]*>/g)].map((m) => m[1])
const fontes = html.match(/<link[^>]*fonts\.googleapis[^>]*>/g)?.map((l) => l.replace(/\s+/g, ' ')).join('\n') ?? ''

const css = estilos.map((a) => fs.readFileSync(path.join(dist, a), 'utf8')).join('\n')
const js = scripts
  .map((a) => fs.readFileSync(path.join(dist, a), 'utf8'))
  .join('\n')
  .replace(/<\/script/gi, '<\\/script')

const saida = ['<title>Cockpit PA</title>', fontes, `<style>${css}</style>`, '<div id="root"></div>', `<script type="module">${js}</script>`].join('\n')
fs.mkdirSync('dist-demo', { recursive: true })
fs.writeFileSync('dist-demo/cockpit-pa-demo.html', saida)
console.log(`dist-demo/cockpit-pa-demo.html: ${(saida.length / 1024 / 1024).toFixed(2)} MB (${scripts.length} script, ${estilos.length} css)`)
