-- PYFAR: Acesso Vendedor (perfil com permissões limitadas).
-- Rode este script em: Supabase > SQL Editor > New query > Run (depois de 001 e 002).
--
-- Modelo de segurança
-- -------------------
-- Os dados da empresa continuam em UMA linha jsonb por administrador (public.user_data).
-- O vendedor NUNCA lê nem grava public.user_data diretamente (RLS bloqueia). Todo acesso dele
-- passa pelas funções seller_* abaixo (SECURITY DEFINER), que:
--   * identificam o vendedor pelo auth.uid() do token (não por parâmetro enviado pelo navegador);
--   * devolvem só campos liberados (sem custo, lucro, margem, lote, fornecedor, financeiro);
--   * filtram vendas/clientes pelo sellerId do próprio vendedor;
--   * gravam vendas/clientes no servidor, validando estoque, valores e vínculo do cliente.
-- O perfil (vendedor x admin) vem de public.seller_profiles, que o vendedor só consegue LER.

-- ============================================================================
-- 1. Controle de concorrência em user_data
-- ============================================================================
-- O app do administrador regrava a linha inteira; o vendedor grava pela função no servidor.
-- `version` (incrementada por trigger) permite ao app do admin detectar que a linha mudou desde a
-- última leitura e mesclar, em vez de sobrescrever a venda que o vendedor acabou de lançar.
alter table public.user_data
  add column if not exists version bigint not null default 0;

create or replace function public.user_data_bump_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

drop trigger if exists user_data_bump_version on public.user_data;
create trigger user_data_bump_version
  before update on public.user_data
  for each row execute function public.user_data_bump_version();

-- ============================================================================
-- 2. Perfis de vendedor
-- ============================================================================
-- Quem tem linha aqui é VENDEDOR do administrador owner_id. Quem não tem é administrador da
-- própria conta (comportamento atual, sem quebrar as contas existentes).
create table if not exists public.seller_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  role text not null default 'vendedor' check (role = 'vendedor'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint seller_profiles_not_self check (user_id <> owner_id)
);

alter table public.seller_profiles enable row level security;

-- Leitura: o vendedor vê o próprio vínculo; o admin vê os vendedores dele.
-- Sem policies de insert/update/delete: ninguém altera perfis pelo app (nem o vendedor se
-- promovendo a admin). Vendedores são criados/desativados só pelo SQL Editor.
drop policy if exists "seller_profiles_select" on public.seller_profiles;
create policy "seller_profiles_select" on public.seller_profiles
  for select using (auth.uid() = user_id or auth.uid() = owner_id);

revoke insert, update, delete, truncate on public.seller_profiles from anon, authenticated;

-- O app nunca apaga a linha de dados; TRUNCATE ignoraria a RLS.
revoke delete, truncate on public.user_data from anon, authenticated;

-- ============================================================================
-- 3. Vendedor não acessa public.user_data (nem a do admin, nem uma própria)
-- ============================================================================
create or replace function public.is_current_user_seller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.seller_profiles where user_id = auth.uid());
$$;

-- Só responde sobre o próprio token; anon precisa poder avaliar as policies (resultado: false).
revoke all on function public.is_current_user_seller() from public;
grant execute on function public.is_current_user_seller() to anon, authenticated;

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own" on public.user_data
  for select using (auth.uid() = user_id and not public.is_current_user_seller());

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own" on public.user_data
  for insert with check (auth.uid() = user_id and not public.is_current_user_seller());

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own" on public.user_data
  for update using (auth.uid() = user_id and not public.is_current_user_seller())
  with check (auth.uid() = user_id and not public.is_current_user_seller());

-- ============================================================================
-- 4. Funções internas (não executáveis pelo app)
-- ============================================================================

