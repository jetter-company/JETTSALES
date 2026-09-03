-- JETT SALES — schema base
-- Princípios:
--   1. Tudo pertence a uma org desde o dia 1 (interno hoje, multi-tenant amanhã).
--   2. `interactions` é log append-only e fonte da verdade; `leads` é projeção.
--   3. Nenhum lead aberto existe sem próximo passo com data (constraint, não convenção).
--   4. Quem confirma pagamento é `orders`, não o vendedor digitando.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type public.user_role as enum ('closer', 'admin');

-- Funil de VENDA — dirigido pelo closer.
create type public.sale_status as enum (
  'novo',
  'tentando_contato',
  'em_conversa',
  'call_agendada',
  'proposta',
  'fechou_verbal',
  'perdido',
  'esfriou'
);

-- Funil de PAGAMENTO — dirigido por `orders`, nunca pelo closer.
create type public.payment_status as enum (
  'sem_pedido',
  'pedido_gerado',
  'pago',
  'recusado',
  'expirado',
  'reembolsado'
);

-- Resultado do toque. Separado de estágio: "não atendeu" não é um estágio,
-- é o que mais acontece no dia e precisa ser registrável em uma tecla.
create type public.touch_outcome as enum (
  'atendeu',
  'nao_atendeu',
  'sem_resposta',
  'no_show'
);

create type public.next_action_type as enum (
  'primeiro_contato',
  'retorno',
  'call',
  'cobrar',
  'reativacao'
);

create type public.interaction_type as enum (
  'note',
  'touch',
  'message',
  'stage_change',
  'objection',
  'reschedule',
  'whatsapp_open',
  'assignment',
  'external_event',
  'payment'
);

create type public.message_direction as enum ('inbound', 'outbound');

create type public.lost_reason as enum (
  'preco',
  'sem_interesse',
  'sem_perfil',
  'concorrente',
  'nao_respondeu',
  'timing',
  'outro'
);

create type public.order_status as enum (
  'pendente',
  'pago',
  'recusado',
  'expirado',
  'reembolsado',
  'cancelado'
);

-- ---------------------------------------------------------------- orgs

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/Sao_Paulo',
  -- Janela de trabalho, usada para resolver "amanhã 10h" em dia útil.
  business_start_hour smallint not null default 9,
  business_end_hour smallint not null default 19,
  works_saturday boolean not null default false,
  -- SLA de primeiro contato do lead novo, em minutos.
  sla_first_touch_min integer not null default 15,
  -- Cadência do "não atendeu". Configurável porque a regra real ainda vai
  -- ser calibrada com o time; o default é um ponto de partida honesto.
  cadence jsonb not null default '{
    "steps": [
      {"attempt": 1, "delay_minutes": 120},
      {"attempt": 2, "delay_minutes": 300},
      {"attempt": 3, "business_days": 1, "at_hour": 10},
      {"attempt": 4, "business_days": 2, "at_hour": 15},
      {"attempt": 5, "business_days": 4, "at_hour": 10}
    ],
    "max_attempts": 5,
    "cooldown_days": 30
  }'::jsonb,
  -- 'external' respeita o vendedor que vier no payload do gestor de leads
  -- e cai para rodízio quando não vier; 'round_robin' ignora o externo.
  assignment_mode text not null default 'external'
    check (assignment_mode in ('external', 'round_robin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.orgs (id) on delete cascade,
  name text not null,
  email text not null,
  role public.user_role not null default 'closer',
  is_active boolean not null default true,
  -- Gate único do rodízio. Gestor que também fecha entra no rodízio marcando true.
  receives_leads boolean not null default true,
  daily_contact_target integer not null default 40,
  -- Id do vendedor no gestor de leads externo, para casar a atribuição que vem no payload.
  external_ref text,
  -- Cursor do rodízio: quem recebeu há mais tempo é o próximo.
  last_assigned_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_org_idx on public.profiles (org_id);
create unique index profiles_org_external_ref_uidx
  on public.profiles (org_id, external_ref) where external_ref is not null;

-- ---------------------------------------------------------------- integrations

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  provider text not null,
  name text not null,
  -- Segredo guardado como hash; a comparação no webhook é timing-safe.
  secret_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index integrations_org_idx on public.integrations (org_id);

-- ---------------------------------------------------------------- objections

create table public.objections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  title text not null,
  category text,
  -- Tecla do overlay (1..9).
  hotkey text,
  sort_order integer not null default 0,
  active boolean not null default true,
  -- O campo primário: UMA frase para usar no meio da call.
  puxada_curta text not null,
  -- Template para colar no WhatsApp. Aceita {nome} e {valor}.
  whatsapp_template text,
  -- SPIN completo fica atrás de "expandir". Opcional de propósito.
  texto_situacao text,
  texto_problema text,
  texto_implicacao text,
  texto_necessidade text,
  script_fechamento text,
  created_at timestamptz not null default now()
);

create index objections_org_idx on public.objections (org_id, sort_order);

-- ---------------------------------------------------------------- leads

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,

  name text not null,
  phone_raw text,
  phone_e164 text,
  email text,
  document text,

  campaign text,
  product text,
  source text,
  utm jsonb,
  external_ref text,

  sale_status public.sale_status not null default 'novo',
  payment_status public.payment_status not null default 'sem_pedido',

  next_action_at timestamptz,
  next_action_type public.next_action_type default 'primeiro_contato',

  attempts_count integer not null default 0,
  last_outcome public.touch_outcome,

  -- Sinal mais quente da fila: cliente respondeu e ninguém respondeu de volta.
  awaiting_reply boolean not null default false,
  last_inbound_at timestamptz,

  first_contact_at timestamptz,
  last_contact_at timestamptz,

  assigned_user_id uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz,
  transferred_from uuid references public.profiles (id) on delete set null,

  proposal_value numeric(12, 2),
  expected_payment_at timestamptz,
  won_at timestamptz,
  won_value numeric(12, 2),
  paid_at timestamptz,
  paid_value numeric(12, 2),

  lost_reason public.lost_reason,

  -- Última nota, desnormalizada só para o card da fila não fazer join.
  last_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- A invariante do produto. Lead aberto sem próximo passo é o buraco da
  -- planilha; aqui o banco recusa.
  constraint leads_next_action_required check (
    sale_status = 'perdido'
    or payment_status = 'pago'
    or deleted_at is not null
    or next_action_at is not null
  ),
  constraint leads_lost_reason_required check (
    sale_status <> 'perdido' or lost_reason is not null
  )
);

