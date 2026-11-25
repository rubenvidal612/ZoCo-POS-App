-- ZoCo Beauty appointments. Separate, private data; no public direct table access.
create table if not exists public.beauty_appointments (
 id uuid primary key default gen_random_uuid(),
 company_id text not null references public.companies(id) on delete cascade,
 branch_id text not null,
 professional_id text not null,
 professional_name text not null,
 service_id text not null,
 service_name text not null,
 price numeric(12,2) not null check (price >= 0),
 commission_type text not null default 'pct' check (commission_type in ('pct','fixed')),
 commission_value numeric(12,2) not null default 0 check (commission_value >= 0),
 duration_minutes integer not null check (duration_minutes between 15 and 480),
 start_at timestamptz not null,
 end_at timestamptz not null,
 customer_name text not null,
 customer_phone text not null,
 notes text not null default '',
 status text not null default 'requested' check (status in ('requested','confirmed','cancelled','completed')),
 source text not null default 'web' check (source in ('web','staff','assistant')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (end_at > start_at)
);
create index if not exists beauty_appointments_company_start on public.beauty_appointments(company_id, start_at desc);
create index if not exists beauty_appointments_staff_date on public.beauty_appointments(company_id, professional_id, start_at);
alter table public.beauty_appointments enable row level security;
-- Only the authenticated business members may read reservations.
drop policy if exists beauty_appointments_members_read on public.beauty_appointments;
create policy beauty_appointments_members_read on public.beauty_appointments for select to authenticated
 using (public.is_member(company_id));
-- All writes go through the server endpoint using the service role after validation.
revoke all on public.beauty_appointments from anon;
revoke insert, update, delete on public.beauty_appointments from authenticated;
grant select on public.beauty_appointments to authenticated;

-- Evita reservas solapadas incluso cuando dos clientes solicitan a la vez.
-- La base de datos es la autoridad final sobre disponibilidad.
create extension if not exists btree_gist;
alter table public.beauty_appointments
  add constraint beauty_no_overlapping_active exclude using gist (
    company_id with =,
    branch_id with =,
    professional_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('requested','confirmed'));
