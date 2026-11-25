// Actualiza los planes de landing-2.html a los precios y contenidos nuevos.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/landing-2.html';
let html = fs.readFileSync(ruta, 'utf8');

const inicio = '<div class="grid public-plans">';
const fin = 'Todos incluyen usuarios y productos ilimitados';
const i = html.indexOf(inicio);
const f = html.indexOf(fin);
if (i < 0 || f < 0 || f < i) {
  console.error('No se encontró el bloque de planes');
  process.exit(1);
}

const planes = [
  {
    nombre: 'ZoCo Esencial', precio: '$149', sucursales: '1 sucursal', comision: '$50',
    ideal: 'Para la tienda de una sola puerta',
    incluye: [
      'Punto de venta completo (tallas, colores y servicios)',
      'Inventario ilimitado con alertas de stock bajo',
      'Caja, cortes Z y control de efectivo',
      'Compras, proveedores y cuentas por pagar',
      'Clientes, apartados y cupones',
      'Catálogo en línea con pedidos por WhatsApp',
      'Reportes de ventas, utilidad y margen',
      'Agente IA con tu propia llave',
      'Respaldo descargable de tus datos',
      'Soporte por WhatsApp',
    ],
  },
  {
    nombre: 'ZoCo Pro', precio: '$295', sucursales: '2 sucursales', comision: '$150',
    ideal: 'Para quien ya abrió su segunda sucursal',
    incluye: [
      'Todo lo de Esencial, y además:',
      'Inventario por separado en cada sucursal',
      'Comparativo de ventas entre sucursales',
      'Traspasos de mercancía entre sucursales',
      'Reloj checador y nómina del equipo',
      'Cortes de caja por sucursal',
      'Integraciones (Mercado Pago y Envía)',
      'Catálogos base por giro',
      'Soporte prioritario',
    ],
  },
  {
    nombre: 'ZoCo Empresarial', precio: '$499', sucursales: '10 sucursales', comision: '$250',
    ideal: 'Para cadenas con varias puertas',
    incluye: [
      'Todo lo de Pro, y además:',
      'Hasta 10 sucursales',
      'Tablero consolidado de la cadena',
      'Permisos avanzados por rol y sucursal',
      'Migración de tu inventario (te ayudamos)',
      'Capacitación en línea para tu equipo',
      'Revisión de catálogo y precios contigo',
      'Soporte prioritario y atención directa',
    ],
  },
];

const bloque = inicio + planes.map((p) => `
        <article class="card public-plan">
          <h3>${p.nombre}</h3>
          <p class="plan-price"><strong>${p.precio}</strong> MXN/mes</p>
          <p class="plan-ideal">${p.ideal}</p>
          <ul class="plan-list">
            ${p.incluye.map((t) => `<li>${t}</li>`).join('\n            ')}
          </ul>
          <p class="plan-affiliate">Comisión de afiliado de ${p.comision} MXN al mes por cliente activo</p>
        </article>`).join('') + '\n      ';

html = html.slice(0, i) + bloque + html.slice(f);

// Estilos mínimos para la lista de cada plan
const estilo = `
    .public-plan .plan-ideal{margin:2px 0 10px;font-size:12.5px;color:#64748B}
    .public-plan .plan-list{list-style:none;margin:10px 0 12px;padding:0;display:grid;gap:6px}
    .public-plan .plan-list li{position:relative;padding-left:18px;font-size:12.5px;line-height:1.35;color:#334155}
    .public-plan .plan-list li::before{content:"✓";position:absolute;left:0;top:0;color:#059669;font-weight:900}
    .public-plan .plan-affiliate{margin:0;font-size:11px;color:#64748B}
  `;
if (!html.includes('.public-plan .plan-list')) {
  html = html.replace('</style>', estilo + '</style>');
}

fs.writeFileSync(ruta, html, 'utf8');
console.log('landing-2 actualizada: 149 / 295 / 499 con listas');
console.log('quedan 349/599?', /349|599/.test(html) ? 'SI (revisar)' : 'no');
