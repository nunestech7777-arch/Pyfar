-- Vincula o usuário Zé Mario como VENDEDOR da conta principal (hassan.sistema@gmail.com).
--
-- Pré-requisitos:
--   1. Migration 003_seller_access.sql já executada.
--   2. Usuário criado em Supabase > Authentication > Users > Add user > Create new user,
--      com e-mail Zémario.sistema@gmail.com e "Auto Confirm User" marcado (senha combinada à parte;
--      nunca grave senhas neste repositório). Se o Supabase recusar o "é", crie como
--      zemario.sistema@gmail.com — o login do app tenta automaticamente a versão sem acento.
--
-- Rode em: Supabase > SQL Editor > New query > Run. Pode rodar mais de uma vez.
-- Falha (e não grava nada) se não encontrar exatamente 1 vendedor e 1 administrador: sem o vínculo,
-- o usuário entraria como administrador de uma conta própria vazia.
do $$
declare
  v_seller uuid;
  v_owner uuid;
  v_count int;
begin
  select count(*), min(id::text)::uuid into v_count, v_seller
    from auth.users
   where lower(normalize(email, NFC)) in ('zémario.sistema@gmail.com', 'zemario.sistema@gmail.com');
  if v_count <> 1 then
    raise exception 'Vendedor: esperado 1 usuário com o e-mail Zémario/zemario.sistema@gmail.com, encontrado %.', v_count;
  end if;

  select count(*), min(id::text)::uuid into v_count, v_owner
    from auth.users
   where lower(email) = 'hassan.sistema@gmail.com';
  if v_count <> 1 then
    raise exception 'Administrador: esperado 1 usuário hassan.sistema@gmail.com, encontrado %.', v_count;
  end if;

  insert into public.seller_profiles (user_id, owner_id, name)
  values (v_seller, v_owner, 'Zé Mario')
  on conflict (user_id) do update set owner_id = excluded.owner_id, active = true;

  -- Se ele chegou a entrar antes do vínculo, descarta a conta própria (vazia) criada naquele login.
  delete from public.user_data where user_id = v_seller;
end;
$$;

-- Conferência: deve listar o vendedor com role = vendedor e active = true.
select sp.role, sp.active, s.email as vendedor, o.email as administrador
  from public.seller_profiles sp
  join auth.users s on s.id = sp.user_id
  join auth.users o on o.id = sp.owner_id;
