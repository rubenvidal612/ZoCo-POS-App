// Ajusta precios y contenido de los planes en ZoCo.
// Regla: el plan intermedio debe costar MENOS que dos del básico.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/store.js';
let a = fs.readFileSync(ruta, 'utf8');

const viejo = /export const PLANS = \{[\s\S]*?\n  \};/;
const nuevo = `export const PLANS = {
  esencial: {
    code: 'esencial', name: 'ZoCo Esencial', price: 149, affiliate: 50, zoco: 99,
    limits: { branches: 1 },
    hint: '1 sucursal · usuarios ilimitados',
    ideal: 'Para la tienda de una sola puerta',
    incluye: [
      'Punto de venta completo (tallas, colores, servicios)',
      'Inventario ilimitado y alertas de stock bajo',
      'Caja, cortes Z y control de efectivo',
      'Compras, proveedores y cuentas por pagar',
      'Clientes, apartados y cupones',
      'Catálogo en línea con pedidos por WhatsApp',
      'Reportes de ventas, utilidad y margen',
      'Agente IA con tu propia llave',
      'Respaldo descargable de todos tus datos',
      'Soporte por WhatsApp',
    ],
  },
  pro: {
    code: 'pro', name: 'ZoCo Pro', price: 295, affiliate: 150, zoco: 199,
    limits: { branches: 2 },
    hint: 'Hasta 2 sucursales · usuarios ilimitados',
    ideal: 'Para quien ya abrió su segunda sucursal',
    incluye: [
      'Todo lo de Esencial, y además:',
      '2 sucursales con inventario por separado',
      'Comparativo de ventas entre sucursales',
      'Traspasos de mercancía entre sucursales',
      'Reloj checador y nómina del equipo',
      'Cortes de caja por sucursal',
      'Integraciones (Mercado Pago y Envía)',
      'Cambio de giro y catálogos base por giro',
      'Soporte prioritario por WhatsApp',
    ],
  },
  empresarial: {
    code: 'empresarial', name: 'ZoCo Empresarial', price: 499, affiliate: 250, zoco: 349,
    limits: { branches: 10 },
    hint: 'Hasta 10 sucursales · usuarios ilimitados',
    ideal: 'Para cadenas y negocios con varias puertas',
    incluye: [
      'Todo lo de Pro, y además:',
      'Hasta 10 sucursales',
      'Tablero consolidado de toda la cadena',
      'Permisos avanzados por rol y por sucursal',
      'Migración de tu inventario actual (te ayudamos)',
      'Capacitación en línea para tu equipo',
      'Revisión de catálogo y precios contigo',
      'Soporte prioritario y atención directa',
    ],
  },
  };`;

if (viejo.test(a)) {
  a = a.replace(viejo, nuevo);
  fs.writeFileSync(ruta, a, 'utf8');
  console.log('PLANS actualizado: 149 / 295 / 499');
} else {
  console.log('NO se encontró el bloque PLANS');
}
