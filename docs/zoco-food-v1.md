# ZoCo Food — primera versión (diseño técnico)

## Alcance
Módulo optativo para restaurante, dark kitchen o ambos. Mantener POS existente sin cambios funcionales para otros giros. La atención WhatsApp Business es manual y no requiere API ni sesión QR de WhatsApp Web.

## Flujo público
1. Cliente abre catálogo público existente `app/catalogo.html` con `?c=companyId`.
2. Agrega productos con foto, cantidad, modificadores y observaciones al carrito.
3. Al tocar «Pedir por WhatsApp», el servidor valida precios, empresa y disponibilidad; crea pedido **pendiente** con identificador único y enlace de seguimiento; después el navegador abre `wa.me` con el resumen y folio.
4. Si el cliente no envía el mensaje, el pedido sigue pendiente sin ser venta. Permitir expiración/cancelación y evitar duplicados por idempotencia.
5. Empleado responde en WhatsApp Business, verifica entrega, dirección, costo, disponibilidad y pago; confirma el pedido en ZoCo. Solo entonces se genera comanda.
6. Cocina visualiza foto, nombre, cantidad, extras y notas; marca preparando/listo; caja registra pago y entrega.

## Imágenes
Reutilizar `products[].image` del catálogo para miniaturas en carrito, pedidos y cocina; ampliar al tocar. Guardar instantánea de nombre/precio/imagen en cada renglón del pedido para preservar historial. Fallback visual si falta imagen.

## Inventario
Productos vendidos como platillos; insumos en unidades pza/g/ml; recetas con cantidades y costo. Pendiente no mueve inventario. Confirmación debe reservar ingredientes o aplicar descuento según política explícita y transaccional; cancelaciones revierten reservas sin doble descuento. Mermas y disponibilidad se gestionan por sucursal.

## Seguridad y aislamiento
No escribir pedidos públicos directamente en `company_state.data` con credenciales expuestas. Crear endpoint seguro de pedidos con validación de catálogo, límites de frecuencia, token no adivinable, protección contra duplicados y autorización de empleado para leer/confirmar. Separar datos por company_id; no exponer datos privados de clientes en API pública. No modificar ventas, inventarios ni caja de comercios no Food.

## Implementación sugerida
- Extender `api/catalog.mjs` con campos públicos de modificadores y disponibilidad, solo para modo Food.
- Añadir almacenamiento persistente de pedidos con estados `pending/confirmed/preparing/ready/completed/cancelled`.
- Crear API pública para pedido pendiente y API autenticada para empleados.
- Añadir vista de pedidos y cocina a la navegación Food, responsive y con fotos.
- Añadir configuración de restaurante/dark/híbrido y recetas de ingredientes.
- Probar catálogo normal, permisos, doble clic, pedido abandonado, cambio de precio, falta de stock, confirmación y cancelación.

## Criterios de aceptación
- Catálogo de comercio normal sigue igual.
- Pedido del catálogo Food queda pendiente aun si WhatsApp no se envía.
- No se registra venta ni movimiento de inventario al crear pendiente.
- Empleado puede confirmar y cocina recibe comanda con fotos.
- No se requieren API oficial de WhatsApp ni QR no oficial en esta fase.
