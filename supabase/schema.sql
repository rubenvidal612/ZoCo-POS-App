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
