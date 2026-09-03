# Cockpit PA

A extensão do vendedor da equipe comercial da Pedrini & Azevedo Advogados Associados (Foz do Iguaçu/PR). Web app multiusuário com login individual, CRM de leads em kanban, vendas com cronograma de parcelas, motor de comissão, metas, dashboards e um assistente (padrão: Atlas) que gera o briefing do dia a partir dos dados reais do vendedor.

Stack: React 19 + TypeScript (estrito) + Vite, Tailwind CSS 4, Framer Motion, react-router, recharts, date-fns (pt-BR), lucide-react, Firebase (Authentication + Cloud Firestore) e API do Gemini.

## Tokens de design

| Token | Valor |
| --- | --- |
| Fundo | `#050507` (preto profundo) para `#0b0b0f` e `#121217` (grafite) |
| Marca | platina `#f2f2f5`, prata `#c9cad1`, prata 2 `#9a9aa3`, prata 3 `#6b6b75` |
| Acento | gradiente `#5b7cff` (azul elétrico) para `#8a5cf6` (violeta), usado com moderação |
| Recebido | `#3fb68b` (verde discreto) |
| Atrasado | `#e3a54a` (âmbar) |
| Erro | `#e5484d` |
| Tipografia | Manrope 300 a 800 via Google Fonts, números tabulares para valores |
| Raios | 8 / 12 / 16 / 22 / 28 px (chips, campos, cartões pequenos, cartões, painéis grandes) |
| Motion | easing `cubic-bezier(0.22, 1, 0.36, 1)`, molas 320/30, cascata de 60 a 90 ms, só `transform` e `opacity`, respeita `prefers-reduced-motion` |

Superfícies de vidro (`.vidro`, `.vidro-2`), grade fina e granulado ao fundo, brilho radial que segue o cursor (`.brilho-cursor`). Tudo em `src/index.css`.

## Modelo de dados (Firestore)

| Coleção | Documento |
| --- | --- |
| `usuarios/{uid}` | nome, email, papel (`admin`, `gestor`, `vendedor`), faixa, fotoUrl, ativo, metaMensalRecebido |
| `convites/{email}` | nome, papel, faixa, metaMensalRecebido, convidadoPor, aceitoEm |
| `leads/{id}` | dados do lead, etapa, qualificado, prioridade, motivoPerda, proximaAcao {tipo, dataHora, descricao}, ultimoContatoEm, tags, vendedorId |
| `leads/{id}/interacoes/{id}` | tipo, resultado, resumo, dataHora, duracaoMin |
| `vendas/{id}` | leadId, clienteNome, tipoPessoa, servico, valorTotal, entrada, formaPagamento, numParcelas, primeiroVencimento, dataFechamento, status |
| `parcelas/{id}` | vendaId, vendedorId, clienteNome, numero, valor, vencimento, status (`previsto`, `recebido`), dataRecebimento, valorRecebido, formaPagamento |
| `metas/{vendedorId_AAAA-MM}` | metaRecebido, metaVendas, metaContatos |
| `configuracoes/comissao` | percentualVendedorRecebido, faixasFixo[], percentualCoordenadorContratos, vigenteDesde |
| `configuracoes/listas` | servicos[], origens[], motivosPerda[] |
| `configuracoes/geral` | nomeApp, nomeAssistente, sabadoUtil, metaPadraoRecebido |
| `configuracoes/sistema` | marca o bootstrap do primeiro administrador |
| `resumos/{AAAA-MM}` | ranking: cada vendedor publica só o próprio campo {nome, recebido, vendido, contratos} |
| `briefings/{vendedorId_AAAA-MM-DD}` | texto, geradoEm, origem, dadosResumo |

Datas de negócio são strings ISO; `criadoEm` e `atualizadoEm` são timestamps do servidor. "Atrasado" é calculado pela data no cliente. Toda consulta é limitada ao mês ou ao vendedor; os índices compostos estão em `firestore.indexes.json`. As regras comentadas estão em `firestore.rules`.

## Como rodar

```bash
npm install
cp .env.example .env    # preencha as chaves do Firebase e, se quiser, do Gemini
npm run dev
```

Testes do motor de comissão e utilitários: `npm test`. Verificação de tipos: `npm run typecheck`. Build: `npm run build`.

Para rodar com os emuladores locais do Firebase (não precisa de projeto na nuvem):

```bash
npm run emuladores        # em um terminal (precisa de Java)
npm run dev:emuladores    # em outro
```

## Publicação

### No Google AI Studio (Share > Publish)

1. Importe este projeto no AI Studio (modo Build).
2. Em Firebase, conecte o projeto do escritório: ative Authentication (E-mail/senha e Google) e Cloud Firestore.
3. Publique `firestore.rules` e `firestore.indexes.json` no projeto (Console > Firestore > Regras e Índices, ou `firebase deploy --only firestore`).
4. Informe as variáveis `VITE_FIREBASE_*` do app web. A chave do Gemini é injetada pela plataforma (`GEMINI_API_KEY`).
5. Share > Publish.

### Fora do AI Studio (Firebase Hosting)

```bash
npm run build
firebase login
firebase use <id-do-projeto>
firebase deploy --only firestore,hosting
```

## Primeiro administrador e vendedores

1. Abra o app publicado e crie a conta (e-mail e senha) ou entre com Google. O primeiro usuário autenticado no projeto vira administrador automaticamente.
2. Em Administração > Equipe, clique em Convidar e informe e-mail, papel (vendedor, gestor ou administrador), faixa e meta de cada pessoa.
3. Cada pessoa entra com o e-mail convidado (criando a senha ou usando Google). Quem não estiver na lista vê a tela de acesso não autorizado.
4. Opcional: Administração > Dados de exemplo carrega leads, vendas e parcelas fictícios para treinar a equipe. Depois, apague com um clique.

## Papéis

- Administrador: tudo, incluindo equipe, regras de comissão e listas.
- Gestor (coordenador comercial): vê todos os vendedores, reatribui leads, edita metas. Não altera comissão nem papéis.
- Vendedor: vê e edita apenas o que é dele.

## Comissão (padrão, editável pelo administrador)

- Vendedor: 3% sobre o recebido no mês.
- Fixo por faixa pelo total vendido no mês: Inicial R$ 1.500 (até R$ 49.999,99), Pleno R$ 2.000 (R$ 50.000 a R$ 99.999,99), Sênior R$ 2.500 (R$ 100.000 ou mais).
- Coordenador: 1% sobre os contratos fechados pelo time.

Tudo calculado no cliente em `src/lib/comissao.ts` (funções puras, com testes) a partir dos documentos de vendas e parcelas.

## Checklist de testes manuais executados

Rodado nos emuladores do Firebase com Playwright (roteiro em `tests/e2e/`): bootstrap do primeiro administrador; convite e entrada de um vendedor; vendedor vê só os próprios leads; criação de lead, registro de interação, próxima ação, mudança de etapa; marcação de ganho com registro de venda, geração de parcelas e ficha de repasse; recebimento de parcela alterando o recebido e a comissão; briefing gerado com os dados do dia; navegação nas cinco abas em 360 px sem quebra e sem erro no console.

## Fora do escopo do MVP

Integração com WhatsApp ou Chat Guru, importação automática do Meta Ads, portal do cliente, emissão de boletos, modo claro. O modelo de dados está preparado (campos `origem`, `email`, `formaPagamento`, `vendaId`).

O scaffold anterior (Next.js + Supabase) foi movido para `legado-supabase/` como referência; não faz parte do app.
