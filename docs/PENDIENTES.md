# Brief para continuar ZoCo POS

Copia y pega esto en otra sesión (o pásale este archivo).

---

Trabajas en **ZoCo POS**, un punto de venta para tiendas: JavaScript puro con ES modules, **sin build y sin dependencias**, servidor Node mínimo.

- Repo: `rubenvidal612/ZoCo-POS-App` (rama `main`, versión **2.92.2**).
- Arranque: `node tools/serve.mjs` → http://localhost:4321 (demo sin registro en `/demo.html`).
- Pruebas: `npm test` (usa `node --test test/*.test.mjs`). **Debe quedar en verde siempre.**
- Estado de una empresa: `localStorage` (`zoco.pos.v1`) + JSON en `data/` + Supabase (`company_state`).
- Documentos de contexto: `docs/AUDITORIA-FASE2.md` (46 hallazgos y plan P0-P3), `docs/PRUEBA-RLS.md`.

## Ya está hecho (no lo repitas)

| ID | Qué | Dónde |
|---|---|---|
| P0.1 | Corte de caja correcto: el efectivo no se cuenta dos veces y solo suma el turno abierto | `app/js/cash.js`, `app/js/store.js` |
| P0.2 | Seguridad de `members`: trigger + políticas + `bootstrap_company` sin empresas ajenas | `supabase/migrations/20261126000001_members_seguridad.sql` |
| P0.4 | TLS seguro por defecto (`ZOCO_INSECURE_TLS=1` opt-in) y `/%zz` ya no tumba el servidor | `tools/serve.mjs` |
| P0.5 | Proxy de IA con allowlist de destinos, sin `baseUrl` libre, rate limit 30/min | `api/ai-hosts.mjs`, `api/ai.mjs`, `tools/serve.mjs` |

## Pendiente, por orden

**P0.3 (bloqueado por decisión del dueño).** Autenticar `/api/state`, `/api/print`, `/api/print-raw` y `/api/secret`, y decidir si el servidor sigue escuchando en `0.0.0.0` (uso desde celulares en la LAN) o solo en `127.0.0.1`. **No lo implementes sin que lo confirme**, porque cambia cómo se usa la app en la tienda.

**P1 — dinero y stock (2-3 días).** Cada uno con prueba de regresión.

1. `returnSale` reembolsa `price * qty` ignorando el descuento de la venta; prorratear y topar `refunded ≤ sale.total` (`store.js`, ~1437).
2. `cancelSale` repone stock de líneas que nunca se descontaron (servicios, `prepararAlVender`, recetas): reponer solo lo descontado y bloquear cancelación si hubo devolución (`store.js`, ~1710).
3. Pago dividido con `credit_sale`: hoy carga `t.total` completo al cliente; sumar solo la parte a crédito y revertirla al cancelar/devolver (`store.js`, ~1694).
4. `cartTotals` sin `round2` rompe ventas por kg; y el cupón se acumula en `cart.discount` (doble toque = doble descuento) (`store.js` ~1540, `views-pos.js` ~497).
5. Producto de talla única con colores se agrega sin color → stock 0 (`views-pos.js` ~298).
6. Sync sin bloqueo optimista: dos cajas escriben desde el mismo `rev` y se pierden ventas. Update condicional por `rev` + merge (`sync.js` ~62-72).
7. Sacar `users[].pin/pass` del estado sincronizado.
8. Importador: reimportar sin columna de cantidad deja el stock en 0, y sin SKU duplica productos (`importer.js` ~127, ~146).
9. Food service: `closeOrder` cobra el total ignorando las partes ya cobradas (`views-food-service.js` ~159).
10. Compras: recepción sin talla mete todo en la primera, y la deuda ignora `creditApplied` (`views-purchases.js` ~239, ~63).
11. XSS con el nombre de usuario en `innerHTML` (`app.js` ~363, ~393).

**P2 — robustez (1 semana).** CI con ≥30 casos y regresión de lo anterior; `setup-all.sql` generado desde las migraciones; ventas fuera del JSON (IndexedDB) y detección de cuota; reportes con devoluciones/mermas/traspasos; apartados que generan venta al liquidar; folios sin reinicio; PWA offline con precache completo; impresión ESC/POS con code page y estado real; kardex por sucursal paginado; `Enter` del escáner en `#pos-q`.

**P3 — producto comercial.** Cobro real con webhooks idempotentes, ledger de comisiones y `payouts` (hoy no existen), permisos finos por rol.

## Reglas de trabajo

- **Sin dependencias nuevas** en la app (el `package.json` existe solo para `npm test`).
- No cambiar el esquema del estado sin migración compatible: hay negocios con datos reales en `localStorage`.
- Cada arreglo entra con su prueba en `test/`; `npm test` verde antes de decir que está listo.
- Nada de cobros reales, ni tocar producción/Supabase, sin autorización explícita.
- Los secretos (llaves de IA, `service_role`, KEK) nunca van al cliente ni al estado.
- Antes de tocar `tools/serve.mjs`, recuerda que la app se usa desde varios dispositivos en la red local.
