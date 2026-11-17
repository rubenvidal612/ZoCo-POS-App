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
