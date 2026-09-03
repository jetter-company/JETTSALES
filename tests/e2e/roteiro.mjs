// Roteiro de ponta a ponta nos emuladores do Firebase.
// Pré-requisitos: `npm run emuladores` e `npm run dev:emuladores` (porta 5173) rodando,
// com VITE_FIREBASE_PROJECT_ID=cockpit-pa. Uso: node tests/e2e/roteiro.mjs [pasta-de-capturas]
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const raizGlobal = execSync('npm root -g').toString().trim()
const { chromium } = require(`${raizGlobal}/playwright`)

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const CAPTURAS = process.argv[2] ?? 'capturas-e2e'
fs.mkdirSync(CAPTURAS, { recursive: true })

const errosConsole = []
let passo = 0
function log(msg) {
  passo++
  console.log(`${String(passo).padStart(2, '0')}. ${msg}`)
}
function verificar(cond, msg) {
  if (!cond) throw new Error(`FALHOU: ${msg}`)
  log(`ok: ${msg}`)
}
function observar(page, rotulo) {
  page.on('console', (m) => {
    if (m.type() === 'error') errosConsole.push(`[${rotulo}] ${m.text()}`)
  })
  page.on('pageerror', (e) => errosConsole.push(`[${rotulo}] pageerror: ${e.message}`))
}
async function captura(page, nome) {
  await page.screenshot({ path: `${CAPTURAS}/${nome}.png`, fullPage: true })
}

async function criarConta(page, nome, email, senha) {
  await page.goto(`${BASE}/entrar`)
  await page.getByRole('button', { name: /Primeiro acesso/ }).click()
  await page.getByLabel('Nome').fill(nome)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Criar conta' }).click()
}

async function entrar(page, email, senha) {
  await page.goto(`${BASE}/entrar`)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
}

// Limpa os emuladores para o roteiro ser repetível.
const PROJETO = process.env.FIREBASE_PROJECT ?? 'cockpit-pa'
await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' }).catch(() => undefined)
await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, { method: 'DELETE' }).catch(() => undefined)

