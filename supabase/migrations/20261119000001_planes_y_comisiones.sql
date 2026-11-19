-- Planes (3) + comisiones de afiliados
-- Ejecutar UNA vez en Supabase → SQL Editor. Es idempotente.

-- ============================================================
-- 1. Límite de sucursales por plan, aplicado en la base
-- ============================================================
create or replace function public.plan_branch_limit(p_plan text)
returns integer language sql immutable as $$
  select case lower(coalesce(p_plan, 'pro'))
    when 'tiendita'    then 1
    when 'esencial'    then 1
    when 'negocio'     then 3
    when 'profesional' then 3
    when 'pro'         then 3
    when 'premium'     then 10
    when 'empresarial' then 10
    when 'cadenas'     then 10
    else 3
  end
$$;

create or replace function public.enforce_branch_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan  text;
  v_limit integer;
  v_new   integer;
  v_old   integer;
begin
  select plan into v_plan from public.companies where id = new.company_id;
  v_limit := public.plan_branch_limit(v_plan);

  v_new := coalesce(jsonb_array_length(new.data->'branches'), 0);

  if tg_op = 'UPDATE' then
    v_old := coalesce(jsonb_array_length(old.data->'branches'), 0);
  else
    v_old := 0;
  end if;

  -- Solo bloquea sucursales NUEVAS. Las empresas que ya exceden el límite
  -- pueden seguir guardando (no se borra nada) hasta que agreguen otra.
  if v_new > v_limit and v_new > v_old then
    raise exception 'Tu plan permite % sucursal(es) y este cambio deja %.', v_limit, v_new
      using errcode = 'check_violation', hint = 'Cambia de plan para agregar más sucursales.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_branch_limit on public.company_state;
create trigger trg_enforce_branch_limit
  before insert or update on public.company_state
  for each row execute function public.enforce_branch_limit();

-- ============================================================
-- 2. Comisiones: lectura y administración (solo superadmin)
-- ============================================================
create or replace function public.admin_company_commissions()
returns table (company_id text, company_name text, plan text, commissions jsonb)
language sql stable security definer set search_path = public as $$
  select cs.company_id,
         coalesce(c.name, cs.company_id),
         coalesce(c.plan, 'pro'),
         coalesce(cs.data->'commissions', '[]'::jsonb)
  from public.company_state cs
  left join public.companies c on c.id = cs.company_id
  where public.is_superadmin()
  order by c.name nulls last
$$;

create or replace function public.admin_set_commission(
  p_company text, p_commission text, p_status text
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then
    raise exception 'no autorizado' using errcode = 'insufficient_privilege';
  end if;
  if p_status not in ('pending', 'approved', 'paid', 'refunded') then
    raise exception 'estado inválido: %', p_status using errcode = 'check_violation';
  end if;

  update public.company_state cs
  set data = jsonb_set(
      cs.data,
      '{commissions}',
      coalesce((
        select jsonb_agg(
          case when (e->>'id') = p_commission
            then e || jsonb_build_object('status', p_status, 'updatedAt', to_jsonb(now()))
            else e
          end
        )
        from jsonb_array_elements(coalesce(cs.data->'commissions', '[]'::jsonb)) e
      ), '[]'::jsonb),
      true)
  where cs.company_id = p_company;

  return true;
end;
$$;

grant execute on function public.admin_company_commissions() to authenticated;
grant execute on function public.admin_set_commission(text, text, text) to authenticated;

-- ============================================================
-- 3. Comprobación rápida
-- ============================================================
select 'plan_branch_limit' as objeto, public.plan_branch_limit('esencial') as valor
union all select 'pro', public.plan_branch_limit('pro')
union all select 'empresarial', public.plan_branch_limit('empresarial')
union all select 'legacy profesional', public.plan_branch_limit('profesional');