-- Vendedor ativo do token atual; erro se não for.
create or replace function public._seller_ctx(out seller_id uuid, out owner_id uuid, out seller_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  select sp.user_id, sp.owner_id, sp.name
    into seller_id, owner_id, seller_name
    from public.seller_profiles sp
   where sp.user_id = auth.uid() and sp.active;
  if seller_id is null then
    raise exception 'Você não tem permissão para acessar esta área.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public._sp_today()
returns date
language sql
stable
as $$ select (now() at time zone 'America/Sao_Paulo')::date; $$;

create or replace function public._sp_now_iso()
returns text
language sql
stable
as $$ select to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); $$;

create or replace function public._sp_new_id(prefix text)
returns text
language sql
volatile
as $$
  select prefix || '-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint
         || '-' || substr(md5(random()::text), 1, 6);
$$;

-- Texto opcional: trim, vazio vira null, limite de tamanho.
create or replace function public._sp_text(v jsonb, max_len int)
returns text
language plpgsql
immutable
as $$
declare
  t text;
begin
  if v is null or jsonb_typeof(v) = 'null' then return null; end if;
  if jsonb_typeof(v) <> 'string' then
    raise exception 'Campo de texto inválido.' using errcode = '22023';
  end if;
  t := btrim(v #>> '{}');
  if t = '' then return null; end if;
  if length(t) > max_len then
    raise exception 'Texto muito longo (máx. % caracteres).', max_len using errcode = '22023';
  end if;
  return t;
end;
$$;

-- Data "YYYY-MM-DD" válida, senão null.
create or replace function public._sp_date(v text)
returns date
language plpgsql
immutable
as $$
begin
  if v is null or v !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  return v::date;
exception when others then
  return null;
end;
$$;

-- Lote vendável: com saldo e não vencido.
create or replace function public._sp_batch_sellable(b jsonb, today date)
returns boolean
language sql
immutable
as $$
  select coalesce((b->>'currentQuantity')::numeric, 0) > 0
     and coalesce(b->>'status', 'ativo') <> 'vencido'
     and coalesce(public._sp_date(b->>'expirationDate') >= today, true);
$$;

-- Visões seguras (só campos liberados para o vendedor) ------------------------

create or replace function public._seller_client_view(c jsonb)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', c->'id',
    'name', c->'name',
    'storeName', c->'storeName',
    'phone', c->'phone',
    'cnpj', c->'cnpj',
    'city', c->'city',
    'address', c->'address',
    'notes', c->'notes',
    'status', c->'status',
    'createdAt', c->'createdAt'
  );
$$;

create or replace function public._seller_sale_view(s jsonb)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', s->'id',
    'saleNumber', s->'saleNumber',
    'clientId', s->'clientId',
    'clientName', s->'clientName',
    'storeName', s->'storeName',
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'vaccineName', i->'vaccineName',
               'quantity', i->'quantity',
               'unitPrice', i->'unitPrice',
               'totalPrice', i->'totalPrice'
             ) order by ord)
        from jsonb_array_elements(coalesce(s->'items', '[]'::jsonb)) with ordinality as t(i, ord)
    ), '[]'::jsonb),
    'totalQuantity', s->'totalQuantity',
    'totalAmount', s->'totalAmount',
    'paymentMethod', s->'paymentMethod',
    'downPayment', s->'downPayment',
    'paidAmount', s->'paidAmount',
    'remainingBalance', s->'remainingBalance',
    'installmentsCount', s->'installmentsCount',
    'dueDate', s->'dueDate',
    'notes', s->'notes',
    'status', s->'status',
    'createdAt', s->'createdAt'
  );
$$;

-- Produtos agregados por nome (sem lote, custo, fornecedor ou validade).
create or replace function public._seller_products_view(batches jsonb, today date)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(p order by p->>'name'), '[]'::jsonb)
    from (
      select jsonb_build_object(
               'name', b->>'vaccineName',
               'manufacturer', case when count(distinct b->>'manufacturer') = 1 then max(b->>'manufacturer') end,
               'available', coalesce(sum((b->>'currentQuantity')::numeric)
                                     filter (where public._sp_batch_sellable(b, today)), 0)
             ) as p
        from jsonb_array_elements(coalesce(batches, '[]'::jsonb)) as t(b)
       where coalesce(b->>'vaccineName', '') <> ''
       group by b->>'vaccineName'
    ) q;
