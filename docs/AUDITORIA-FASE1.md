# Auditoría FASE 1 — ZoCo POS (noviembre 2026)

Repositorio: `rubenvidal612/ZoCo-POS-App` · commit auditado: `229ff84`
Alcance: código actual en `app/`, `api/`, `supabase/`, `tools/`. No se auditó `_legacy/` (ZoCo 2.13, solo referencia).

Método: lectura de código, conteo de funciones exportadas, búsqueda de capacidades por palabra clave, ejecución de la app en Chrome (CDP) y pruebas manuales de los flujos críticos.

---

## 1. Stack real

| Aspecto | Estado verificado |
|---|---|
| Frontend | JavaScript ES modules, sin build, sin framework |
| Líneas en `app/` | **10,733** (JS + HTML + CSS) |
| Dependencias npm | **0** |
| Pruebas automatizadas | **0** (los 170 archivos de test están en `_legacy/`, no aplican) |
| Backend local | `tools/serve.mjs` (Node, sin dependencias), puerto 4321 |
| Backend producción | Vercel estático + 1 función Edge (`api/ai.mjs`) |
| Base de datos | Supabase: `companies`, `company_state`, `members`, `superadmins` (18 policies RLS) |
| Persistencia | `localStorage` (`zoco.pos.v1`) + JSON por empresa en el servidor + Supabase |

**Conclusión de stack:** es sólido para un POS ligero y barato de operar, pero **el estado completo vive en un solo JSON** (ver Riesgo R1).

---

## 2. Módulos que SÍ existen y fueron verificados

### 2.1 Venta y caja
| Función | Estado | Evidencia |
|---|---|---|
| Carrito con tallas, descuentos, cupones | ✅ funciona | `store.js addLine/cartTotals/applyCoupon` |
| Pagos: efectivo, tarjeta, mixto, crédito cliente, cambio | ✅ | `commitSale` + `payments[]` |
| Cancelación con motivo y reposición de stock | ✅ probado | `cancelSale` |
| Apartados (layaways) con abonos | ✅ | `createLayaway`, `layawayPayment` |
| Caja: abrir/cerrar | ⚠️ parcial | `openRegister`, `closeRegister`, `registerSummary` |
| Corte Z formal (esperado vs contado, diferencia, folio) | ❌ **no existe** | `closeRegister` solo marca `open:false` |

### 2.2 Inventario
| Función | Estado | Evidencia |
|---|---|---|
| Stock por talla **y por sucursal** | ✅ | `branchStock[branch][size]` |
| Devolución parcial con reposición | ✅ probado hoy | `returnSale` + modal |
| Mermas y ajustes (+/−) con motivo | ✅ probado hoy | `registerAdjustment` |
| Traspaso entre sucursales | ✅ probado hoy | `transferStock` |
| Kardex por producto (saldo corrido, export) | ✅ probado hoy | `openKardex` |
| Recetas/producción (perfumería: consume ml y frascos) | ✅ probado hoy | `recipeNeeds`, `produceBatch`, `consumeRecipe` |
| Importación Excel/CSV con mapeo automático | ✅ | `xlsx.js`, `importer.js` |
| Lotes / caducidades | ❌ no existe | sin referencias |
| Números de serie / garantías | ❌ no existe | sin referencias |
| Variantes reales (talla+color+SKU por variante) | ❌ **no** | `color` es texto único; solo hay talla |
| Venta fraccionada (kg, g, L, ml, m) | ❌ **no** | `addLine` exige entero (`available < 1`, `qty += 1`) |

### 2.3 Operación
| Función | Estado |
|---|---|
| Impresión ESC/POS 58/80 mm + cola Windows + WiFi + respaldo navegador | ✅ probado |
| Escáner: pistola (keyboard wedge) y cámara (BarcodeDetector) | ✅ (cámara probada; BLE no soportado por diseño) |
| Checador con foto, PIN, biometría | ✅ |
| Nómina y comisiones por vendedor | ✅ |
| Metas (día/semana/mes/año) y estadísticas por vendedor | ✅ |
| Gastos y finanzas personales | ✅ |
| Catálogo público (6 temas, favoritos, WhatsApp) | ✅ |
| PWA + push (VAPID propio) | ✅ local; en Vercel el envío no funciona |
| Multiempresa + sucursales + 5 roles | ✅ (sucursales agregadas hoy) |
| Agente IA con 12 herramientas y **clave del cliente** | ✅ funcional; ver Riesgo R2 |

### 2.4 Nube
| Función | Estado |
|---|---|
| Registro/entrada con Supabase (correo, Google, magic link) | ✅ código; Google requiere configuración externa |
| Sync automático con JWT y RLS | ✅ **corregido hoy** (antes no subía nada) |
| Aislamiento entre empresas | ⚠️ sin pruebas automatizadas de penetración |

