-- ============================================================
-- Invitaciones de empleados por correo
-- Permite que el dueño agregue a un empleado con su correo, y que
-- el empleado entre a la MISMA empresa desde su propio celular.
-- Ejecutar en Supabase → SQL Editor. Es idempotente.
-- ============================================================

-- 1) Una invitación no tiene user_id todavía (se llena al aceptar)
alter table public.members alter column user_id drop not null;

-- 2) Helper: ¿soy dueño/admin de esta empresa? (o super-admin)
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

-- 3) Políticas de la tabla members
drop policy if exists members_select on public.members;
create policy members_select on public.members
for select to authenticated
using (
  user_id = auth.uid()
  or public.is_company_admin(company_id)
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

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
  or (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and user_id = auth.uid())
);

drop policy if exists members_delete on public.members;
create policy members_delete on public.members
for delete to authenticated
using (public.is_company_admin(company_id));

-- 4) Índice para buscar invitaciones por correo
create index if not exists members_email_idx on public.members (lower(email));

-- 5) Comprobación
select company_id, role, email, (user_id is null) as pendiente
from public.members
order by created_at;
