// Arnés para probar app/js/store.js en Node.
// store.js hace `export const state = load()` al importarse y usa localStorage,
// window.dispatchEvent y window.__storeDebug; aquí se simulan.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** localStorage en memoria (una clave, como la app real). */
export function crearStorage() {
  const datos = new Map();
  return {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => { datos.set(k, String(v)); },
    removeItem: (k) => { datos.delete(k); },
    clear: () => datos.clear(),
    get length() { return datos.size; },
    key: (i) => [...datos.keys()][i] ?? null,
    _datos: datos,
  };
}

/** Instala los globals de navegador que necesita store.js. */
export function instalarNavegador({ storage = crearStorage() } = {}) {
  globalThis.localStorage = storage;
  globalThis.window = globalThis.window || {};
  globalThis.window.localStorage = storage;
  globalThis.window.dispatchEvent = () => true;
  globalThis.window.addEventListener = () => {};
  if (typeof globalThis.CustomEvent !== 'function') {
    globalThis.CustomEvent = class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    };
  }
  if (!globalThis.crypto?.randomUUID) {
    globalThis.crypto = globalThis.crypto || {};
    globalThis.crypto.randomUUID = () => 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return storage;
}

/** Importa store.js con un estado base de empresa de prueba. */
export async function importarStore({ storage } = {}) {
  const st = storage || instalarNavegador();
  // Estado mínimo: una empresa de tienda con una sucursal, sin demo.
  const base = {
    version: 1,
    currentCompany: 'co-test',
    currentBranch: 'b1',
    company: { id: 'co-test', name: 'Negocio Prueba', mode: 'shoe', theme: 'classic' },
    branches: [{ id: 'b1', name: 'Matriz' }],
    branchesByMode: { shoe: [{ id: 'b1', name: 'Matriz' }] },
    user: { id: 'u1', name: 'Prueba', role: 'OWNER' },
    users: [{ id: 'u1', name: 'Prueba', role: 'OWNER' }],
    settings: {},
    coupons: [],
    products: [],
    sales: [],
    returns: [],
    customers: [],
    expenses: [],
    cashMovements: [],
    register: { open: true, opening: 0, openedAt: '2026-01-01T00:00:00.000Z' },
    seq: 0,
    purchases: [],
    suppliers: [],
    layaways: [],
    transfers: [],
    adjustments: [],
    food: { ingredients: [], recipes: [], tables: [], tableOrders: [], reservations: [], stationSettings: { cocina: 'Cocina', barra: 'Barra' } },
  };
  st.setItem('zoco.pos.v1', JSON.stringify(base));

  const url = pathToFileURL(path.join(RAIZ, 'app', 'js', 'store.js')).href;
  const mod = await import(url + '?t=' + Date.now());
  return { store: mod, storage: st };
}

export { RAIZ };