### 2.5 Afiliados
| Función | Estado |
|---|---|
| Código y link único por usuario | ✅ probado |
| Captura de `?ref=` y registro del referido | ✅ probado |
| Panel con resumen y lista | ✅ |
| Cálculo de comisión, estados de pago, ledger, desembolsos | ❌ **no existe** (solo un campo % sin uso) |

---

## 3. Giros comerciales

Existen **22 giros** y **~60 secciones** en `MODES`/`SECTIONS`.

**Hallazgo G1 — duplicidad funcional:** `cosmeticos` ("Cosméticos / perfumería") y `perfumeria` ("Perfumería / fragancias") cubren el mismo negocio con distinta mecánica. Hoy `perfumeria` tiene recetas y `cosmeticos` no. Deben unificarse: una sola experiencia con recetas **opcionales**.

**Hallazgo G2 — categoría comercial ≠ tipo de inventario:** hoy el "giro" define las secciones, y las secciones definen la rampa de tallas. Eso impide que una zapatería venda también perfumes por frasco o abarrotes a granel sin cambiar de giro (requisito explícito de las instrucciones).

**Hallazgo G3 — abarrotes:** el giro existe y tiene secciones (abarrotes, granel, bebidas, limpieza), pero **no puede vender a granel** porque la cantidad es entera. Sin fracciones, el giro no opera de verdad.

---

## 4. Riesgos

| # | Riesgo | Severidad | Detalle |
|---|---|---|---|
| R1 | **Estado monolítico** | Alta | Todo el negocio (productos+ventas+clientes+kardex) es un JSON que se sube completo a Supabase en cada cambio. Con 5,000 ventas el documento crece a varios MB: sync lento, costo de egress y riesgo de conflictos de escritura. Inviable para "cadenas". |
| R2 | **Clave de IA en claro** | Alta | `state.settings.aiKey` se guarda en localStorage, viaja en el JSON sincronizado y sale en el respaldo. Contradice la regla de no exponer secretos. Debe migrar a tabla cifrada server-side. |
| R3 | **Proxy de IA abierto** | Media | `/api/ai` y la función Edge aceptan cualquier clave y no limitan tasa ni origen. Puede usarse como proxy gratuito. |
| R4 | **Servidor local sin auth** | Media | `/api/print`, `/api/print-raw`, `/api/state` responden en LAN sin autenticación. En red compartida cualquiera puede leer/escribir el estado. |
| R5 | **Sin pruebas** | Alta | Cero tests y cero CI. Los cambios de hoy (sync, afiliados, sucursales) se validaron a mano. |
| R6 | **Sin migraciones versionadas** | Media | 3 archivos SQL sueltos (`schema.sql`, `auth.sql`, `fix-rls.sql`). Cambios de esquema no son reproducibles. |
| R7 | **Reportes incompletos** | Media | Reportes y corte no consideran devoluciones, mermas ni traspasos: el ingreso reportado puede no cuadrar con la caja. |
| R8 | **Cascarás HTML duplicadas** | Baja | `index`, `catalogo`, `chat`, `finanzas`, `gastos` repiten cabecera y lectura de estado. |
| R9 | **Planes inexistentes en código** | Media | No hay tabla de planes ni límites: el badge "PRO" es fijo. No se puede cobrar ni limitar. |
| R10 | **Afiliados sin dinero** | Media | No hay ledger, ni estados de pago, ni idempotencia de webhooks, ni política de reembolsos. |

---

## 5. Lo que falta para cumplir las instrucciones maestras

Ordenado por dependencia:

1. **Cantidades fraccionadas** (kg/g/L/ml/m) con precio por unidad de medida → habilita abarrotes a granel, carnicería, frutería, perfumería al ml.
2. **Tipo de inventario por producto** (`unit`, `variant`, `weight`, `recipe`, `serial`, `service`) independiente del giro → un negocio puede combinar motores.
3. **Variantes reales** (talla+color+SKU, código de barras por variante).
4. **Lotes y caducidad** (farmacia, abarrotes).
5. **Series y garantías** (electrónica, refaccionaria).
6. **Proveedores, compras y cuentas por pagar**.
7. **Servicios y citas** (barbería, restaurante).
8. **Corte Z** con esperado vs contado y diferencia.
9. **Reportes con devoluciones/mermas/traspasos** y utilidad real.
10. **Planes, límites y suscripciones** (tablas + cobro).
11. **Afiliados con ledger, comisiones y desembolsos**.
12. **Secretos cifrados** (clave IA por empresa, solo servidor).
13. **Pruebas automatizadas** de venta/stock/RLS/webhooks.
14. **Migraciones versionadas** y respaldos automáticos.

---

## 6. Propuesta de arquitectura (base para FASE 2)

