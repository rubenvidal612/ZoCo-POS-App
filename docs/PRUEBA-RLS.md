# Prueba de RLS: ¿puede un usuario entrar a la empresa de otro?

Checklist para verificar en el proyecto real de Supabase que el parche **P0.2** funciona. Son 6 pruebas: 3 "de ataque" (deben fallar) y 3 "de operación" (deben funcionar).

## 0. Antes de empezar

1. Ejecuta en **SQL Editor**:
   ```
   supabase/migrations/20261126000001_members_seguridad.sql
   ```
   Debe terminar sin errores y devolver 2 filas (las políticas `members_insert` y `members_update`).
   Si tu proyecto se creó con `setup-all.sql`, vuelve a correrlo entero: el bloque de seguridad va al final y reemplaza las políticas viejas.

2. Ten a mano **dos usuarios reales** (`A` = dueño de la empresa víctima, `B` = atacante con su propia empresa) y sus UUID (`Authentication → Users`).

3. En el SQL Editor, simula a `B` al inicio de cada prueba:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<UUID_B>","email":"b@ejemplo.com","role":"authenticated"}';
```

> El SQL Editor corre como `postgres` y **no** aplica RLS por defecto: sin el `set local role authenticated` las pruebas no sirven. Para volver al modo administrador: `reset role;`.

---

## 1. Ataques que deben fallar

### 1.1 Insertarse como owner de otra empresa
```sql
insert into public.members (user_id, company_id, role, email)
values ('<UUID_B>', '<EMPRESA_A>', 'owner', 'b@ejemplo.com');
```
**Esperado:** `new row violates row-level security policy for table "members"` (42501).
**Antes del parche:** se insertaba sin error → B entraba a la empresa A.

### 1.2 Mover mi propia membresía a la empresa de la víctima
```sql
update public.members set company_id = '<EMPRESA_A>'
where user_id = '<UUID_B>' and company_id = '<EMPRESA_B>';
```
**Esperado:** `members: no se puede cambiar de empresa` (42501), lanzado por el trigger.
**Antes:** B quedaba como owner de A (el `with check` solo miraba el correo).

### 1.3 Bootstrapear una empresa ajena
```sql
select public.bootstrap_company('Empresa robada', '<EMPRESA_A>');
```
**Esperado:** `bootstrap_company: empresa no disponible` (42501).
**Antes:** creaba la membresía de owner y devolvía éxito.

### 1.4 (Extra) Robar el rol sin ser admin
```sql
update public.members set role = 'owner' where user_id = '<UUID_B>';
```
**Esperado:** `members: solo un administrador cambia el rol` (42501).

---

## 2. Operaciones que deben seguir funcionando

### 2.1 Invitar a un empleado (como A, dueño)
```sql
insert into public.members (user_id, company_id, role, email)
values (null, '<EMPRESA_A>', 'CASHIER', 'empleado@ejemplo.com');
```
**Esperado:** inserta sin error (`user_id` nulo = invitación pendiente).

### 2.2 Que el invitado reclame su invitación (como el empleado)
```sql
update public.members set user_id = '<UUID_EMPLEADO>'
where user_id is null and lower(email) = 'empleado@ejemplo.com';
```
**Esperado:** 1 fila actualizada (el trigger permite `null → auth.uid()`).

### 2.3 Que el dueño cambie el rol de su empleado
```sql
update public.members set role = 'ADMIN'
where company_id = '<EMPRESA_A>' and email = 'empleado@ejemplo.com';
```
**Esperado:** 1 fila (el dueño sí puede).

> En la app: **Usuarios → Invitar** y luego entrar con esa cuenta. Si la invitación no se reclama al iniciar sesión, revisa `claimInvites` en `app/js/auth.js`.

---

## 3. Comprobación de que no quedaron políticas viejas

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'members'
order by policyname;
```

Debe haber **cuatro** políticas: `members_select`, `members_insert`, `members_update`, `members_delete`, y ninguna con `with_check = true`.

```sql
select tgname, tgenabled from pg_trigger where tgrelid = 'public.members'::regclass and not tgisinternal;
```
Debe aparecer `members_guard_trg`.

---

## 4. Si algo falla

| Síntoma | Causa probable |
|---|---|
| `permission denied for function is_company_admin` | Falta `grant execute ... to authenticated` (lo hace la migración). |
| `column "role" does not exist` | Estás corriendo contra un esquema viejo: aplica primero `20261117000001_init.sql`. |
| El ataque 1.1 sigue funcionando | Quedó la política vieja `members_insert ... check (true)`: revisa el orden y vuelve a correr el parche (es idempotente). |
| El invitado no puede reclamar | Su JWT no trae `email`, o el correo de la invitación no coincide exactamente. |
