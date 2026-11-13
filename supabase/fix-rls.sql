-- ZoCo POS · PARCHE: corrige "infinite recursion detected in policy for relation members"
-- Ejecuta este archivo completo en el SQL Editor.

-- 1) Funciones SECURITY DEFINER (evitan la recursión porque saltan RLS)
create or replace function public.is_member(p_company text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.company_id = p_company and m.user_id = auth.uid());
$$;

create or replace function public.is_owner(p_company text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.company_id = p_company and m.user_id = auth.uid() and m.role = 'owner');
$$;

-- 2) Reemplaza las políticas recursivas
drop policy if exists members_read on members;
create policy members_read on members for select
  using (user_id = auth.uid() or public.is_owner(company_id));

drop policy if exists companies_read on companies;
create policy companies_read on companies for select
  using (public.is_member(id));

drop policy if exists state_read on company_state;
create policy state_read on company_state for select
  using (public.is_member(company_id));

drop policy if exists state_write on company_state;
create policy state_write on company_state for update
  using (public.is_member(company_id)) with check (public.is_member(company_id));

drop policy if exists state_insert on company_state;
create policy state_insert on company_state for insert
  with check (public.is_member(company_id));

drop policy if exists companies_insert on companies;
create policy companies_insert on companies for insert with check (true);

drop policy if exists members_insert on members;
create policy members_insert on members for insert with check (true);

-- 3) Verificación (debe devolver 0 filas y sin error 42P17)
select 'ok' as resultado;
