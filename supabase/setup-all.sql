-- ============================================================
-- ZoCo POS · INSTALACION COMPLETA en un solo SQL
-- Ejecutar UNA vez en Supabase → SQL Editor (proyecto NUEVO)
-- Incluye: esquema + auth/superadmin + parche RLS + secretos IA
-- ============================================================

-- ---------- schema.sql ----------
-- ZoCo POS · esquema híbrido (local-first + nube)
-- Ejecuta esto en Supabase → SQL Editor

create table if not exists companies (
  id text primary key,
  name text not null,
  plan text default 'pro',
  created_at timestamptz default now()
);

-- Una fila por empresa con todo el estado (productos, ventas, etc.)
create table if not exists company_state (
  company_id text primary key references companies(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  rev integer not null default 0,
  updated_at timestamptz default now()
);

-- Quién pertenece a qué empresa
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company_id text references companies(id) on delete cascade,
  role text not null default 'owner',
  email text,
  created_at timestamptz default now(),
  unique (user_id, company_id)
);

create index if not exists members_user_idx on members(user_id);

-- ============ Seguridad (RLS) ============
alter table companies enable row level security;
alter table company_state enable row level security;
alter table members enable row level security;

-- Funciones SECURITY DEFINER (evitan recursión de políticas)
create or replace function public.is_member(p_company text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.company_id = p_company and m.user_id = auth.uid());
$$;

create or replace function public.is_owner(p_company text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.company_id = p_company and m.user_id = auth.uid() and m.role = 'owner');
$$;

-- Cada usuario solo ve las empresas donde es miembro
drop policy if exists companies_read on companies;
create policy companies_read on companies for select using (public.is_member(id));

drop policy if exists companies_insert on companies;
create policy companies_insert on companies for insert with check (true);

drop policy if exists state_read on company_state;
create policy state_read on company_state for select using (public.is_member(company_id));

drop policy if exists state_write on company_state;
create policy state_write on company_state for update
  using (public.is_member(company_id)) with check (public.is_member(company_id));

drop policy if exists state_insert on company_state;
create policy state_insert on company_state for insert with check (public.is_member(company_id));

drop policy if exists members_read on members;
create policy members_read on members for select using (user_id = auth.uid() or public.is_owner(company_id));

drop policy if exists members_insert on members;
create policy members_insert on members for insert with check (true);
-- ============ Al registrarse, crea su empresa ============
create or replace function public.bootstrap_company(company_name text, company_id text)
returns void language plpgsql security definer as $$
begin
  insert into companies (id, name) values (company_id, company_name) on conflict (id) do nothing;
  insert into company_state (company_id, data, rev) values (company_id, '{}'::jsonb, 0) on conflict (company_id) do nothing;
  insert into members (user_id, company_id, role, email)
    values (auth.uid(), company_id, 'owner', auth.jwt() ->> 'email')
    on conflict (user_id, company_id) do nothing;
end;
$$;


-- ---------- auth.sql ----------
-- ZoCo POS · login en la nube + super-admin
-- Ejecuta DESPUÉS de schema.sql

-- ============ Super administradores (tú) ============
create table if not exists superadmins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);
alter table superadmins enable row level security;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from superadmins s where s.user_id = auth.uid());
$$;

drop policy if exists superadmins_read on superadmins;
create policy superadmins_read on superadmins for select using (user_id = auth.uid());

-- ============ Los superadmins ven y editan todo ============
drop policy if exists companies_admin on companies;
create policy companies_admin on companies for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists state_admin on company_state;
create policy state_admin on company_state for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists members_admin on members;
create policy members_admin on members for all
  using (public.is_superadmin()) with check (public.is_superadmin());

-- ============ RPC: listado para el panel ============
create or replace function public.admin_companies()
returns table (
  id text, name text, plan text, rev integer, updated_at timestamptz,
  usuarios bigint, tamano integer
) language plpgsql security definer as $$
begin
  if not public.is_superadmin() then
    raise exception 'no autorizado';
  end if;
  return query
    select c.id, c.name, coalesce(c.plan,'pro'), coalesce(s.rev,0), s.updated_at,
           (select count(*) from members m where m.company_id = c.id),
           coalesce(pg_column_size(s.data), 0)
    from companies c
    left join company_state s on s.company_id = c.id
    order by s.updated_at desc nulls last;
