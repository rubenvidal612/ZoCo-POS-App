# Conectar Supabase con GitHub (integraciones)

## Qué hace y qué NO hace

| Sí hace | No hace |
|---|---|
| Aplica los SQL de `supabase/migrations/` cuando haces push | **No** publica la app (eso es Vercel) |
| Lleva historial de cambios de base de datos | No copia tus datos ni usuarios |
| Permite ramas de base de datos (branching) | No reemplaza el SQL Editor para pruebas puntuales |

En otras palabras: sirve para **versionar el esquema**, no para desplegar ZoCo.

## ¿Es más fácil para arrancar?

No. Para el primer arranque es **más rápido pegar `supabase/setup-all.sql`** en el SQL Editor:
- Un solo paso
- Ves el resultado al instante
- Si algo falla, sabes qué línea
- No requiere dar permisos de GitHub

**Recomendado:** arrancar con el pegado manual y activar GitHub **después**, para los cambios futuros (planes, suscripciones, comisiones).

## Cómo activarlo (cuando quieras)

1. En el proyecto: **Project Settings → Integrations → GitHub → Connect**
2. Autoriza Supabase en GitHub y elige el repositorio `ZoCo-POS-App`
3. Directorio de trabajo: `supabase` (por defecto)
4. Rama de producción: `main`
5. Guardar

A partir de ahí:
- Push a `main` con un archivo nuevo en `supabase/migrations/` → se aplica solo
- Nombres con formato `YYYYMMDDHHMMSS_descripcion.sql`
- Los ya aplicados no se repiten

## Archivos ya preparados

```
supabase/
  setup-all.sql                        ← pegar una vez (instalación completa)
  migrations/
    20261117000001_init.sql            ← esquema + auth + RLS
    20261117000002_secrets.sql         ← company_secrets (llave IA cifrada)
  schema.sql / auth.sql / fix-rls.sql / secrets.sql   ← originales de referencia
```

Todo es **idempotente** (`if not exists`, `create or replace`, `drop policy if exists`), así que si la integración los reaplica no rompe nada.

## Precauciones

- La integración aplica **automáticamente** a producción: no subas SQL destructivo (`drop table`, `delete`) sin probarlo en una rama.
- Un `alter table` fallido puede dejar la migración a medias; revisa el log en **Integrations → GitHub → Recent runs**.
- Las migraciones **no** restauran datos: los respaldos son aparte (Database → Backups).

## Resumen práctico

| Momento | Qué usar |
|---|---|
| Hoy (instalar ZoCoPOS) | Pegar `setup-all.sql` |
| Cambios futuros (planes, comisiones) | GitHub integration + `migrations/` |
| Recuperar datos | Backups (Pro) |
| Publicar la app | Vercel |
