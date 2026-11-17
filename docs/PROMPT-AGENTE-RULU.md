# Prompt para el agente de Rulu

Copia lo que está entre las líneas y pégalo en la sesión del agente que trabaja en `C:\CRM`.

---

## Contexto

Estamos consolidando las organizaciones de Supabase en una sola (plan Pro) para dejar de pagar dos suscripciones.

- Organización destino: **RAMBER Tunes** (`byhtaxoqjfetrwjwxsy`)
- Proyecto: `vvjzrrowwpyrplvipdto` (app `centro-atencion` en `C:\CRM`)
- Método elegido: **Transfer Project** (Settings → General → Transfer project)

**Por qué este método:** mantiene el mismo `project ref`, la misma URL y las mismas llaves (`anon`, `service_role`), conserva usuarios de Auth y Storage, y **no requiere cambios de código**.

## Lo que debes hacer

1. **NO cambies nada de código ni de variables** todavía. El `project ref` no cambia, así que `.env.local` y `vercel.env` siguen válidos.

2. Cuando el dueño confirme que el proyecto ya fue transferido, **verifica**:
   - `pnpm build` compila
   - Login con un usuario existente funciona (Auth intacto)
   - Lectura/escritura en Supabase: crear y borrar un registro de prueba
   - Sin errores `401` / `permission denied` en consola
   - Storage: subir y leer un archivo
   - Push notifications (VAPID no cambia)

3. **Reporta** al dueño:
   - Resultado de cada verificación (ok / falla)
   - Si alguna tabla o usuario no aparece
   - Si hace falta tocar Vercel (no debería)

## Reglas

- **Nunca** subas `.env.local`, llaves ni `service_role` al repositorio ni al chat.
- No ejecutes migraciones (`supabase/migrations/0001..0009`): el esquema ya existe.
- No borres ni reinicies nada en el proyecto; si algo falla, para y reporta.
- No cambies `PHONE_ENCRYPTION_KEY` ni `PHONE_HMAC_KEY` (rompería los teléfonos cifrados).

## Si el transfer no se puede hacer

Solo en ese caso se usa el plan B: **Database → Backups → Restore to new project** en RAMBER Tunes, y ahí sí hay que actualizar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` y en Vercel.

---
