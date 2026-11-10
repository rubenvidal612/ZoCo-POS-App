// Acciones que el asistente puede proponer. Siempre requieren confirmación del usuario.
import {
  state, can, productById, cancelSale, upsertProduct, upsertCoupon,
  openRegister, closeRegister, emit, stockOf, upsertCustomer, upsertExpense,
} from './store.js';
import { money } from './ui.js';

const cleanName = (s) => String(s || '')
  .replace(/^(el|la|los|las|un|una|del|de la|de los|de las|de)\s+/i, '')
  .replace(/\s+/g, ' ').trim();

const findProduct = (txt) => {
  const t = cleanName(txt).toLowerCase();
  if (!t) return null;
  return state.products.find((p) => p.name.toLowerCase() === t)
    || state.products.find((p) => p.name.toLowerCase().includes(t))
    || state.products.find((p) => t.includes(p.name.toLowerCase()))
    || state.products.find((p) => (p.code || '').toLowerCase() === t);
};

export const ACTIONS = {
  cancel_sale: {
    label: 'Cancelar venta',
    perm: 'sales.cancel',
    describe(p) {
      const s = p.code ? state.sales.find((x) => x.code === p.code) : state.sales.find((x) => x.status === 'done');
      if (!s) return 'No hay venta para cancelar';
      return `Cancelar venta #${s.code} de ${money(s.total)} (${s.items.length} artículos). Se repone el stock.`;
    },
    run(p) {
      const s = p.code ? state.sales.find((x) => x.code === p.code) : state.sales.find((x) => x.status === 'done');
      if (!s) return { ok: false, msg: 'No encontré esa venta' };
      if (s.status === 'cancelled') return { ok: false, msg: 'Esa venta ya estaba cancelada' };
      cancelSale(s.id, p.reason || 'Cancelada por el asistente');
      return { ok: true, msg: 'Venta #' + s.code + ' cancelada y stock repuesto' };
    },
  },

  set_price: {
    label: 'Cambiar precio',
    perm: 'products.edit',
    describe(p) {
      const prod = findProduct(p.product);
      if (!prod) return `No encontré "${p.product}"`;
      return `Cambiar precio de ${prod.name}: ${money(prod.price)} → ${money(Number(p.price) || 0)}`;
    },
    run(p) {
      const prod = findProduct(p.product);
      if (!prod) return { ok: false, msg: 'No encontré el producto' };
      const price = Number(p.price);
      if (!(price > 0)) return { ok: false, msg: 'Precio inválido' };
      upsertProduct({ id: prod.id, price });
      return { ok: true, msg: prod.name + ' ahora cuesta ' + money(price) };
    },
  },

  add_stock: {
    label: 'Agregar stock',
    perm: 'stock.manage',
    describe(p) {
      const prod = findProduct(p.product);
      if (!prod) return `No encontré "${p.product}"`;
      return `Agregar ${p.qty} pza(s) a ${prod.name}` + (p.size ? ` talla ${p.size}` : '') + ` (sucursal actual).`;
    },
    run(p) {
      const prod = findProduct(p.product);
      if (!prod) return { ok: false, msg: 'No encontré el producto' };
      const qty = Number(p.qty);
      if (!(qty > 0)) return { ok: false, msg: 'Cantidad inválida' };
      const size = p.size || 'Único';
      const b = prod.branchStock?.[state.currentBranch] || {};
      prod.branchStock[state.currentBranch] = b;
      b[size] = Number(b[size] || 0) + qty;
      emit();
      return { ok: true, msg: `${prod.name} talla ${size}: +${qty} (total ${b[size]})` };
    },
  },

  create_product: {
    label: 'Crear producto',
    perm: 'products.edit',
    describe(p) {
      return `Crear producto "${p.name}" con precio ${money(Number(p.price) || 0)} y ${p.qty || 0} pieza(s).`;
    },
    run(p) {
      if (!p.name || !(Number(p.price) > 0)) return { ok: false, msg: 'Falta nombre o precio' };
      const branch = state.currentBranch;
      const size = p.size || 'Único';
      upsertProduct({
        name: p.name,
        price: Number(p.price),
        cost: Math.round(Number(p.price) * 0.55),
        section: p.section || (state.company.mode === 'shoe' ? 'dama' : state.company.mode === 'boutique' ? 'ropa' : 'general'),
        code: (p.name.slice(0, 3).toUpperCase()) + '-' + Math.floor(Math.random() * 900 + 100),
        branchStock: { [branch]: { [size]: Number(p.qty) || 0 } },
      });
      return { ok: true, msg: 'Producto creado: ' + p.name };
    },
  },

  create_coupon: {
    label: 'Crear cupón',
    perm: 'products.edit',
    describe(p) {
      return `Crear cupón ${p.code} (${p.type === 'PERCENT' ? p.value + '%' : money(Number(p.value) || 0) + ' de descuento'}).`;
    },
    run(p) {
      if (!p.code || !(Number(p.value) > 0)) return { ok: false, msg: 'Falta código o valor' };
      upsertCoupon({ code: String(p.code).toUpperCase(), type: p.type === 'PERCENT' ? 'PERCENT' : 'FIXED', value: Number(p.value) });
      return { ok: true, msg: 'Cupón ' + String(p.code).toUpperCase() + ' creado' };
    },
  },

  create_customer: {
    label: 'Crear cliente',
    perm: 'customers.manage',
    describe(p) { return 'Registrar cliente "' + (p.name || '') + '"' + (p.creditLimit ? ' con crédito de ' + money(p.creditLimit) : '') + '.'; },
    run(p) {
      if (!p.name) return { ok: false, msg: 'Falta el nombre' };
      upsertCustomer({ name: p.name, phone: p.phone || '', creditLimit: Number(p.creditLimit) || 0 });
      return { ok: true, msg: 'Cliente creado: ' + p.name };
    },
  },

  register_expense: {
    label: 'Registrar gasto',
    perm: 'finance.view',
    describe(p) { return 'Registrar gasto "' + (p.name || '') + '" por ' + money(Number(p.amount) || 0) + '.'; },
    run(p) {
      if (!(Number(p.amount) > 0)) return { ok: false, msg: 'Monto inválido' };
      upsertExpense({ name: p.name || 'Gasto', amount: Number(p.amount) });
      return { ok: true, msg: 'Gasto registrado: ' + (p.name || '') + ' ' + money(Number(p.amount)) };
    },
  },

  close_register: {
    label: 'Cerrar caja',
    perm: 'finance.view',
    describe() { return 'Cerrar la caja del turno actual.'; },
    run() { closeRegister(); return { ok: true, msg: 'Caja cerrada' }; },
  },

  registrar_movimiento_personal: {
    label: 'Registrar movimiento personal',
    perm: 'sales.create',
    describe(p) {
      const tipo = p.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
      const met = p.metodo === 'tarjeta' ? 'tarjeta' : 'efectivo';
      return `${tipo} personal de $${Number(p.monto || 0).toFixed(2)} en ${met}${p.descripcion ? ' · ' + p.descripcion : ''}.`;
    },
    run(p) {
      addPersonalMovement({
        type: p.tipo === 'ingreso' ? 'in' : 'out',
        amount: Number(p.monto) || 0,
        method: p.metodo === 'tarjeta' ? 'card' : 'cash',
        category: p.categoria || 'Otros',
        note: p.descripcion || '',
      });
      return 'Movimiento personal registrado';
    },
  },  set_saving_goal: {
    label: 'Fijar meta de ahorro',
    perm: 'settings.edit',
    describe(p) {
      return `Fijar tu meta de ahorro en $${Number(p.monto || 0).toFixed(2)} al mes.`;
    },
    run(p) {
      const v = setSavingGoal(p.monto);
      return 'Meta de ahorro: $' + v.toFixed(2) + ' al mes';
    },
  },  open_register: {
    label: 'Abrir caja',
    perm: 'finance.view',
    describe(p) { return 'Abrir caja con ' + money(Number(p.amount) || 0) + '.'; },
    run(p) { openRegister(Number(p.amount) || 0); return { ok: true, msg: 'Caja abierta' }; },
  },
};