-- Um telefone aberto por org. Evento repetido do gestor de leads reaproveita
-- o lead existente em vez de duplicar a fila.
create unique index leads_open_phone_uidx
  on public.leads (org_id, phone_e164)
  where deleted_at is null
    and phone_e164 is not null
    and sale_status <> 'perdido'
    and payment_status <> 'pago';

create index leads_queue_idx
  on public.leads (org_id, assigned_user_id, next_action_at)
  where deleted_at is null;
create index leads_awaiting_idx
  on public.leads (org_id, assigned_user_id, last_inbound_at)
  where awaiting_reply and deleted_at is null;
create index leads_external_ref_idx
  on public.leads (org_id, external_ref) where external_ref is not null;

-- ---------------------------------------------------------------- command batches

-- Um "contato registrado" é uma transação: várias interações + a projeção do
-- lead. O snapshot anterior fica aqui para o undo de 5s ser real e auditável.
create table public.command_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  lead_before jsonb not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

create index command_batches_lead_idx on public.command_batches (lead_id, created_at desc);

-- ---------------------------------------------------------------- interactions

create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  batch_id uuid references public.command_batches (id) on delete set null,

  type public.interaction_type not null,
  outcome public.touch_outcome,
  channel text,
  direction public.message_direction,

  objection_id uuid references public.objections (id) on delete set null,
  note text,

  status_before public.sale_status,
  status_after public.sale_status,
  scheduled_for timestamptz,

  -- Id do evento/mensagem na origem, para idempotência de ingestão.
  external_id text,
  payload jsonb,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  undone_at timestamptz
);

create index interactions_lead_idx on public.interactions (lead_id, occurred_at desc);
create index interactions_org_created_idx on public.interactions (org_id, created_at desc);
create index interactions_objection_idx
  on public.interactions (org_id, objection_id) where objection_id is not null;
create unique index interactions_external_uidx
  on public.interactions (org_id, external_id) where external_id is not null;

-- ---------------------------------------------------------------- orders

-- Fonte da verdade de "pago", de "Cobrar" e de "Dinheiro em Mesa".
-- Agnóstico de provedor: hoje entra pedido manual do admin, amanhã entra
-- webhook de checkout sem mudar o modelo.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  provider text not null default 'manual',
  external_transaction_id text,
  amount numeric(12, 2) not null,
  payment_method text,
  status public.order_status not null default 'pendente',
  due_date timestamptz,
  paid_at timestamptz,
  -- Quem confirmou na mão, quando não veio de webhook. Auditoria do override.
  confirmed_by uuid references public.profiles (id) on delete set null,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index orders_external_uidx
  on public.orders (org_id, provider, external_transaction_id)
  where external_transaction_id is not null;
create index orders_lead_idx on public.orders (lead_id);
create index orders_pending_idx
  on public.orders (org_id, due_date) where status = 'pendente';

-- ---------------------------------------------------------------- webhook events

-- Todo payload cru entra aqui antes de virar qualquer coisa. Retry do
-- provedor não duplica lead, e payload novo nunca é perdido por bug de parser.
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs (id) on delete cascade,
  integration_id uuid references public.integrations (id) on delete set null,
  provider text not null,
  external_event_id text,
  dedup_key text not null,
  raw_payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'ignored', 'error')),
  error text,
  lead_id uuid references public.leads (id) on delete set null
);

create unique index webhook_events_dedup_uidx on public.webhook_events (org_id, dedup_key);
create index webhook_events_status_idx on public.webhook_events (org_id, status, received_at desc);

-- ---------------------------------------------------------------- updated_at

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_touch_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Log append-only: correção vira novo registro ou undo, nunca UPDATE cego.
create or replace function public.interactions_immutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'interactions são append-only: use undo_command';
  end if;
  if new.undone_at is distinct from old.undone_at then
    return new;
  end if;
  raise exception 'interactions são append-only: só undone_at pode mudar';
end;
$$;

create trigger interactions_append_only
  before update or delete on public.interactions
  for each row execute function public.interactions_immutable();
