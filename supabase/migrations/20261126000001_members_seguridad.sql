-- 0007 · P0.2 · Seguridad de `members`: se acabó la escalada entre empresas
--
-- Agujero que cierra:
--   1) Un dueño podía mover su propia fila a la empresa de la víctima y quedar como owner
--      (`members_update` no fijaba company_id ni role).
--   2) Cualquier usuario autenticado podía insertarse como owner de cualquier empresa
--      (`members_insert` con `check (true)`).
--   3) `bootstrap_company` aceptaba un company_id ajeno y creaba la membresía de owner.
--
-- Idempotente: se puede correr más de una vez. Ejecutar en Supabase → SQL Editor.

-- ============ 1) Helper de rol ============
create or replace function public.is_company_admin(p_company text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members m
    where m.company_id = p_company
      and m.user_id = auth.uid()
      and upper(coalesce(m.role, '')) in ('OWNER', 'ADMIN')
  )
  or exists (
    select 1 from public.superadmins s where s.user_id = auth.uid()
  );
$$;

grant execute on function public.is_company_admin(text) to authenticated;

-- ============ 2) Trigger: la fila no cambia de empresa ni de usuario ============
-- Las políticas RLS no pueden comparar el valor viejo con el nuevo; el trigger sí.
create or replace function public.members_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'members: no se puede cambiar de empresa' using errcode = '42501';
  end if;

  -- La única transición de user_id permitida es reclamar una invitación (null → uno mismo).
  if new.user_id is distinct from old.user_id then
    if not (old.user_id is null and new.user_id = auth.uid()) then
      raise exception 'members: no se puede cambiar el usuario de la membresía' using errcode = '42501';
    end if;
  end if;

  if upper(coalesce(new.role, '')) is distinct from upper(coalesce(old.role, ''))
     and not public.is_company_admin(old.company_id) then
    raise exception 'members: solo un administrador cambia el rol' using errcode = '42501';
  end if;

  if lower(coalesce(new.email, '')) <> lower(coalesce(old.email, ''))
     and not public.is_company_admin(old.company_id) then
    raise exception 'members: solo un administrador cambia el correo' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists members_guard_trg on public.members;
create trigger members_guard_trg
  before update on public.members
  for each row execute function public.members_guard();

-- ============ 3) Políticas de members ============
drop policy if exists members_insert on public.members;
create policy members_insert on public.members
for insert to authenticated
with check (
  public.is_company_admin(company_id)
  and (user_id is null or user_id = auth.uid())
);

drop policy if exists members_update on public.members;
create policy members_update on public.members
for update to authenticated
using (
  public.is_company_admin(company_id)
  or (user_id is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
)
with check (
  public.is_company_admin(company_id)
  or (user_id = auth.uid() and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
);

drop policy if exists members_delete on public.members;
create policy members_delete on public.members
for delete to authenticated
using (public.is_company_admin(company_id));

-- ============ 4) bootstrap_company: rechaza empresas ajenas ============
create or replace function public.bootstrap_company(company_name text, company_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existe boolean;
begin
  if v_uid is null then
    raise exception 'bootstrap_company: sin sesión' using errcode = '42501';
  end if;

  if company_id is null or company_id !~ '^[A-Za-z0-9_-]{3,40}$' then
    raise exception 'bootstrap_company: id de empresa inválido' using errcode = '22023';
  end if;

  select exists (select 1 from public.companies c where c.id = company_id) into v_existe;

  -- Si la empresa ya existe, solo puede "bootstrapearla" quien ya es miembro.
  if v_existe and not exists (
    select 1 from public.members m where m.company_id = company_id and m.user_id = v_uid
  ) then
    raise exception 'bootstrap_company: empresa no disponible' using errcode = '42501';
  end if;

  insert into public.companies (id, name)
    values (company_id, coalesce(nullif(trim(company_name), ''), 'Mi negocio'))
    on conflict (id) do nothing;

  insert into public.company_state (company_id, data, rev)
    values (company_id, '{}'::jsonb, 0)
    on conflict (company_id) do nothing;

  insert into public.members (user_id, company_id, role, email)
    values (v_uid, company_id, 'owner', auth.jwt() ->> 'email')
    on conflict (user_id, company_id) do nothing;
end;
$$;

revoke all on function public.bootstrap_company(text, text) from public, anon;
grant execute on function public.bootstrap_company(text, text) to authenticated;

-- ============ 5) Comprobación ============
select 'members_insert' as politica, cmd, with_check
from pg_policies where schemaname = 'public' and tablename = 'members' and policyname = 'members_insert'
union all
select 'members_update', cmd, with_check
from pg_policies where schemaname = 'public' and tablename = 'members' and policyname = 'members_update';
