// Añade el giro Lavandería/Tintorería y el modelo de órdenes de servicio.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/store.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Secciones del giro (antes de la línea de barberia)
const anclaSecciones = "  barberia:    { label: '";
const seccionesLav = `  lavado:      { label: 'Lavado',           scale: 'none', mode: 'lavanderia' },
  planchado:   { label: 'Planchado',        scale: 'none', mode: 'lavanderia' },
  tintoreria:  { label: 'Tintorería',       scale: 'none', mode: 'lavanderia' },
  tenis:       { label: 'Tenis / calzado',  scale: 'none', mode: 'lavanderia' },
  edredones:   { label: 'Edredones y hogar', scale: 'none', mode: 'lavanderia' },
  insumos:     { label: 'Insumos',          scale: 'none', mode: 'lavanderia' },
`;
must(a.includes(anclaSecciones), 'ancla de secciones barberia');
a = a.split(anclaSecciones).join(seccionesLav + anclaSecciones);

// 2) Modo de negocio
const anclaModo = "  merceria:    { label: '";
const modoLav = `  lavanderia:  { label: 'Lavandería / tintorería', sections: ['lavado', 'planchado', 'tintoreria', 'tenis', 'edredones', 'insumos'] },
`;
must(a.includes(anclaModo), 'ancla de modo merceria');
a = a.split(anclaModo).join(modoLav + anclaModo);

// 3) API de órdenes de lavandería (al final del archivo)
const api = `

/* ================= Lavandería / tintorería ================= */
export const LAUNDRY_STATUS = [
  { key: 'recibido', label: 'Recibido' },
  { key: 'proceso', label: 'En proceso' },
  { key: 'listo', label: 'Listo' },
  { key: 'entregado', label: 'Entregado' },
];

function laundryStore() {
  if (!state.laundry || !Array.isArray(state.laundry.orders)) {
    state.laundry = { orders: [], seq: Number(state.laundry?.seq) || 1 };
  }
  return state.laundry;
}

export function laundryOrders() {
  return laundryStore().orders;
}

/** Crea una orden de servicio. items: [{productId, name, qty, price}] */
export function createLaundryOrder({ customer = '', phone = '', items = [], extra = 0, note = '', shelf = '', branchId = null } = {}) {
  const list = (items || []).filter((i) => i && i.name && Number(i.qty) > 0);
  if (!list.length) return { ok: false, msg: 'Agrega al menos una prenda o servicio' };
  const l = laundryStore();
  const folio = 'LAV-' + String(l.seq).padStart(4, '0');
  const total = round2(list.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0) + (Number(extra) || 0));
  const orden = {
    id: uid('lav'),
    folio,
    customer: String(customer || '').trim() || 'Mostrador',
    phone: String(phone || '').trim(),
    items: list.map((i) => ({
      productId: i.productId || null,
      name: String(i.name),
      qty: Number(i.qty) || 1,
      price: Number(i.price) || 0,
    })),
    extra: round2(Number(extra) || 0),
    note: String(note || '').trim(),
    shelf: String(shelf || '').trim().toUpperCase(),
    status: 'recibido',
    createdAt: new Date().toISOString(),
    readyAt: null,
    deliveredAt: null,
    branchId: branchId || state.currentBranch,
    user: state.user?.name || '',
    total,
  };
  l.seq += 1;
  l.orders.unshift(orden);
  emit();
  return { ok: true, order: orden };
}

export function moveLaundryOrder(id, status) {
  const orden = laundryStore().orders.find((o) => o.id === id);
  if (!orden) return { ok: false };
  const valid = LAUNDRY_STATUS.some((s) => s.key === status);
  if (!valid) return { ok: false };
  orden.status = status;
  if (status === 'listo' && !orden.readyAt) orden.readyAt = new Date().toISOString();
  if (status === 'entregado') orden.deliveredAt = new Date().toISOString();
  emit();
  return { ok: true, order: orden };
}

export function updateLaundryOrder(id, patch = {}) {
  const orden = laundryStore().orders.find((o) => o.id === id);
  if (!orden) return { ok: false };
  Object.assign(orden, patch);
  emit();
  return { ok: true, order: orden };
}

export function laundryStats() {
  const orders = laundryStore().orders;
  const hoy = new Date().toDateString();
  const porEstado = { recibido: 0, proceso: 0, listo: 0, entregado: 0 };
  let entregadasHoy = 0;
  let ingresosHoy = 0;
  orders.forEach((o) => {
    porEstado[o.status] = (porEstado[o.status] || 0) + 1;
    if (o.status === 'entregado' && o.deliveredAt && new Date(o.deliveredAt).toDateString() === hoy) {
      entregadasHoy += 1;
      ingresosHoy += Number(o.total) || 0;
    }
  });
  return { porEstado, entregadasHoy, ingresosHoy, total: orders.length };
}
`;

a = a + api;
fs.writeFileSync(ruta, a, 'utf8');
console.log('store: giro + secciones + API de órdenes listos');
