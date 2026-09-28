-- VaxControl: dados de cada conta (uma linha por usuário do Supabase Auth).
-- Cada coleção do AppContext é guardada como jsonb, com as mesmas chaves do antigo LocalStorage.
-- Rode este script em: Supabase > SQL Editor > New query > Run.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb,
  clients jsonb not null default '[]'::jsonb,
  batches jsonb not null default '[]'::jsonb,
  sales jsonb not null default '[]'::jsonb,
  commissioners jsonb not null default '[]'::jsonb,
  commissions jsonb not null default '[]'::jsonb,
  finances jsonb not null default '[]'::jsonb,
  payments jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- Cada usuário só enxerga e altera a própria linha.
drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data
  for select using (auth.uid() = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