$$;

revoke all on function public._seller_ctx() from public, anon, authenticated;
revoke all on function public._sp_today() from public, anon, authenticated;
revoke all on function public._sp_now_iso() from public, anon, authenticated;
revoke all on function public._sp_new_id(text) from public, anon, authenticated;
revoke all on function public._sp_text(jsonb, int) from public, anon, authenticated;
revoke all on function public._sp_date(text) from public, anon, authenticated;
revoke all on function public._sp_batch_sellable(jsonb, date) from public, anon, authenticated;
revoke all on function public._seller_client_view(jsonb) from public, anon, authenticated;
revoke all on function public._seller_sale_view(jsonb) from public, anon, authenticated;
revoke all on function public._seller_products_view(jsonb, date) from public, anon, authenticated;

-- ============================================================================
-- 5. API do vendedor (chamada pelo app via supabase.rpc)
-- ============================================================================

-- Tudo que a área do vendedor exibe, já filtrado e sem dados sensíveis.
create or replace function public.seller_get_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ctx record;
  d record;
  my_sales jsonb;
begin
  select * into ctx from public._seller_ctx();

  select ud.clients, ud.batches, ud.sales, ud.payments
    into d
    from public.user_data ud
   where ud.user_id = ctx.owner_id;

  select coalesce(jsonb_agg(s order by ord), '[]'::jsonb)
    into my_sales
    from jsonb_array_elements(coalesce(d.sales, '[]'::jsonb)) with ordinality as t(s, ord)
   where s->>'sellerId' = ctx.seller_id::text;

  return jsonb_build_object(
    'seller', jsonb_build_object('id', ctx.seller_id, 'name', ctx.seller_name),
    'clients', coalesce((
      select jsonb_agg(public._seller_client_view(c) order by ord)
        from jsonb_array_elements(coalesce(d.clients, '[]'::jsonb)) with ordinality as t(c, ord)
       where c->>'sellerId' = ctx.seller_id::text
    ), '[]'::jsonb),
    'sales', coalesce((
      select jsonb_agg(public._seller_sale_view(s) order by ord)
        from jsonb_array_elements(my_sales) with ordinality as t(s, ord)
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p->'id',
               'saleId', p->'saleId',
               'amount', p->'amount',
               'paymentDate', p->'paymentDate',
               'paymentMethod', p->'paymentMethod'
             ) order by ord)
        from jsonb_array_elements(coalesce(d.payments, '[]'::jsonb)) with ordinality as t(p, ord)
       where p->>'reversedAt' is null
         and exists (select 1 from jsonb_array_elements(my_sales) ms where ms->>'id' = p->>'saleId')
    ), '[]'::jsonb),
    'products', public._seller_products_view(d.batches, public._sp_today())
  );
end;
$$;

