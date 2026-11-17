# Prompt para el agente de Rulu

Copia todo lo que está entre las líneas y pégalo en la sesión del agente que trabaja en `C:\CRM`.

---

## Contexto

Estamos consolidando todas las organizaciones de Supabase en una sola (plan Pro) para dejar de pagar dos suscripciones.

- Organización destino: **RAMBER Tunes** (`byhtaxoqjfetrwjwxsy`)
- Proyecto viejo de esta app: `vvjzrrowwpyrplvipdto` (organización **Ruben Nuevos**)
- Proyecto nuevo: lo está creando el dueño en RAMBER Tunes restaurando el respaldo del viejo
- App: `C:\CRM` (`centro-atencion`, Next.js + Supabase)

**No hagas nada hasta que el dueño te confirme el nuevo `Project URL` y las llaves.**

## Lo que debes hacer cuando te pasen las llaves

1. **Actualiza `C:\CRM\.env.local`** (es local, no se commitea):
   - `NEXT_PUBLIC_SUPABASE_URL` → nueva URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → nueva anon key
   - `SUPABASE_SERVICE_ROLE_KEY` → nueva service_role
   - **Conserva igual**: `PHONE_ENCRYPTION_KEY`, `PHONE_HMAC_KEY`, `SESSION_SECRET`, `VAPID_*`, `LUCIANA_*`, `NEXT_PUBLIC_APP_URL`
     (si cambias `PHONE_ENCRYPTION_KEY` o `PHONE_HMAC_KEY`, los teléfonos ya cifrados quedan ilegibles)

2. **Actualiza `C:\CRM\vercel.env`** si ese archivo es la referencia de producción, y avisa al dueño qué variables debe cambiar en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Las demás no cambian

3. **NO ejecutes las migraciones** de `supabase/migrations/0001..0009`: el respaldo restaurado ya trae el esquema y los datos. Volver a correrlas puede fallar o duplicar objetos. Solo confirma que existen las tablas.

4. **Verifica y reporta**:
   - `pnpm build` compila sin errores
   - Login funciona con un usuario existente (los usuarios vienen en el respaldo)
   - Lectura/escritura de datos: crear y borrar un registro de prueba
   - Sin errores de RLS en consola (`401` / `permission denied`)
   - Los archivos/subidas (si usa Storage) siguen accesibles

5. **Reporta al dueño**:
   - URL nueva y confirmación de que todo funciona
   - Qué variables faltan cambiar en Vercel
   - Cualquier diferencia encontrada (tablas vacías, usuarios sin contraseña, etc.)

## Reglas

- **Nunca** subas `.env.local`, llaves ni `service_role` al repositorio ni al chat.
- No borres ni modifiques el proyecto viejo: el dueño lo apagará después de verificar 2–3 días.
- No cambies el esquema ni borres datos durante la migración.
- Si algo falla, para y reporta; no improvises migraciones ni restauraciones parciales.

## Datos útiles

- Migraciones existentes: `0001_init.sql` … `0009_quick_replies_panel.sql`
- Variables actuales de `.env.local` (nombres): `PHONE_ENCRYPTION_KEY`, `PHONE_HMAC_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `LUCIANA_API_URL`, `LUCIANA_API_KEY`
- El proyecto viejo está en la organización **Ruben Nuevos**; el nuevo en **RAMBER Tunes**

---
