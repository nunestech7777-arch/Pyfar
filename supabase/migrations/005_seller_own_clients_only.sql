-- PYFAR: desfaz a 004. O vendedor volta a ver e vender só para os clientes que ELE cadastrou;
-- a carteira de clientes do admin não é exposta ao vendedor. O admin continua vendo todos os
-- clientes, inclusive os dos vendedores (marcados com "Cadastrado pelo vendedor ...").
-- Rode em: Supabase > SQL Editor > New query > Run (depois da 004).

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
    -- Só os clientes cadastrados pelo próprio vendedor (a carteira do admin não é exposta).
    'clients', coalesce((
      select jsonb_agg(public._seller_client_view(c) || jsonb_build_object(
               'sellerName', c->'sellerName',
               'isOwn', coalesce(c->>'sellerId' = ctx.seller_id::text, false)
             ) order by ord)
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
   where c->>'id' = p->>'clientId'
     and c->>'sellerId' = ctx.seller_id::text
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
