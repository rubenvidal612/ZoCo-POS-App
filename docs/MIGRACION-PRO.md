# Migración a la organización PRO (RAMBER Tunes)

> **ACTUALIZACIÓN (17 nov 2026):** para mover un proyecto existente ya NO uses respaldo/restauración.
> Supabase tiene **Transfer Project**: Project Settings → General → Transfer project.
> Conserva URL, llaves, usuarios de Auth y Storage, y no requiere cambios de código.
> Requisitos: ser owner de la org origen, ser member de la destino, sin GitHub integration activa,
> sin project-scoped roles (Team/Enterprise) ni log drains.
> El respaldo/restauración queda solo como plan B.
Objetivo: **todos los proyectos en Pro pagando una sola organización**.
Destino: **RAMBER Tunes** (`byhtaxoqjfetrwjwxsy`).
Origen a vaciar: **Ruben Nuevos** (contiene Rulu).

> Supabase **no permite mover** un proyecto entre organizaciones. Se copia con respaldo y se apunta la app al nuevo.

---

## A. ZoCo POS (nuevo, en RAMBER Tunes)

1. Dashboard → organización **RAMBER Tunes** → **New project**
   - Nombre: `ZoCoPOS`
   - Región: `us-west-2` (o `us-east-1`, la más cercana)
   - Guarda la contraseña de la base
2. Cuando esté listo: **SQL Editor → New query** → pegar **`supabase/setup-all.sql`** (un solo bloque, 232 líneas) → **Run**
   - Crea: `companies`, `company_state`, `members`, `superadmins`, `company_secrets`, funciones `is_member()` / `is_owner()` y todas las políticas RLS.
3. Copiar de **Project Settings → API**:
   - `Project URL`
   - `anon` / `publishable key`
   - `service_role` (solo para variables de Vercel)
4. Pasarme esos 3 valores para:
   - actualizar `app/js/config.js`
   - configurar variables en Vercel (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ZOCO_KEK`)
5. En la app: **Nube → Crear cuenta** con tu correo (el proyecto nuevo no tiene usuarios) → se crea la empresa y la membresía → **Sincronizar ahora** sube tu estado actual.

**Los datos no se pierden:** productos, ventas, clientes y sucursales viven en tu equipo (`localStorage`) y en el proyecto viejo; al vincularte al nuevo se suben otra vez.

---

## B. Rulu (copiar desde Ruben Nuevos)

1. Abrir el proyecto **Rulu** (org Ruben Nuevos)
2. **Database → Backups** → respaldo más reciente → menú **⋯ → “Restore to new project”**
3. Nombre `Rulu`, **Organization: RAMBER Tunes**
4. Esperar la restauración (incluye Auth y datos)
5. Copiar las llaves del proyecto nuevo y **repuntar la app de Rulu** (URL + anon key; si usa service_role o webhooks, también)
6. Probar login y datos

**Si no aparece “Restore to new project”:**
```bash
# descargar respaldo desde el dashboard y restaurar en el proyecto nuevo
psql "postgresql://postgres:<PASS>@db.<NUEVO_REF>.supabase.co:5432/postgres" -f respaldo.sql
```
(o usar `pg_dump` del viejo: `pg_dump --no-owner --no-acl -Fc "$OLD_DB_URL" > rulu.dump` y `pg_restore -d "$NEW_DB_URL" rulu.dump`)

---

## C. Cerrar Ruben Nuevos

Solo cuando Rulu ya esté funcionando en RAMBER Tunes y verificado 2–3 días:

1. `https://supabase.com/dashboard/org/nwzkffcxarnocwtxruyw/settings/billing`
2. **Downgrade to Free**
3. Borrar el proyecto viejo (o dejarlo pausado sin uso)

Resultado: **1 organización Pro ($25/mes)** en lugar de 2.

---

## D. Costos a vigilar

| Concepto | Detalle |
|---|---|
| Plan Pro | $25/mes por organización (una sola) |
| Cómputo | Cada proyecto gasta su instancia. El plan incluye ~$10 de crédito; con 4–5 proyectos puede sumar |
| Backups | Incluidos en Pro (7 días) |
| Free | 500 MB, sin respaldos, pausa a los 7 días sin uso |

---

## E. Checklist final

- [ ] Proyecto `ZoCoPOS` creado en RAMBER Tunes
- [ ] `setup-all.sql` ejecutado sin errores
- [ ] `config.js` y Vercel actualizados con las llaves nuevas
- [ ] Cuenta creada en la app y estado sincronizado
- [ ] Rulu restaurado en RAMBER Tunes y app repuntada
- [ ] Ruben Nuevos bajado a Free
- [ ] Verificar que ZoCo y Rulu siguen funcionando
