// Extiende las órdenes de lavandería: clave de seguimiento, fotos y helper para agregarlas.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/store.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) La orden guarda clave de seguimiento y fotos
const viejoOrden = `    status: 'recibido',
    createdAt: new Date().toISOString(),`;
const nuevoOrden = `    status: 'recibido',
    trackCode: String(Math.floor(1000 + Math.random() * 9000)),
    photos: [],
    createdAt: new Date().toISOString(),`;
must(a.includes(viejoOrden), 'campos de la orden');
a = a.split(viejoOrden).join(nuevoOrden);

// 2) Helper para fotos
const ancla = `export function laundryStats() {`;
const helper = `export function addLaundryPhoto(id, dataUrl) {
  const orden = laundryStore().orders.find((o) => o.id === id);
  if (!orden) return { ok: false };
  if (!Array.isArray(orden.photos)) orden.photos = [];
  if (orden.photos.length >= 4) return { ok: false, msg: 'Máximo 4 fotos por orden' };
  if (dataUrl) orden.photos.push({ url: dataUrl, at: new Date().toISOString() });
  emit();
  return { ok: true, photos: orden.photos };
}

export function removeLaundryPhoto(id, index) {
  const orden = laundryStore().orders.find((o) => o.id === id);
  if (!orden || !Array.isArray(orden.photos)) return { ok: false };
  orden.photos.splice(Number(index), 1);
  emit();
  return { ok: true };
}

export function laundryStats() {`;
must(a.includes(ancla), 'ancla laundryStats');
a = a.split(ancla).join(helper);

fs.writeFileSync(ruta, a, 'utf8');
console.log('store: trackCode, fotos y helpers listos');
