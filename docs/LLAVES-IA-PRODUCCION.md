# Activar llaves de IA cifradas en producción (Vercel + Supabase)

Objetivo: que la llave de IA de cada empresa viva **cifrada en la base de datos** y solo las funciones del servidor la usen. El navegador nunca la recibe.

## 1. Crear la tabla (una vez)

Supabase → **SQL Editor** → pega y ejecuta `supabase/secrets.sql`.

Crea `public.company_secrets` con RLS activo y **sin políticas**, así que ni la llave pública ni un usuario normal pueden leerla. Solo el `service_role` (usado por las funciones Edge) accede.

## 2. Generar la clave de cifrado (una vez)

En tu computadora, con Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Guarda ese valor: es la **ZOCO_KEK**. No lo subas a GitHub. Si lo pierdes, las llaves guardadas dejan de poder descifrarse (habría que volver a capturarlas).

## 3. Variables de entorno en Vercel

Proyecto `zoco-pos` → **Settings → Environment Variables** (Production y Preview):

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://psrebgxqzwkvlmoucaqq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → **service_role** (secreta) |
| `ZOCO_KEK` | el base64 del paso 2 |

Luego **Redeploy**.

> La `service_role` da acceso total: nunca debe ir en el frontend ni en el repositorio.

## 4. Cómo queda el flujo

1. El dueño entra a **Configuración → Agente IA**, pega su llave y guarda.
2. El navegador la manda a `POST /api/secret` con su token de sesión.
3. La función valida sesión + membresía de la empresa, cifra con AES-256-GCM y guarda en `company_secrets`.
4. Al usar el asistente, el navegador llama `/api/ai` **sin llave**; la función la busca, descifra y la usa.
5. `GET /api/secret` solo responde `hasKey: true/false` y el proveedor.

## 5. Verificación

- Guarda una llave y revisa que `localStorage` **no** la contenga.
- En Supabase, `select * from company_secrets;` debe mostrar solo texto cifrado.
- Borra la llave desde la app: la fila desaparece.

## 6. Sin configurar

Si faltan variables, `/api/secret` responde con un error claro y la app funciona como antes (llave solo en este dispositivo). Nada se rompe.
