-- Planes: ZoCo Pro pasa a 2 sucursales (Esencial 1 · Pro 2 · Empresarial 10)
-- Ejecutar en Supabase → SQL Editor. Idempotente.

create or replace function public.plan_branch_limit(p_plan text)
returns integer language sql immutable as $$
  select case lower(coalesce(p_plan, 'pro'))
    when 'tiendita'    then 1
    when 'esencial'    then 1
    when 'negocio'     then 2
    when 'profesional' then 2
    when 'pro'         then 2
    when 'premium'     then 10
    when 'empresarial' then 10
    when 'cadenas'     then 10
    else 2
  end
$$;

-- El trigger ya usa esta función; no hay que recrearlo.
select 'plan_branch_limit' as objeto, public.plan_branch_limit('esencial') as valor
union all select 'pro', public.plan_branch_limit('pro')
union all select 'empresarial', public.plan_branch_limit('empresarial')
union all select 'legacy negocio', public.plan_branch_limit('negocio');