### 6.1 Inventarios
Separar tres conceptos hoy mezclados:

```
giro (comercial)   →  define plantillas y ejemplos, NO la mecánica
categoría          →  agrupa productos para reportes
inventoryKind      →  mecánica real del producto:
    unit     → pieza, código de barras
    variant  → talla/color/modelo, SKU y stock por combinación
    weight   → kg/g/L/ml/m, precio por unidad
    recipe   → insumos + producción (perfumería, panadería)
    serial   → número de serie, garantía
    service  → sin stock, agenda opcional
```

Compatibilidad: los productos actuales se migran a `variant` (con `size`) o `unit` según su sección; nada se borra.

`qty` pasa a ser **número decimal** (hoy es entero) con `unit` (`pza`, `kg`, `ml`) y redondeo configurable. Impacto: `addLine`, `changeQty`, `cartTotals`, `commitSale`, `stockOf`, kardex y tickets.

### 6.2 Planes y afiliados (esquema propuesto)

```
plans(id, code, name, price_mxn, affiliate_commission_mxn, limits_json, active)
subscriptions(id, company_id, plan_id, status, period_start, period_end, gateway, gateway_ref)
payment_events(id, gateway, event_id UNIQUE, type, amount, currency, company_id, payload, processed_at)  -- idempotencia
affiliates(user_id, code, type[client|independent|distributor], status, payout_method)
referrals(id, affiliate_code, company_id UNIQUE, attributed_at, status)
commissions(id, subscription_id, payment_event_id UNIQUE, affiliate_id, plan_id, amount_mxn, period, status[pending|approved|paid|void])
payouts(id, affiliate_id, period, total_mxn, status, paid_at, reference)
```

Reglas clave:
- `payment_events.event_id` único → evita pagar dos veces por webhook repetido.
- `commissions.payment_event_id` único → una comisión por pago confirmado.
- Comisión solo si `subscriptions.status = active` y pago confirmado.
- Referido único por empresa (`referrals.company_id UNIQUE`) → nada de doble atribución.
- Auto-referidos bloqueados (`affiliates.user_id` vs dueño de la empresa).

### 6.3 Cobro en México (verificación requerida antes de implementar)
No se implementará nada de Mercado Pago hasta verificar en su documentación vigente:
1. Si **Split Payments** permite dividir un pago recurrente entre ZoCo y el afiliado.
2. Si las **suscripciones** (preapproval) pueden combinarse con split.
3. Requisitos regulatorios (cuentas conectadas, KYC, facturación).

Si no encaja, plan B sin transferencias manuales:
- **Ledger propio** de comisiones (`commissions` + `payouts`).
- Desembolso automático por **transferencia SPEI programada** vía agregador con API de disbursement, o **saldo interno** canjeable (crédito de suscripción).
- Conciliación diaria y auditoría de cada movimiento.

**Advertencia fiscal:** dividir el flujo no cambia la obligación de facturar y declarar el ingreso bruto. Requiere contador.

---

## 7. Plan de implementación (base para FASE 3)

| Fase | Alcance | Riesgo | Pruebas |
|---|---|---|---|
| P1 | Cantidades decimales + unidad de medida + precio por kg/ml | Medio (toca venta, stock, ticket) | venta 1.5 kg, stock, kardex, ticket |
| P2 | `inventoryKind` + variantes (talla+color+SKU) | Medio | producto con 2 variantes, venta y stock por variante |
| P3 | Lotes/caducidad + series/garantías | Bajo | alerta de caducidad, venta con serie |
| P4 | Proveedores, compras, cuentas por pagar | Bajo | compra suma stock y genera CxP |
| P5 | Corte Z + reportes con devoluciones/mermas/traspasos | Bajo | cuadre de caja del día |
| P6 | Secretos cifrados (clave IA server-side) | Medio | clave no visible en estado ni respaldo |
| P7 | Planes, límites y suscripciones (sin cobro) | Medio | candados por plan |
| P8 | Afiliados: ledger, comisiones, estados | Medio | pago genera comisión única |
| P9 | Pasarela de cobro + webhooks idempotentes | Alto | sandbox, reintentos, reembolsos |
| P10 | Pruebas automatizadas + CI + migraciones | Bajo | suite mínima |

Cada fase entrega migración compatible y pruebas; ninguna activa cobros reales sin autorización explícita.

---

## 8. Qué NO se afirma

- No hay cobro ni suscripciones implementadas: solo existe el modelo de datos propuesto.
- No hay pagos a afiliados: solo registro de referidos.
- No hay lotes, series, proveedores, citas ni venta fraccionada.
- Google OAuth no está configurado (requiere Google Cloud + Supabase, pasos manuales del dueño).
- El push en Vercel no envía notificaciones (sin servidor persistente).
