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
