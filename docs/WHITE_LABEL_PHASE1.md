# ZoCo · marca blanca (fase 1, diseño técnico)

Estado: **preparación, NO habilitado para clientes**. No cambia precios ni cobros existentes (149/295/499 MXN).

## Objetivo
Un revendedor ofrece ZoCo bajo su marca, fija el precio de su suscripción y administra sus clientes. ZoCo cobra por **licencia de negocio activo**, no por usuario ni por categoría de producto. Un negocio puede tener varias categorías (zapatería + ropa + joyería) sin generar otra licencia; otra empresa independiente sí genera otra licencia. Las sucursales de una misma empresa siguen las reglas del plan contratado.

## Modelo de datos propuesto (sin ejecutar migraciones)
- `reseller_accounts`: id UUID, owner_user_id UUID, slug único, display_name, status (pending/active/suspended), support_email, created_at.
- `reseller_branding`: reseller_id único, logo_url, primary_color, display_name, public_domain opcional, updated_at. Logos en bucket privado/público con validación de tipo y tamaño; dominio propio solo tras verificar propiedad.
- `reseller_members`: reseller_id, user_id, role (owner/admin/support), único(reseller_id,user_id).
- `reseller_clients`: reseller_id, company_id, linked_at, status. **company_id único globalmente** para evitar que un negocio pertenezca a dos revendedores; permitir null para clientes directos de ZoCo.
- `reseller_offers`: reseller_id, plan_code, customer_price_mxn, active, unique(reseller_id,plan_code). No se permiten precios negativos; precio mínimo configurable por política, nunca hardcodear tarifa de ejemplo.
- `reseller_licenses`: company_id único, reseller_id, plan_code, license_status, activated_at, expires_at; registro por negocio, no por giro/categoría.
- `reseller_billing_ledger`: id, reseller_id, company_id, period_start, period_end, amount_mxn, status, provider_event_id único, created_at. Eventos de pago idempotentes.

## Seguridad obligatoria
1. RLS activado en todas las tablas; revendedor solo ve filas asociadas a su reseller_id y miembros autorizados.
2. Los datos operativos de `company_state`, `members`, ventas e inventario continúan aislados por `company_id`; un revendedor **no obtiene acceso automático a ventas ni datos personales de clientes**.
3. Operaciones de cobro, cambios de propietario, alta/baja de licencia y cambio de asociación solo por backend autenticado con autorización explícita; nunca desde el navegador con credenciales de servicio.
4. El superadministrador ZoCo puede auditar la relación comercial, con trazabilidad de cambios. Evitar políticas RLS recursivas.
5. Verificar dominios y aislar sesiones/cookies entre marcas; ninguna personalización puede alterar autenticación, términos o seguridad.

## Fases
1. **Cimientos**: migración revisada, asociación reseller→empresa, roles/RLS, feature flag desactivado, pruebas de aislamiento.
2. **Marca ligera**: panel de revendedor, logo/nombre/color, página de ventas, precios configurables, alta de clientes, vista de licencias.
3. **Cobros**: integrar proveedor oficial, webhooks verificados, conciliación, facturación, comisiones y suspensión con periodo de gracia.
4. **Marca completa**: dominio personalizado validado, correos y soporte por marca, reportes y automatización.

## Reglas comerciales pendientes de aprobación
- Tarifa mayorista por plan y negocio activo (los $199 MXN mencionados eran solo un ejemplo, NO una tarifa aprobada).
- Quién factura/cobra al consumidor final, impuestos, reembolsos, contracargos y soporte.
- Qué ocurre si un revendedor deja de pagar: proteger acceso a datos y exportación del cliente final.
- Política de precio mínimo, descuentos, renovación y migración de clientes entre revendedores.

## Criterios de aceptación de la fase 1
- Un revendedor A no puede listar ni modificar clientes, licencias o marcas de B, ni mediante API directa.
- Ningún revendedor puede leer `company_state` de un negocio por el solo hecho de revenderle.
- Un mismo `company_id` no puede asociarse a dos revendedores simultáneamente.
- Agregar ropa o joyería a una zapatería existente no genera nueva licencia.
- No cambia el flujo actual de suscripción de clientes directos.
- La función está oculta para clientes hasta pasar pruebas de RLS, pagos y aislamiento.
