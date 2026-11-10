# ZoCo POS

Punto de venta para zapaterías, boutiques y tiendas. Sin build, sin dependencias: ES modules + un servidor Node mínimo.

## Requisitos

- Node.js 18 o superior (usa `fetch` y `crypto.hkdf` nativos)
- Un navegador moderno (Chrome, Edge, Safari 16.4+ en iOS para push)

## Arranque

```bash
node tools/serve.mjs
```

- App: http://localhost:4321
- En la red local: `http://<tu-ip>:4321`
- Salud del servidor: `/api/health`

Los datos se guardan por empresa en `data/zoco-<empresa>.json`.

## Apps instalables (PWA)

| App | Ruta | Para qué |
|---|---|---|
| ZoCo POS | `/` | Punto de venta completo |
| ZoCo Gastos | `/gastos.html` | Gastos del negocio en 2 toques |
| Mis Finanzas | `/finanzas.html` | Gastos e ingresos personales |
| ZoCo Chat | `/chat.html` | Solo el asistente IA |

## Módulos

- **Vender**: buscador, lector de códigos, tallas, venta rápida, carrito
- **Cobro**: efectivo con cambio, débito, crédito, pago dividido, apartados
- **Inventario**: por talla y por sucursal, importación inteligente de Excel/CSV/PDF
- **Clientes, cupones, crédito, gastos, caja, corte**
- **Reloj checador** con foto y huella (WebAuthn), nómina y comisiones
- **Metas** por día/semana/mes/año, del negocio o por vendedor
- **Asistente IA** con tool calling (Gemini, OpenAI, DeepSeek, Anthropic)
- **Web Push** propio con VAPID (avisos de venta al dueño)

## API

| Ruta | Método | Descripción |
|---|---|---|
| `/api/state?c=empresa` | GET / POST | Estado completo de una empresa |
| `/api/companies` | GET | Empresas disponibles |
| `/api/ai` | POST | Proxy de IA (evita CORS y problemas de TLS) |
| `/api/print` | POST | Impresión ESC/POS por WiFi (TCP 9100) |
| `/api/push/key` | GET | Llave pública VAPID |
| `/api/push/subscribe` | POST | Registra un dispositivo |
| `/api/push/test` | POST | Envía una notificación de prueba |

## Seguridad

- `data/` y las llaves VAPID **no** se versionan (están en `.gitignore`).
- La API key de IA se guarda por empresa y se envía al proveedor a través del servidor local.

## Licencia

Uso privado.