end;
$$;

-- ============ RPC: activar / suspender ============
create or replace function public.admin_set_plan(p_company text, p_plan text)
returns void language plpgsql security definer as $$
begin
  if not public.is_superadmin() then
    raise exception 'no autorizado';
  end if;
  update companies set plan = p_plan where id = p_company;
end;
$$;

-- ============ RPC: soy superadmin? ============
create or replace function public.am_i_superadmin()
returns boolean language sql stable security definer as $$
  select public.is_superadmin();
$$;

-- ============ Registrar tu usuario como superadmin ============
-- 1) Crea tu usuario en Authentication → Users (o regístrate en la app)
-- 2) Luego ejecuta, cambiando el correo:
--
-- insert into superadmins (user_id, email)
-- select id, email from auth.users where email = 'ramberamericasefectivo@gmail.com'
-- on conflict (user_id) do nothing;


-- ---------- fix-rls.sql ----------
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


-- ---------- secrets.sql ----------
-- Secretos por empresa (llave de IA), cifrados.
-- Solo el service_role (funciones Edge) puede leer/escribir.
-- Ejecutar en Supabase → SQL Editor.

create table if not exists public.company_secrets (
  company_id text primary key,
  encrypted  text not null,
  provider   text,
  updated_at timestamptz not null default now()
);

alter table public.company_secrets enable row level security;

-- Sin políticas: ni anon ni usuarios autenticados pueden acceder directamente.
-- El acceso ocurre únicamente desde las funciones Edge con service_role.
revoke all on public.company_secrets from anon, authenticated;


-- ============================================================
-- P0.2 · SEGURIDAD DE `members` (debe quedar AL FINAL del archivo)
-- Este bloque reemplaza las políticas permisivas que aparecen arriba
-- (`members_insert ... check (true)`). Mismo contenido que
-- supabase/migrations/20261126000001_members_seguridad.sql.
-- ============================================================

create or replace function public.is_company_admin(p_company text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.company_id = p_company and m.user_id = auth.uid()
      and upper(coalesce(m.role, '')) in ('OWNER', 'ADMIN')
  ) or exists (
    select 1 from public.superadmins s where s.user_id = auth.uid()
  );
$$;
grant execute on function public.is_company_admin(text) to authenticated;

create or replace function public.members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'members: no se puede cambiar de empresa' using errcode = '42501';
  end if;
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
create trigger members_guard_trg before update on public.members
  for each row execute function public.members_guard();

drop policy if exists members_insert on public.members;
create policy members_insert on public.members for insert to authenticated
with check (public.is_company_admin(company_id) and (user_id is null or user_id = auth.uid()));

drop policy if exists members_update on public.members;
create policy members_update on public.members for update to authenticated
using (
  public.is_company_admin(company_id)
  or (user_id is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
)
with check (
  public.is_company_admin(company_id)
  or (user_id = auth.uid() and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
);

drop policy if exists members_delete on public.members;
create policy members_delete on public.members for delete to authenticated
using (public.is_company_admin(company_id));

create or replace function public.bootstrap_company(company_name text, company_id text)
returns void language plpgsql security definer set search_path = public as $$
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
  if v_existe and not exists (
    select 1 from public.members m where m.company_id = company_id and m.user_id = v_uid
  ) then
    raise exception 'bootstrap_company: empresa no disponible' using errcode = '42501';
  end if;
  insert into public.companies (id, name)
    values (company_id, coalesce(nullif(trim(company_name), ''), 'Mi negocio'))
    on conflict (id) do nothing;
  insert into public.company_state (company_id, data, rev)
    values (company_id, '{}'::jsonb, 0) on conflict (company_id) do nothing;
  insert into public.members (user_id, company_id, role, email)
    values (v_uid, company_id, 'owner', auth.jwt() ->> 'email')
    on conflict (user_id, company_id) do nothing;
end;
$$;
revoke all on function public.bootstrap_company(text, text) from public, anon;
grant execute on function public.bootstrap_company(text, text) to authenticated;
