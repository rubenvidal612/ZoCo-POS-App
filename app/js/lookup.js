// Consulta de códigos de barras en bases abiertas (gratis)
// Datos: Open Food Facts / Open Beauty Facts / Open Pet Food Facts /
//        Open Products Facts — licencia ODbL · imágenes CC BY-SA
import { findByBarcode, state } from './store.js';

const SOURCES = [
  { key: 'food',    label: 'Open Food Facts',    host: 'https://world.openfoodfacts.org' },
  { key: 'beauty',  label: 'Open Beauty Facts',  host: 'https://world.openbeautyfacts.org' },
  { key: 'petfood', label: 'Open Pet Food Facts', host: 'https://world.openpetfoodfacts.org' },
  { key: 'products', label: 'Open Products Facts', host: 'https://world.openproductsfacts.org' },
];

const FIELDS = [
  'code', 'product_name', 'product_name_es', 'generic_name', 'brands',
  'categories', 'quantity', 'image_front_small_url', 'image_front_url',
].join(',');

// Control de cortesía: máx. 10 consultas por minuto por dispositivo
const hits = [];
function permitido() {
  const ahora = Date.now();
  while (hits.length && ahora - hits[0] > 60000) hits.shift();
  if (hits.length >= 10) return false;
  hits.push(ahora);
  return true;
}

function cacheKey(code) { return 'zoco.lookup.' + code; }
function leerCache(code) {
  try {
    const raw = localStorage.getItem(cacheKey(code));
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (!j || (Date.now() - (j.at || 0)) > 90 * 864e5) return null; // 90 días
    return j.data;
  } catch { return null; }
}
function guardarCache(code, data) {
  try { localStorage.setItem(cacheKey(code), JSON.stringify({ at: Date.now(), data })); } catch {}
}

/**
 * Busca un código de barras.
 * 1) Catálogo local del negocio
 * 2) Caché del dispositivo
 * 3) Bases abiertas (una por una, con límite)
 * Devuelve { found, source, name, brand, category, quantity, image, local }
 */
export async function lookupBarcode(rawCode, { skipLocal = false } = {}) {
  const code = String(rawCode || '').trim();
  if (!code) return { found: false, error: 'Código vacío' };

  // 1) ¿Ya lo tiene el negocio? (solo se usa si tiene foto; si no, se busca fuera)
  if (!skipLocal) {
    const local = findByBarcode(code);
    if (local?.product && local.product.image) {
      return {
        found: true, local: true, source: 'Tu catálogo',
        name: local.product.name, brand: local.product.brand || '',
        category: local.product.section || '', quantity: '',
        image: local.product.image, product: local.product, vkey: local.vkey || null,
      };
    }
  }

  // 2) Caché del dispositivo
  const cached = leerCache(code);
  if (cached) return { ...cached, cached: true };

  // 3) Bases abiertas
  if (!permitido()) {
    return { found: false, error: 'Demasiadas consultas seguidas. Espera un minuto o captúralo a mano.' };
  }
  for (const src of SOURCES) {
    try {
      const url = `${src.host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      if (j.status !== 1 || !j.product) continue;
      const p = j.product;
      const name = (p.product_name_es || p.product_name || p.generic_name || '').trim();
      if (!name) continue;
      const data = {
        found: true,
        source: src.label,
        name,
        brand: String(p.brands || '').split(',').slice(0, 2).join(', ').trim(),
        category: String(p.categories || '').split(',').slice(-1)[0].trim(),
        quantity: p.quantity || '',
        image: p.image_front_small_url || p.image_front_url || '',
      };
      guardarCache(code, data);
      return data;
    } catch { /* siguiente fuente */ }
  }
  const vacio = { found: false };
  guardarCache(code, vacio);
  return vacio;
}

/** Texto de atribución de licencia (obligatorio al mostrar resultados). */
export const LOOKUP_CREDIT = 'Datos: Open Food Facts (ODbL) · imágenes CC BY-SA';