const browser = await chromium.launch()
try {
  // ------------------------------------------------------------ Admin (bootstrap)
  const ctxAdmin = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const admin = await ctxAdmin.newPage()
  observar(admin, 'admin')
  await criarConta(admin, 'Administrador Sócio', 'admin@pa.test', 'senha123456')
  await admin.waitForURL(`${BASE}/`, { timeout: 30000 })
  await admin.getByRole('heading', { level: 1 }).waitFor()
  const saud = await admin.getByRole('heading', { level: 1 }).innerText()
  verificar(/Administrador\./.test(saud), `saudação pelo primeiro nome ("${saud.trim()}")`)
  await admin.getByText('Briefing do dia').waitFor()
  await admin.waitForFunction(() => !document.querySelector('[aria-busy]'), null, { timeout: 30000 })
  await captura(admin, '01-admin-home')

  await admin.goto(`${BASE}/admin/equipe`)
  await admin.getByRole('button', { name: 'Convidar' }).click()
  await admin.getByLabel('Nome').fill('Paulo Vendedor')
  await admin.getByLabel('E-mail').fill('paulo@pa.test')
  await admin.getByRole('button', { name: 'Salvar convite' }).click()
  await admin.getByText('Convite salvo').last().waitFor()
  await admin.getByRole('dialog').waitFor({ state: 'hidden' })
  await admin.getByRole('button', { name: 'Convidar' }).click()
  await admin.getByLabel('Nome').fill('Ana Vendedora')
  await admin.getByLabel('E-mail').fill('ana@pa.test')
  await admin.getByRole('button', { name: 'Salvar convite' }).click()
  await admin.getByText('Convite salvo').last().waitFor()
  await admin.getByRole('dialog').waitFor({ state: 'hidden' })
  await admin.getByRole('button', { name: 'Convidar' }).click()
  await admin.getByLabel('Nome').fill('Carla Coordenadora')
  await admin.getByLabel('E-mail').fill('carla@pa.test')
  await admin.getByLabel('Papel').selectOption('gestor')
  await admin.getByRole('button', { name: 'Salvar convite' }).click()
  await admin.getByText('Convite salvo').last().waitFor()
  await admin.getByRole('dialog').waitFor({ state: 'hidden' })
  verificar((await admin.getByText('Convites pendentes').count()) === 1, 'convites pendentes listados')
  await captura(admin, '02-admin-equipe')

  // ------------------------------------------------------------ Vendedor 1
  const ctxPaulo = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const paulo = await ctxPaulo.newPage()
  observar(paulo, 'paulo')
  await criarConta(paulo, 'Paulo Vendedor', 'paulo@pa.test', 'senha123456')
  await paulo.waitForURL(`${BASE}/`, { timeout: 30000 })
  verificar(/Paulo\./.test(await paulo.getByRole('heading', { level: 1 }).innerText()), 'vendedor convidado entrou pela Home')

  await paulo.goto(`${BASE}/leads`)
  await paulo.getByText('Cadastre seu primeiro lead').waitFor()
  log('estado vazio orienta a cadastrar o primeiro lead')
  await paulo.goto(`${BASE}/leads/novo`)
  await paulo.getByLabel('Nome').fill('Transportes Iguaçu')
  await paulo.getByLabel('Telefone').fill('(45) 99999-1234')
  await paulo.getByRole('radio', { name: 'Pessoa jurídica' }).click()
  await paulo.getByLabel('Empresa').fill('Transportes Iguaçu Ltda')
  await paulo.getByLabel('Tipo de veículo').selectOption('frota')
  await paulo.getByLabel('Valor estimado (R$)').fill('30.000,00')
  await paulo.getByRole('button', { name: 'Salvar lead' }).click()
  await paulo.waitForURL(/\/leads\/(?!novo)[^/]+$/, { timeout: 20000 })
  const urlLead = paulo.url()
  const idLead = urlLead.split('/').pop()
  await paulo.getByRole('heading', { level: 1 }).getByText('Transportes Iguaçu').waitFor()
  verificar((await paulo.getByText('PJ', { exact: true }).count()) >= 1, 'lead PJ recebe etiqueta de prioridade')

  // duplicado
  await paulo.goto(`${BASE}/leads/novo`)
  await paulo.getByLabel('Nome').fill('Duplicado')
  await paulo.getByLabel('Telefone').fill('45999991234')
  await paulo.getByText('Telefone já cadastrado').waitFor({ timeout: 10000 })
  log('alerta de telefone duplicado')

  // interação em dois toques
  await paulo.goto(urlLead)
  await paulo.getByRole('button', { name: 'Registrar ligação' }).first().click()
  await paulo.getByRole('radio', { name: 'Atendeu', exact: true }).click()
  await paulo.getByRole('button', { name: 'Amanhã 9h' }).click()
  await paulo.getByRole('dialog').getByRole('button', { name: 'Registrar ligação' }).click()
  await paulo.getByText('Ligação registrada').waitFor()
  await paulo.getByText('Linha do tempo').waitFor()
  await paulo.locator('ol li').first().waitFor()
  verificar((await paulo.getByText('Contato feito').count()) >= 1 || (await paulo.locator('select[aria-label="Etapa"]').inputValue()) === 'contato_feito', 'lead avança para Contato feito após a ligação')
  verificar((await paulo.getByText('Próxima ação').count()) >= 1 && (await paulo.locator('text=/Sem próxima ação/').count()) === 0, 'próxima ação definida pelo atalho')
  await captura(paulo, '03-paulo-lead')

  // kanban em tempo real: outro contexto do mesmo usuário vê o lead
  const paulo2 = await ctxPaulo.newPage()
  observar(paulo2, 'paulo2')
  await paulo2.goto(`${BASE}/leads`)
  await paulo2.getByText('Transportes Iguaçu').first().waitFor({ timeout: 20000 })
  log('lead aparece no kanban')

  // ganho -> venda -> ficha de repasse
  await paulo.getByRole('button', { name: 'Ganho', exact: true }).click()
  await paulo.waitForURL(/\/vendas\/nova\?leadId=/, { timeout: 20000 })
  await paulo.getByLabel('Cliente').waitFor()
  await paulo.waitForFunction(() => document.querySelector('input[required][inputmode="decimal"]')?.value !== '', null, { timeout: 10000 }).catch(() => undefined)
  await paulo.getByLabel('Valor total (R$)').fill('30.000,00')
  await paulo.getByLabel('Entrada (R$)').fill('3.000,00')
  await paulo.getByLabel('Número de parcelas').fill('3')
  verificar((await paulo.getByText('Parcela 3').count()) === 1, 'cronograma de parcelas gerado na prévia')
  await paulo.getByRole('button', { name: 'Salvar venda e gerar parcelas' }).click()
  await paulo.waitForURL(/\/leads\/[^/?]+/, { timeout: 20000 })
  await paulo.getByRole('dialog').getByRole('heading', { name: 'Ficha de repasse para o jurídico' }).waitFor({ timeout: 15000 })
  await paulo.getByRole('dialog').getByLabel('Foto do CRLV').check()
  verificar((await paulo.getByRole('dialog').locator('pre').innerText()).includes('[x] Foto do CRLV'), 'ficha de repasse reflete o checklist')
  await captura(paulo, '04-paulo-repasse')
  await paulo.getByRole('button', { name: 'Fechar' }).click()

  // kanban em tempo real: lead em Ganho no outro contexto
  await paulo2.locator('[data-coluna="ganho"]').getByText('Transportes Iguaçu').first().waitFor({ timeout: 20000 })
  log('kanban atualizou em tempo real para a coluna Ganho')
  await captura(paulo2, '05-paulo-kanban')

  // recebimento
  await paulo.goto(`${BASE}/vendas`)
  await paulo.getByText('A receber').waitFor()
  const botoesReceber = paulo.getByRole('button', { name: 'Marcar como recebido' })
  await botoesReceber.first().waitFor({ timeout: 15000 })
  verificar((await botoesReceber.count()) === 4, 'entrada + 3 parcelas previstas')
  await botoesReceber.first().click()
  await paulo.getByRole('dialog').getByRole('button', { name: 'Marcar como recebido' }).click()
  await paulo.getByText('Recebimento registrado').waitFor()
  await paulo.waitForFunction(() => document.body.innerText.replace(/\u00a0/g, ' ').includes('R$ 3.000,00'), null, { timeout: 15000 })
  log('recebido do mês atualizado para R$ 3.000,00')
  await captura(paulo, '06-paulo-vendas')

  await paulo.goto(`${BASE}/metas`)
  await paulo.getByText('Extrato do mês').waitFor({ timeout: 20000 })
  await paulo.waitForFunction(() => document.body.innerText.replace(/\u00a0/g, ' ').includes('R$ 90,00'), null, { timeout: 15000 })
  log('comissão de 3% sobre R$ 3.000 = R$ 90,00 no extrato')
  verificar((await paulo.getByText('Inicial').count()) >= 1, 'faixa Inicial com R$ 30.000 vendidos')
  await captura(paulo, '07-paulo-metas')

  await paulo.goto(`${BASE}/`)
  await paulo.waitForFunction(() => !document.querySelector('[aria-busy]'), null, { timeout: 30000 })
  const briefing = await paulo.locator('p.text-\\[17px\\]').first().innerText().catch(() => '')
  verificar(briefing.includes('R$'), `briefing cita valores reais ("${briefing.slice(0, 80)}...")`)
  await paulo.getByRole('button', { name: 'Quanto falta para a meta?' }).click()
  await paulo.waitForFunction(() => document.body.innerText.replace(/\u00a0/g, ' ').includes('Faltam R$'), null, { timeout: 15000 })
  log('chat local responde sobre a meta')
  await captura(paulo, '08-paulo-home')

  // ------------------------------------------------------------ Vendedor 2 (isolamento)
  const ctxAna = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const ana = await ctxAna.newPage()
  observar(ana, 'ana')
  await criarConta(ana, 'Ana Vendedora', 'ana@pa.test', 'senha123456')
  await ana.waitForURL(`${BASE}/`, { timeout: 30000 })
  await ana.goto(`${BASE}/leads`)
  await ana.getByText('Cadastre seu primeiro lead').waitFor({ timeout: 20000 })
  verificar((await ana.getByText('Transportes Iguaçu').count()) === 0, 'Ana não vê o lead de Paulo')
  await ana.goto(`${BASE}/leads/${idLead}`)
  await ana.getByText('Lead não encontrado').waitFor({ timeout: 20000 })
  log('acesso direto ao lead de outro vendedor é negado')
  await ana.goto(`${BASE}/vendas`)
  await ana.waitForFunction(() => document.body.innerText.replace(/\u00a0/g, ' ').includes('Nada por aqui'), null, { timeout: 20000 })
  log('Ana não vê parcelas de Paulo')

  // ------------------------------------------------------------ Gestora vê ambos
  const ctxCarla = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const carla = await ctxCarla.newPage()
  observar(carla, 'carla')
  await criarConta(carla, 'Carla Coordenadora', 'carla@pa.test', 'senha123456')
  await carla.waitForURL(`${BASE}/`, { timeout: 30000 })
  await carla.goto(`${BASE}/leads`)
  await carla.getByText('Transportes Iguaçu').first().waitFor({ timeout: 20000 })
  verificar((await carla.getByLabel('Vendedor').count()) === 1, 'gestora tem filtro por vendedor')
  await carla.goto(`${BASE}/metas`)
  await carla.getByText('Ranking do time').waitFor({ timeout: 20000 })
  await carla.waitForFunction(() => document.body.innerText.replace(/\u00a0/g, ' ').includes('Paulo Vendedor'), null, { timeout: 20000 })
  log('ranking mostra Paulo para a gestora')
  await captura(carla, '09-carla-metas')

  // ------------------------------------------------------------ Não convidado
  const ctxIntruso = await browser.newContext()
  const intruso = await ctxIntruso.newPage()
  observar(intruso, 'intruso')
  await criarConta(intruso, 'Fulano', 'fulano@pa.test', 'senha123456')
  await intruso.getByText('Acesso não autorizado').waitFor({ timeout: 20000 })
  log('e-mail não convidado vê acesso não autorizado')
  await captura(intruso, '10-sem-acesso')

  // ------------------------------------------------------------ Mobile 360px
  const ctxMobile = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true })
  const mob = await ctxMobile.newPage()
  observar(mob, 'mobile')
  await entrar(mob, 'paulo@pa.test', 'senha123456')
  await mob.waitForURL(`${BASE}/`, { timeout: 30000 })
  await mob.waitForFunction(() => !document.querySelector('[aria-busy]'), null, { timeout: 30000 })
  for (const rota of ['/', '/leads', '/vendas', '/metas', '/mais']) {
    await mob.goto(`${BASE}${rota}`)
    await mob.waitForTimeout(1500)
    const overflow = await mob.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    verificar(!overflow, `sem rolagem horizontal em 360px em ${rota}`)
    await captura(mob, `11-mobile${rota.replace('/', '-') || '-home'}`)
  }
  await captura(mob, '12-mobile-final')

  await browser.close()
} catch (e) {
  console.error(e)
  let k = 0
  for (const ctx of browser.contexts()) for (const pg of ctx.pages()) await pg.screenshot({ path: `${CAPTURAS}/falha-${k++}.png`, fullPage: true }).catch(() => undefined)
  await browser.close()
  process.exitCode = 1
}

const relevantes = errosConsole.filter((e) => !/favicon|manifest|sw\.js|ERR_CONNECTION|net::|Download the React DevTools/.test(e))
if (relevantes.length) {
  console.log('\nErros de console encontrados:')
  for (const e of relevantes) console.log(' -', e)
  process.exitCode = 1
} else {
  console.log('\nSem erros de console.')
}
