-- Modo gratuito de prueba: el trigger de sucursales no limita mientras
-- la empresa tenga settings.betaFree distinto de false (por defecto es libre).
-- Ejecutar en Supabase → SQL Editor.

create or replace function public.enforce_branch_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan  text;
  v_limit integer;
  v_new   integer;
  v_old   integer;
  v_free  boolean;
begin
  -- Modo gratuito: sin límites
  v_free := coalesce((new.data->'settings'->>'betaFree')::boolean, true);
  if v_free then
    return new;
  end if;

  select plan into v_plan from public.companies where id = new.company_id;
  v_limit := public.plan_branch_limit(v_plan);

  v_new := coalesce(jsonb_array_length(new.data->'branches'), 0);

  if tg_op = 'UPDATE' then
    v_old := coalesce(jsonb_array_length(old.data->'branches'), 0);
  else
    v_old := 0;
  end if;

  if v_new > v_limit and v_new > v_old then
    raise exception 'Tu plan permite % sucursal(es) y este cambio deja %.', v_limit, v_new
      using errcode = 'check_violation', hint = 'Cambia de plan para agregar más sucursales.';
  end if;

  return new;
end;
$$;

select 'trigger actualizado con modo gratuito' as resultado;