/** Detecta una propuesta de acción en el texto del asistente. */
export function parseAction(text) {
  try {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]);
    if (o && o.action && ACTIONS[o.action]) return { action: o.action, params: o.params || {} };
  } catch { /* no es JSON */ }
  return null;
}

/* ---------- Interpretación en lenguaje natural (modo sin API key) ---------- */
const NUM_WORDS = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300,
  cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
  mil: 1000,
};

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function wordsToNum(seq) {
  let total = 0, cur = 0;
  for (const w of seq) {
    const v = NUM_WORDS[w];
    if (v == null) return null;
    if (v === 1000) { cur = (cur || 1) * 1000; total += cur; cur = 0; }
    else cur += v;
  }
  return total + cur;
}

/** Extrae un número escrito con dígitos o con palabras ("mil trescientos veinte" → 1320). */
export function extractNumber(str) {
  const q = norm(str);
  const digits = q.match(/(\d[\d.,]*)/);
  if (digits) {
    const clean = digits[1].replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = Number(clean);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const words = q.split(/[^a-z]+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    if (NUM_WORDS[words[i]] == null) continue;
    const seq = [];
    for (let j = i; j < words.length && NUM_WORDS[words[j]] != null; j++) seq.push(words[j]);
    const n = wordsToNum(seq);
    if (n) return n;
  }
  return null;
}

/** Encuentra el producto mencionado en el texto (por nombre o SKU). */
function findMention(text) {
  const t = norm(text);
  let best = null;
  for (const p of state.products) {
    const name = norm(p.name);
    if (t.includes(name)) { if (!best || name.length > norm(best.name).length) best = p; continue; }
    const words = name.split(/\s+/).filter((w) => w.length > 3);
    const hits = words.filter((w) => t.includes(w)).length;
    if (hits && (!best || hits > (best.__hits || 0))) { best = p; best.__hits = hits; }
    if ((p.code || '') && t.includes(norm(p.code))) best = p;
  }
  return best;
}

function extractSize(text) {
  const m = norm(text).match(/\b(?:talla|talle|num(?:ero)?|medida)\s+([0-9]+(?:[.,]5)?|[a-z]{1,3})\b/);
  return m ? m[1].replace(',', '.') : undefined;
}

/** Detecta la intención sin exigir una frase exacta. */
export function localIntent(q) {
  const t = norm(q);
  const num = extractNumber(q);
  const prod = findMention(q);
  const has = (re) => re.test(t);

  // Cancelar venta
  if (has(/\b(cancela|cancelar|anula|anular|borra|borrar|reviert|devoluc)/) && has(/\bventa|ticket|folio|transaccion|recibo/)) {
    const f = q.match(/\b(\d+-\d+)\b/);
    return { action: 'cancel_sale', params: f ? { code: f[1] } : {} };
  }
  // Cerrar / abrir caja
  if (has(/\bcierra|cerrar|cierre\b/) && has(/\bcaja\b/)) return { action: 'close_register', params: {} };
  if (has(/\babre|abrir|apertura\b/) && has(/\bcaja\b/)) return { action: 'open_register', params: { amount: num || 0 } };
  // Cambiar precio
  if (prod && num && has(/\bprecio|cueste|cuesta|valga|vale|tarifa|cambia|cambiar|pon|poner|sube|subir|baja|bajar|actualiza|ajusta/)) {
    return { action: 'set_price', params: { product: prod.name, price: num } };
  }
  // Agregar stock
  if (prod && num && has(/\bstock|inventario|piezas|pares|agrega|anade|suma|aumenta|mete|entraron|llego|recibi/)) {
    return { action: 'add_stock', params: { product: prod.name, qty: num, size: extractSize(q) } };
  }
  // Crear producto
  if (num && has(/\b(crea|crear|da de alta|agrega|anade|registra|nuevo|nueva)\b/) && has(/\bproducto|articulo|modelo\b/) && !prod) {
    const name = q.replace(/.*?(producto|articulo|modelo)\s*/i, '').replace(/\s+(a|en|por)\s+\$?[\d.,]+.*$/i, '').trim();
    return { action: 'create_product', params: { name: name || 'Producto', price: num } };
  }
  // Cupón
  if (has(/\bcupon\b/) && num) {
    const code = (q.match(/\bcupon\s+([a-z0-9-]+)/i) || [])[1] || ('CUPON' + Math.floor(Math.random() * 900 + 100));
    return { action: 'create_coupon', params: { code, value: num, type: /%|porcentaje/.test(t) ? 'PERCENT' : 'FIXED' } };
  }
  // Cliente
  if (has(/\bcliente\b/) && has(/\b(crea|crear|alta|registra|agrega|nuevo|nueva)\b/)) {
    const name = q.replace(/.*?cliente\s*/i, '').replace(/\s+(con|de)\s+.*$/i, '').replace(/^(nuevo|nueva|el|la)\s+/i, '').trim();
    return { action: 'create_customer', params: { name: name || 'Cliente', creditLimit: num && has(/credito|limite/) ? num : 0 } };
  }
  // Gasto
  if (num && has(/\b(gasto|gaste|pague|pago de|compra|recibo de luz|renta|proveedor)\b/)) {
    let name = q
      .replace(/^\s*(oye\s+)?(registra|registrar|anota|apunta|agrega|agregar)?\s*(un\s+|una\s+)?(gasto|pago|compra)\s*/i, '')
      .replace(/[\d.,$]+\s*(pesos|mxn)?/i, ' ')
      .replace(/\b(de|del|por|para|en)\b/gi, ' ')
      .replace(/^\s*(el|la|los|las|un|una)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!name || name.length < 3) name = 'Gasto';
    return { action: 'register_expense', params: { name, amount: num } };
  }
  return null;
}

export function canRun(action) {
  const a = ACTIONS[action];
  return !!a && can(a.perm);
}

export function describeAction(action, params) {
  const a = ACTIONS[action];
  if (!a) return 'Acción desconocida';
  try { return a.describe(params || {}); } catch { return a.label; }
}

export function runAction(action, params) {
  const a = ACTIONS[action];
  if (!a) return { ok: false, msg: 'Acción desconocida' };
  if (!can(a.perm)) return { ok: false, msg: 'No tienes permiso para esta acción' };
  try { return a.run(params || {}); } catch (e) { return { ok: false, msg: String(e.message || e) }; }
}
