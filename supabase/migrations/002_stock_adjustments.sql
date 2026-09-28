-- VaxControl: histórico de ajustes manuais de estoque (auditoria).
-- Adiciona a coluna stock_adjustments à tabela existente public.user_data.
-- Rode este script em: Supabase > SQL Editor > New query > Run.

alter table public.user_data
  add column if not exists stock_adjustments jsonb not null default '[]'::jsonb;
