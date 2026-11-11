# Desplegar en Vercel + Supabase (modo híbrido)

## 1. Supabase (5 min)
1. Crea el proyecto en https://supabase.com (plan gratis)
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql`
3. **Project Settings → API**: copia `Project URL` y `anon public key`

## 2. Vercel (3 min)
1. Importa el repo `ZoCo-POS-App` en https://vercel.com/new
2. Framework: **Other** · Output directory: `app`
3. Deploy. La URL queda tipo `https://zoco-pos-app.vercel.app`

## 3. Conectar la app
En tu ZoCo → **Configuración → Nube (Supabase)**:
- Pega la URL y la anon key → **Guardar** → **Probar conexión** → **Sincronizar ahora**

Listo: la app sigue funcionando offline y sube los cambios cuando hay internet.

## Qué funciona en Vercel y qué no
| Función | Vercel |
|---|---|
| App, PWA, offline | ✅ |
| Asistente IA (`/api/ai`) | ✅ (Edge Function) |
| Sincronización Supabase | ✅ |
| Impresión WiFi (TCP 9100) | ❌ necesita servidor local o PC con `serve.mjs` |
| Push (envío) | ❌ requiere servidor o Edge Function con llaves VAPID |

## Recomendación
- **Vercel** para el día a día y clientes sin impresora de red.
- **Servidor local** (`node tools/serve.mjs`) en tiendas con impresora WiFi o checador.
- Ambos pueden apuntar a la **misma** base de Supabase.

## 4. Login en la nube y panel maestro
1. Ejecuta `supabase/auth.sql` en el SQL Editor.
2. **Authentication → Providers → Email**: desactiva "Confirm email" para pruebas.
3. Regístrate en la app con el botón **☁ Entrar con cuenta en la nube**.
4. Hazte super-admin (una vez):
```sql
insert into superadmins (user_id, email)
select id, email from auth.users where email = 'TU_CORREO'
on conflict (user_id) do nothing;
```
5. Recarga: aparece **🛡 Panel maestro** en el menú (empresas, usuarios, tamaño, activar/suspender).

## Notas
- El login local (demo) sigue funcionando aunque no haya Supabase.
- El botón ☁ solo aparece si Supabase está configurado.
- El panel maestro no se ve si tu cuenta no está en `superadmins`.