-- Cadastro de cliente vinculado ao vendedor.
create or replace function public.seller_create_client(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ctx record;
  v_name text;
  v_client jsonb;
begin
  select * into ctx from public._seller_ctx();
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Dados do cliente inválidos.' using errcode = '22023';
  end if;

  v_name := public._sp_text(p->'name', 120);
  if v_name is null then
    raise exception 'Informe o nome do cliente.' using errcode = '22023';
  end if;

  v_client := jsonb_strip_nulls(jsonb_build_object(
    'id', public._sp_new_id('cli'),
    'name', v_name,
    'storeName', public._sp_text(p->'storeName', 120),
    'phone', public._sp_text(p->'phone', 40),
    'cnpj', public._sp_text(p->'cnpj', 40),
    'city', public._sp_text(p->'city', 120),
    'address', public._sp_text(p->'address', 300),
    'notes', public._sp_text(p->'notes', 1000),
    'status', 'ativo',
    'createdAt', public._sp_now_iso(),
    'sellerId', ctx.seller_id::text,
    'sellerName', ctx.seller_name
  ));

  update public.user_data
     set clients = jsonb_build_array(v_client) || coalesce(clients, '[]'::jsonb)
   where user_id = ctx.owner_id;
  if not found then
    raise exception 'A conta do administrador ainda não foi inicializada.' using errcode = 'P0002';
  end if;

  return public._seller_client_view(v_client);
end;
$$;

-- Edição dos dados básicos de um cliente do próprio vendedor (nunca o vínculo/comissionador).
create or replace function public.seller_update_client(p_id text, p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ctx record;
  v_clients jsonb;
  v_current jsonb;
  v_patch jsonb := '{}'::jsonb;
  v_updated jsonb;
  k text;
  v_limits constant jsonb := '{"name":120,"storeName":120,"phone":40,"cnpj":40,"city":120,"address":300,"notes":1000}';
begin
  select * into ctx from public._seller_ctx();
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Dados do cliente inválidos.' using errcode = '22023';
  end if;

  select clients into v_clients
    from public.user_data
   where user_id = ctx.owner_id
   for update;

  select c into v_current
    from jsonb_array_elements(coalesce(v_clients, '[]'::jsonb)) as t(c)
   where c->>'id' = p_id and c->>'sellerId' = ctx.seller_id::text
   limit 1;
  if v_current is null then
    raise exception 'Cliente não encontrado.' using errcode = 'P0002';
  end if;

  for k in select jsonb_object_keys(v_limits) loop
    if p ? k then
      v_patch := v_patch || jsonb_build_object(k, public._sp_text(p->k, (v_limits->>k)::int));
    end if;
  end loop;
  if v_patch ? 'name' and v_patch->>'name' is null then
    raise exception 'Informe o nome do cliente.' using errcode = '22023';
  end if;

  -- Campo apagado (null) é removido do objeto, como `undefined` no app.
  v_updated := jsonb_strip_nulls(v_current || v_patch);

  update public.user_data
     set clients = (
       select jsonb_agg(case when c->>'id' = p_id and c->>'sellerId' = ctx.seller_id::text then v_updated else c end order by ord)
         from jsonb_array_elements(v_clients) with ordinality as t(c, ord)
     )
   where user_id = ctx.owner_id;

  return public._seller_client_view(v_updated);
end;
$$;

-- Nova venda do vendedor. Mesmas regras de AppContext.addSale, executadas no servidor:
-- baixa de estoque (lotes não vencidos, validade mais próxima primeiro), entrada no caixa,
-- recibo de pagamento e comissão. O vendedor informa só produto, quantidade e preço — o custo é
-- lido do lote aqui e nunca devolvido a ele.
create or replace function public.seller_create_sale(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ctx record;
  r record;
  v_today date := public._sp_today();
  v_now text := public._sp_now_iso();
  v_client jsonb;
  v_batches jsonb;
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_name text;
  v_qty numeric;
  v_price numeric;
  v_need numeric;
  v_take numeric;
  v_idx int;
  v_b jsonb;
  v_cur numeric;
  v_unit_cost numeric;
  v_total_qty numeric := 0;
  v_total_cost numeric := 0;
  v_total_amount numeric := 0;
  v_method text;
  v_down numeric;
  v_remaining numeric;
  v_due date;
  v_installments int;
  v_status text;
  v_commissioner jsonb;
  v_rate numeric := 0;
  v_comm_total numeric := 0;
  v_sale_id text;
  v_sale_number text;
  v_sale jsonb;
  v_fin jsonb;
  v_pay jsonb;
  v_comm jsonb;
  v_released numeric;
  v_comm_status text;
  v_is_full boolean;
begin
  select * into ctx from public._seller_ctx();
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Dados da venda inválidos.' using errcode = '22023';
  end if;

  select ud.clients, ud.batches, ud.sales, ud.finances, ud.payments, ud.commissions, ud.commissioners
    into r
    from public.user_data ud
   where ud.user_id = ctx.owner_id
   for update;
  if not found then
    raise exception 'A conta do administrador ainda não foi inicializada.' using errcode = 'P0002';
  end if;

  -- Cliente: precisa ser do próprio vendedor
  select c into v_client
    from jsonb_array_elements(coalesce(r.clients, '[]'::jsonb)) as t(c)
   where c->>'id' = p->>'clientId' and c->>'sellerId' = ctx.seller_id::text
     and coalesce(c->>'status', 'ativo') <> 'inativo'
   limit 1;
  if v_client is null then
    raise exception 'Cliente não encontrado.' using errcode = 'P0002';
  end if;

  -- Forma de pagamento
  v_method := p->>'paymentMethod';
  if v_method is null or v_method not in ('pix', 'dinheiro', 'transferencia', 'boleto', 'cheque', 'cartao') then
    raise exception 'Forma de pagamento inválida.' using errcode = '22023';
  end if;

  -- Itens
  if jsonb_typeof(p->'items') is distinct from 'array'
     or jsonb_array_length(p->'items') = 0
     or jsonb_array_length(p->'items') > 50 then
    raise exception 'Adicione pelo menos um item à venda.' using errcode = '22023';
  end if;

  v_batches := coalesce(r.batches, '[]'::jsonb);

  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_name := public._sp_text(v_item->'product', 200);
    if v_name is null then
      raise exception 'Selecione o produto de todos os itens.' using errcode = '22023';
    end if;
    if jsonb_typeof(v_item->'quantity') is distinct from 'number'
       or jsonb_typeof(v_item->'unitPrice') is distinct from 'number' then
      raise exception 'Quantidade e preço devem ser números.' using errcode = '22023';
    end if;
    v_qty := (v_item->>'quantity')::numeric;
    v_price := round((v_item->>'unitPrice')::numeric, 2);
    if v_qty <= 0 or v_qty <> trunc(v_qty) or v_qty > 1000000 then
      raise exception 'Quantidade inválida para %.', v_name using errcode = '22023';
    end if;
    if v_price <= 0 or v_price > 10000000 then
      raise exception 'Preço de venda inválido para %.', v_name using errcode = '22023';
    end if;

    -- Baixa nos lotes vendáveis do produto, validade mais próxima primeiro
    v_need := v_qty;
    for v_idx in
      select (ord - 1)::int
        from jsonb_array_elements(v_batches) with ordinality as t(b, ord)
       where b->>'vaccineName' = v_name
         and public._sp_batch_sellable(b, v_today)
       order by public._sp_date(b->>'expirationDate') nulls last, b->>'createdAt', ord
    loop
      exit when v_need <= 0;
      v_b := v_batches->v_idx;
      v_cur := coalesce((v_b->>'currentQuantity')::numeric, 0);
      continue when v_cur <= 0;
      v_take := least(v_need, v_cur);
      v_unit_cost := coalesce((v_b->>'unitCost')::numeric, 0);

      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'id', public._sp_new_id('item'),
        'vaccineName', v_b->>'vaccineName',
        'batchId', v_b->>'id',
        'lotNumber', v_b->>'lotNumber',
        'quantity', v_take,
        'unitCost', v_unit_cost,
        'unitPrice', v_price,
        'totalCost', v_unit_cost * v_take,
        'totalPrice', v_price * v_take,
        'grossProfit', (v_price - v_unit_cost) * v_take,
        'expirationDate', v_b->>'expirationDate',
        'isExpired', false
      ));

      v_batches := jsonb_set(v_batches, array[v_idx::text, 'currentQuantity'], to_jsonb(v_cur - v_take));
      if v_cur - v_take = 0 then
        v_batches := jsonb_set(v_batches, array[v_idx::text, 'status'], '"esgotado"');
      end if;

      v_total_qty := v_total_qty + v_take;
      v_total_cost := v_total_cost + v_unit_cost * v_take;
      v_total_amount := v_total_amount + v_price * v_take;
      v_need := v_need - v_take;
    end loop;

    if v_need > 0 then
      raise exception 'Estoque insuficiente para %: faltam % un.', v_name, v_need using errcode = '22023';
    end if;
  end loop;

  -- Pagamento
  if p ? 'downPayment' and jsonb_typeof(p->'downPayment') not in ('number', 'null') then
    raise exception 'Valor de entrada inválido.' using errcode = '22023';
  end if;
  v_down := round(coalesce((p->>'downPayment')::numeric, 0), 2);
  if v_down < 0 or v_down > round(v_total_amount, 2) then
    raise exception 'O valor de entrada deve estar entre zero e o total da venda.' using errcode = '22023';
  end if;
  v_remaining := greatest(0, v_total_amount - v_down);

  v_due := public._sp_date(p->>'dueDate');
  -- 1 dia de tolerância: o navegador do vendedor pode estar em outro fuso que São Paulo.
  if v_due is null or v_due < v_today - 1 or v_due > v_today + 365 then
    raise exception 'Data de vencimento inválida (entre hoje e 365 dias).' using errcode = '22023';
  end if;

  v_installments := 1;
  if jsonb_typeof(p->'installmentsCount') = 'number' then
    v_installments := least(60::numeric, greatest(1::numeric, trunc((p->>'installmentsCount')::numeric)))::int;
  end if;

  if v_remaining <= 0 then
    v_status := 'pago';
  elsif v_down > 0 then
    v_status := 'parcialmente_pago';
  else
    v_status := 'pendente';
  end if;

  -- Comissionador vinculado ao cliente (definido só pelo admin)
  if v_client->>'commissionerId' is not null then
    select c into v_commissioner
      from jsonb_array_elements(coalesce(r.commissioners, '[]'::jsonb)) as t(c)
     where c->>'id' = v_client->>'commissionerId' and c->>'status' = 'ativo';
    if v_commissioner is not null then
      v_rate := coalesce(nullif((v_commissioner->>'defaultRatePerUnit')::numeric, 0), 1.0);
      v_comm_total := v_total_qty * v_rate;
    end if;
  end if;

  v_sale_id := public._sp_new_id('sal');
  -- Mesmo padrão do app (quantidade de vendas + 1), mas sem repetir um número já usado no ano.
  v_sale_number := 'VEN-' || extract(year from v_today)::int || '-' || lpad((greatest(
      jsonb_array_length(coalesce(r.sales, '[]'::jsonb)),
      coalesce((
        select max(substring(s->>'saleNumber' from '^VEN-' || extract(year from v_today)::int || '-(\d+)$')::bigint)
          from jsonb_array_elements(coalesce(r.sales, '[]'::jsonb)) as t(s)
      ), 0)
    ) + 1)::text, 3, '0');

  v_sale := jsonb_strip_nulls(jsonb_build_object(
    'id', v_sale_id,
    'saleNumber', v_sale_number,
    'clientId', v_client->>'id',
    'clientName', v_client->>'name',
    'storeName', v_client->>'storeName',
    'totalQuantity', v_total_qty,
    'totalCost', v_total_cost,
    'totalAmount', v_total_amount,
    'grossProfit', v_total_amount - v_total_cost,
    'paymentMethod', v_method,
    'downPayment', v_down,
    'paidAmount', v_down,
    'remainingBalance', v_remaining,
    'installmentsCount', v_installments,
    'dueDate', to_char(v_due, 'YYYY-MM-DD'),
    'notes', public._sp_text(p->'notes', 1000),
    'status', v_status,
    'createdAt', v_now,
    'commissionerId', v_commissioner->>'id',
    'commissionerName', v_commissioner->>'name',
    'commissionRatePerUnit', v_rate,
    'commissionTotal', case when v_commissioner is not null then v_comm_total end,
    'sellerId', ctx.seller_id::text,
    'sellerName', ctx.seller_name
  )) || jsonb_build_object('items', v_items);

  r.sales := jsonb_build_array(v_sale) || coalesce(r.sales, '[]'::jsonb);

  -- Entrada no caixa + recibo
  if v_down > 0 then
    v_is_full := v_down >= v_total_amount;
    v_fin := jsonb_build_object(
      'id', public._sp_new_id('fin'),
      'type', 'entrada',
      'category', case when v_is_full then 'venda_a_vista' else 'entrada_venda' end,
      'categoryLabel', case when v_is_full then 'Venda à Vista'
                            else 'Entrada de Venda (' || round(v_down / v_total_amount * 100) || '%)' end,
      'description', 'Recebimento da venda ' || v_sale_number || ' - ' || (v_client->>'name')
                     || ' (' || coalesce(v_client->>'storeName', 'Lojista') || ')',
      'amount', v_down,
      'date', to_char(v_today, 'YYYY-MM-DD'),
      'referenceId', v_sale_id,
      'isAutomatic', true,
      'createdAt', v_now,
      'sellerId', ctx.seller_id::text,
      'sellerName', ctx.seller_name
    );
    r.finances := jsonb_build_array(v_fin) || coalesce(r.finances, '[]'::jsonb);

    v_pay := jsonb_build_object(
      'id', public._sp_new_id('pay'),
      'saleId', v_sale_id,
      'clientId', v_client->>'id',
      'clientName', v_client->>'name',
      'amount', v_down,
      'paymentDate', to_char(v_today, 'YYYY-MM-DD'),
      'paymentMethod', v_method,
      'notes', case when v_is_full then 'Pagamento integral à vista' else 'Valor de entrada no fechamento da venda' end,
      'sellerId', ctx.seller_id::text,
      'sellerName', ctx.seller_name
    );
    r.payments := jsonb_build_array(v_pay) || coalesce(r.payments, '[]'::jsonb);
  end if;

  -- Comissão proporcional ao que já foi pago
  if v_commissioner is not null and v_comm_total > 0 then
    v_released := v_comm_total * (v_down / v_total_amount);
    v_comm_status := case when v_released >= v_comm_total then 'liberada'
                          when v_released > 0 then 'parcialmente_liberada'
                          else 'pendente' end;
    v_comm := jsonb_build_object(
      'id', public._sp_new_id('comm'),
      'saleId', v_sale_id,
      'saleNumber', v_sale_number,
      'commissionerId', v_commissioner->>'id',
      'commissionerName', v_commissioner->>'name',
      'clientId', v_client->>'id',
      'clientName', v_client->>'name',
      'totalUnits', v_total_qty,
      'ratePerUnit', v_rate,
      'totalCommission', v_comm_total,
      'releasedCommission', v_released,
      'paidCommission', 0,
      'status', v_comm_status,
      'saleTotal', v_total_amount,
      'salePaidAmount', v_down,
      'lastUpdated', v_now
    );
    r.commissions := jsonb_build_array(v_comm) || coalesce(r.commissions, '[]'::jsonb);
  end if;

  update public.user_data
     set batches = v_batches,
         sales = r.sales,
         finances = coalesce(r.finances, '[]'::jsonb),
         payments = coalesce(r.payments, '[]'::jsonb),
         commissions = coalesce(r.commissions, '[]'::jsonb),
         updated_at = now()
   where user_id = ctx.owner_id;

  return public._seller_sale_view(v_sale);
end;
$$;

revoke all on function public.seller_get_data() from public, anon;
revoke all on function public.seller_create_client(jsonb) from public, anon;
revoke all on function public.seller_update_client(text, jsonb) from public, anon;
revoke all on function public.seller_create_sale(jsonb) from public, anon;
grant execute on function public.seller_get_data() to authenticated;
grant execute on function public.seller_create_client(jsonb) to authenticated;
grant execute on function public.seller_update_client(text, jsonb) to authenticated;
grant execute on function public.seller_create_sale(jsonb) to authenticated;
