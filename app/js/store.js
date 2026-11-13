// Estado + persistencia (localStorage) + API del servidor
import { uid } from './ui.js';

const KEY = 'zoco.pos.v1';
const SKEY = 'zoco.session';

/* ================= Rampas de tallas ================= */
export const SECTIONS = {
  dama:      { label: 'Damas',     scale: 'shoe', from: 22, to: 27,   step: 0.5, mode: 'shoe' },
  infantil:  { label: 'Infantil',  scale: 'shoe', from: 12, to: 21.5, step: 0.5, mode: 'shoe' },
  caballero: { label: 'Caballero', scale: 'shoe', from: 22, to: 30,   step: 0.5, mode: 'shoe' },
  escolar:   { label: 'Escolar',   scale: 'us',   from: 1,  to: 6.5,  step: 0.5, mode: 'shoe' },
  bolsas:    { label: 'Bolsas',    scale: 'none', mode: 'shoe' },
  carteras:  { label: 'Carteras',  scale: 'none', mode: 'shoe' },
  ropa:      { label: 'Ropa',       scale: 'alpha', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], mode: 'boutique' },
  calzado:   { label: 'Calzado',    scale: 'shoe', from: 22, to: 30, step: 0.5, mode: 'boutique' },
  accesorios:{ label: 'Accesorios', scale: 'none', mode: 'boutique' },
  general:   { label: 'General',    scale: 'none', mode: 'general' },
  abarrotes: { label: 'Abarrotes',  scale: 'none', mode: 'general' },
  electronica:{ label: 'Electrónica', scale: 'none', mode: 'general' },
};

/** Giros de negocio: cada uno habilita sus secciones. Se pueden agregar más aquí. */
export const MODES = {
  shoe:     { label: 'Zapatería',            sections: ['dama', 'infantil', 'caballero', 'escolar', 'bolsas', 'carteras'] },
  boutique: { label: 'Boutique (ropa/accesorios)', sections: ['ropa', 'calzado', 'accesorios'] },
  general:  { label: 'Productos generales',  sections: ['general', 'abarrotes', 'electronica'] },
};

export function sizesFor(sectionId) {
  const s = SECTIONS[sectionId];
  if (!s) return ['Único'];
  if (s.scale === 'none') return ['Único'];
  if (s.scale === 'alpha') return s.values;
  const out = [];
  for (let v = s.from; v <= s.to + 0.0001; v += s.step) out.push(Number(v.toFixed(1)));
  return out;
}

export const fmtSize = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v));

/* ================= Roles y permisos ================= */
export const PERMS = {
  'sales.sell':     'Vender',
  'sales.cancel':   'Cancelar ventas',
  'sales.discount': 'Aplicar descuentos',
  'products.edit':  'Editar productos',
  'stock.manage':   'Gestionar stock',
  'customers.manage': 'Clientes',
  'reports.view':   'Ver reportes',
  'finance.view':   'Ver finanzas',
  'users.manage':   'Administrar usuarios',
  'settings.edit':  'Configuración',
  'ai.use':         'Usar agente IA',
};

export const ROLES = {
  OWNER:   { label: 'Propietario', perms: ['*'] },
  ADMIN:   { label: 'Administrador', perms: ['sales.sell', 'sales.cancel', 'sales.discount', 'products.edit', 'stock.manage', 'customers.manage', 'reports.view', 'finance.view', 'users.manage', 'settings.edit', 'ai.use'] },
  CASHIER: { label: 'Cajero', perms: ['sales.sell', 'sales.discount', 'customers.manage'] },
  STOCK:   { label: 'Almacén', perms: ['products.edit', 'stock.manage'] },
  ACCOUNT: { label: 'Contador', perms: ['reports.view', 'finance.view'] },
};

const COLORS = ['#2F5BFF', '#1D4FD8', '#6366F1', '#0EA5E9', '#12B76A', '#F79009', '#B4235A', '#7C9A6D'];

/* ================= Seed ================= */
function seed() {
  const branches = [
    { id: 'b1', name: 'Centro' },
    { id: 'b2', name: 'Plaza Las Américas' },
  ];

  const base = [
    ['Nike Air Zoom', 'dama', 1290, 'AIR'],
    ['Botín Dama Piel', 'dama', 980, 'BOT'],
    ['Sandalia Playa', 'dama', 640, 'SAN'],
    ['Tenis Niño Sport', 'infantil', 520, 'TEN'],
    ['Mocasín Piel', 'caballero', 1150, 'MOC'],
    ['Bota Industrial', 'caballero', 1320, 'BOI'],
    ['Escolar Negro', 'escolar', 430, 'ESC'],
    ['Bolsa Piel', 'bolsas', 1750, 'BOL'],
    ['Cartera Mini', 'carteras', 690, 'CAR'],
  ];

  const products = base.map(([name, section, price, tag], i) => {
    const stock = {};
    sizesFor(section).forEach((s, ix) => {
      const n = ((ix * 7 + i * 3) % 5);
      stock[fmtSize(s)] = n === 4 ? 0 : n + 1;
    });
    const branchStock = {};
    branches.forEach((b, bi) => {
      branchStock[b.id] = {};
      Object.entries(stock).forEach(([k, v]) => { branchStock[b.id][k] = Math.max(0, v - (bi === 1 ? 1 : 0)); });
    });
    return {
      id: uid('p'), name, section, price, cost: Math.round(price * 0.55),
      code: tag + '-' + (100 + i), color: COLORS[i % COLORS.length],
      branchStock, active: true, catalog: true,
    };
  });

  return {
    version: 2,
    company: { name: 'ZoCo Demo', legalId: '', theme: 'classic', mode: 'shoe', currency: 'MXN', decimals: 2 },
    companies: [{ id: 'default', name: 'ZoCo Demo' }],
    currentCompany: 'default',
    branches,
    currentBranch: 'b1',
    users: [
      { id: 'u1', name: 'Ramber Américas', email: 'ramberamericasefectivo@gmail.com', pass: '1234', role: 'OWNER', active: true, pin: '1234', jobTitle: 'Propietario', payType: 'HOURLY', payRate: 150 },
      { id: 'u2', name: 'Cajero Mostrador', email: 'cajero@zoco.app', pass: '1234', role: 'CASHIER', active: true, pin: '1111', jobTitle: 'Vendedor', payType: 'HOURLY', payRate: 60 },
    ],
    user: { name: 'Ramber Américas', role: 'OWNER' },
    customers: [],
    coupons: [],
    layaways: [],
    expenses: [],
    register: { open: false, opening: 0 },
    cashMovements: [],
    timeRecords: [],
    register: { open: false, opening: 0 },
    cashMovements: [],
    timeRecords: [],
    products,
    sales: [],
    seq: 1,
    settings: { discountMax: 100, aiKey: '', aiProvider: 'gemini' },
  };
}

/* ================= Carga / migración ================= */
function migrate(s) {
  if (!Array.isArray(s.branches)) s.branches = [{ id: 'b1', name: 'Centro' }];
  if (!s.currentBranch) s.currentBranch = s.branches[0].id;
  if (!Array.isArray(s.users)) s.users = seed().users;
  if (!Array.isArray(s.companies)) s.companies = [{ id: 'default', name: s.company?.name || 'ZoCo Demo' }];
  if (!s.currentCompany) s.currentCompany = 'default';
  if (!Array.isArray(s.customers)) s.customers = [];
  if (!Array.isArray(s.coupons)) s.coupons = [];
  if (!Array.isArray(s.layaways)) s.layaways = [];
  if (!Array.isArray(s.expenses)) s.expenses = [];
  if (!s.register) s.register = { open: false, opening: 0 };
  if (!Array.isArray(s.cashMovements)) s.cashMovements = [];
  if (!Array.isArray(s.timeRecords)) s.timeRecords = [];
  (s.users || []).forEach((u, i) => {
    u.role = String(u.role || 'CASHIER').toUpperCase();
    if (u.pin == null) u.pin = String(1234 + i * 111);
    if (!u.payType) u.payType = 'HOURLY';
    if (u.payRate == null) u.payRate = 60;
    if (!u.jobTitle) u.jobTitle = u.role === 'OWNER' ? 'Propietario' : 'Vendedor';
  });
  if (!s.settings) s.settings = { aiKey: '', aiProvider: 'gemini' };

  // Repara usuarios perdidos o incompletos (sin correo o contraseña)
  if (!Array.isArray(s.users)) s.users = [];
  s.users = s.users.filter((u) => u && u.email && u.pass);
  if (!s.users.length) {
    s.users = [{
      id: 'u-owner',
      name: s.company?.name || 'Dueño',
      email: 'ramberamericasefectivo@gmail.com',
      pass: '1234',
      role: 'OWNER',
      pin: '1234',
      active: true,
      commission: 0,
      balance: 0,
    }];
  }
  if (s.user) s.user.role = String(s.user.role || '').toUpperCase();
  if (s.user && (!s.user.email || !s.user.pass)) {
    s.user = s.users.find((u) => u.id === s.user.id)
      || s.users.find((u) => u.role === 'owner')
      || s.users[0];
  }

  // stock → stock por sucursal
  (s.products || []).forEach((p) => {
    if (!p.branchStock) {
      const baseStock = p.stock || {};
      p.branchStock = {};
      s.branches.forEach((b) => {
        p.branchStock[b.id] = {};
        Object.entries(baseStock).forEach(([k, v]) => { p.branchStock[b.id][k] = Number(v) || 0; });
      });
      delete p.stock;
    }
    if (p.price != null) p.price = Number(p.price);
  });
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const s = JSON.parse(raw);
    if (!s.products) return seed();
    const migrated = migrate(s);
    // guarda reparaciones (usuarios, etc.) de inmediato
    try { localStorage.setItem(KEY, JSON.stringify(migrated)); } catch {}
    return migrated;
  } catch { return seed(); }
}

export const state = load();

let listeners = [];
export function subscribe(fn) { listeners.push(fn); return () => (listeners = listeners.filter((f) => f !== fn)); }
export function emit() {
  if (!state.personal || !Array.isArray(state.personal.movements)) state.personal = { movements: [] };
  save(); listeners.forEach((f) => f());
}

let pushTimer = null;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save fail', e); }
  if (!pushTimer) pushTimer = setTimeout(() => { pushTimer = null; pushToServer(); }, 600);
}

let serverOff = false;
async function pushToServer() {
  if (serverOff) return;            // en Vercel no hay servidor local: se usa Supabase
  try {
    const r = await fetch('/api/state?c=' + encodeURIComponent(state.currentCompany || 'default'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...state, savedAt: new Date().toISOString() }),
    });
    if (r.status === 404 || r.status === 405) serverOff = true;
  } catch { /* offline */ }
}

export async function hydrate() {
  try {
    const r = await fetch('/api/state?c=' + encodeURIComponent(state.currentCompany || 'default'), { cache: 'no-store' });
    if (r.ok) {
      const db = await r.json();
      if (db && Array.isArray(db.products) && db.products.length) {
        const merged = migrate(db);
        // conserva la API key local si el servidor no tiene una
        try {
          const local = JSON.parse(localStorage.getItem(KEY) || 'null');
          if (local?.settings?.aiKey && !merged.settings?.aiKey) {
            merged.settings = { ...(merged.settings || {}), ...local.settings };
          }
        } catch {}
        Object.assign(state, merged);
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
        return 'server';
      }
    }
    pushToServer();
    return 'local';
  } catch { return 'offline'; }
}

export function resetDemo() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(SKEY);
  location.reload();
}

/* ================= Sesión ================= */
export function readSession() {
  try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch { return null; }
}
export function currentUser() {
  const s = readSession();
  const u = s && state.users.find((x) => x.id === s.userId);
  return u || null;
}
export function login(email, pass) {
  const u = state.users.find((x) => x.email.toLowerCase() === String(email).toLowerCase().trim() && x.pass === String(pass));
  if (!u || !u.active) return { ok: false, msg: 'Correo o contraseña incorrectos' };
  localStorage.setItem(SKEY, JSON.stringify({ userId: u.id, at: Date.now() }));
  state.user = u;
  return { ok: true, user: u };
}
export function logout() { localStorage.removeItem(SKEY); }

export function can(perm) {
  const u = currentUser();
  if (!u) return false;
  const perms = ROLES[String(u.role || '').toUpperCase()]?.perms || [];
  if (perms.includes('*')) return true;
  return perms.includes(perm);
}

/* ================= Consultas ================= */
export const branch = () => state.branches.find((b) => b.id === state.currentBranch) || state.branches[0];
export const sectionOf = (p) => SECTIONS[p.section] || { label: '—' };
export const sectionsForMode = () => Object.entries(SECTIONS).filter(([, s]) => s.mode === state.company.mode);
export const productById = (id) => state.products.find((p) => p.id === id);

export function stockOf(p, size, branchId = state.currentBranch) {
  return Number(p?.branchStock?.[branchId]?.[fmtSize(size)] || 0);
}
export function totalStock(p, branchId = state.currentBranch) {
  const b = p?.branchStock?.[branchId] || {};
  return Object.values(b).reduce((a, x) => a + Number(x || 0), 0);
}
export function stockAnywhere(p, size) {
  return state.branches
    .map((b) => ({ branch: b.name, qty: stockOf(p, size, b.id) }))
    .filter((x) => x.qty > 0);
}

/* ================= Carrito ================= */
export function makeCart() { return { lines: [], discount: 0, coupon: null }; }
export function cartTotals(cart) {
  const subtotal = cart.lines.reduce((a, l) => a + l.price * l.qty, 0);
  const discount = Math.min(cart.discount || 0, subtotal);
  return { subtotal, discount, total: Math.max(0, subtotal - discount), count: cart.lines.reduce((a, l) => a + l.qty, 0) };
}
export function addLine(cart, product, size) {
  const key = product.id + '|' + fmtSize(size);
  const found = cart.lines.find((l) => l.key === key);
  const available = stockOf(product, size);
  if (found) {
    if (found.qty + 1 > available) return { ok: false, msg: 'Sin stock en talla ' + fmtSize(size) };
    found.qty += 1;
    return { ok: true };
  }
  if (available < 1) return { ok: false, msg: 'Sin stock en talla ' + fmtSize(size) };
  cart.lines.push({ key, productId: product.id, name: product.name, size: fmtSize(size), price: product.price, qty: 1, color: product.color });
  return { ok: true };
}

/* ================= Ventas ================= */
export function nextCode() { const n = state.seq++; return `${branch().id === 'b1' ? 1 : 2}-${1000 + n}`; }

export function commitSale({ cart, method, received, customerName, note, customerId, payments, fiscalMode }) {
  const t = cartTotals(cart);
  const hasSplit = Array.isArray(payments) && payments.length;
  const totalReceived = hasSplit ? payments.reduce((a, p) => a + p.amount, 0) : (received ?? t.total);
  const sale = {
    id: uid('s'), code: nextCode(), date: new Date().toISOString(),
    branchId: state.currentBranch, branchName: branch().name,
    user: state.user.name, customer: customerName || '-', customerId: customerId || null,
    note: note || '',
    items: cart.lines.map((l) => ({ ...l })),
    subtotal: t.subtotal, discount: t.discount, total: t.total,
    method: hasSplit ? 'split' : method,
    payments: hasSplit ? payments : null,
    // Fiscal = cobrado con tarjeta · Interno = cobrado en efectivo
    fiscalMode: (hasSplit
      ? payments.some((p) => p.method === 'debit' || p.method === 'credit')
      : (method === 'debit' || method === 'credit')) ? 'fiscal' : 'interno',
    received: totalReceived, change: Math.max(0, totalReceived - t.total),
    status: 'done', cancelReason: null, cancelledAt: null,
  };
  sale.userId = state.user.id;
  sale.commission = commissionOf(sale);
  sale.items.forEach((l) => {
    const p = productById(l.productId);
    const b = p?.branchStock?.[state.currentBranch];
    if (b && b[l.size] != null) b[l.size] = Math.max(0, Number(b[l.size]) - l.qty);
  });
  if (customerId && (method === 'credit_sale' || (payments || []).some((p) => p.method === 'credit_sale'))) {
    const c = state.customers.find((x) => x.id === customerId);
    if (c) c.balance = (c.balance || 0) + t.total;
  }
  state.sales.unshift(sale);
  // movimiento de caja por la parte en efectivo
  const cashPart = hasSplit ? payments.filter((p) => p.method === 'cash').reduce((a, p) => a + p.amount, 0) : (method === 'cash' ? t.total : 0);
  if (cashPart > 0) addCash('in', cashPart, 'Venta ' + sale.code);
  emit();
  return sale;
}

export function cancelSale(saleId, reason) {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale || sale.status === 'cancelled') return;
  sale.items.forEach((l) => {
    const p = productById(l.productId);
    const b = p?.branchStock?.[sale.branchId];
    if (b && b[l.size] != null) b[l.size] = Number(b[l.size]) + l.qty;
  });
  if (sale.customerId && sale.method === 'credit_sale') {
    const c = state.customers.find((x) => x.id === sale.customerId);
    if (c) c.balance = Math.max(0, (c.balance || 0) - sale.total);
  }
  sale.status = 'cancelled';
  sale.cancelReason = reason || 'Sin motivo';
  sale.cancelledAt = new Date().toISOString();
  emit();
}

/* ================= Productos ================= */
export function upsertProduct(data) {
  if (data.id) {
    const p = productById(data.id);
    Object.assign(p, data);
  } else {
    const p = {
      id: uid('p'), active: true, catalog: true, color: COLORS[state.products.length % COLORS.length],
      branchStock: {}, ...data,
    };
    state.products.push(p);
  }
  emit();
}
export function deleteProduct(id) {
  state.products = state.products.filter((p) => p.id !== id);
  emit();
}

/* ================= Clientes ================= */
export function upsertCustomer(data) {
  if (data.id) {
    const c = state.customers.find((x) => x.id === data.id);
    Object.assign(c, data);
  } else {
    state.customers.push({ id: uid('c'), balance: 0, creditLimit: 0, ...data });
  }
  emit();
}
export function customerById(id) { return state.customers.find((c) => c.id === id); }

/* ================= Sucursales ================= */
export function setBranch(id) {
  if (!state.branches.some((b) => b.id === id)) return;
  state.currentBranch = id;
  emit();
}
export function transferStock(productId, size, fromId, toId, qty) {
  const p = productById(productId);
  if (!p) return { ok: false, msg: 'Producto no encontrado' };
  const from = p.branchStock[fromId], to = p.branchStock[toId];
  if (!from || !to) return { ok: false, msg: 'Sucursal inválida' };
  const have = Number(from[size] || 0);
  if (have < qty) return { ok: false, msg: 'Solo hay ' + have + ' en origen' };
  from[size] = have - qty;
  to[size] = Number(to[size] || 0) + qty;
  emit();
  return { ok: true };
}

/* ================= Cupones ================= */
export function applyCoupon(code, subtotal) {
  const c = state.coupons.find((x) => x.code.toLowerCase() === String(code).toLowerCase().trim() && x.active);
  if (!c) return { ok: false, msg: 'Cupón no válido' };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { ok: false, msg: 'Cupón vencido' };
  let value = 0;
  if (c.type === 'PERCENT') value = Math.round(subtotal * c.value / 100);
  else value = Math.min(c.value, subtotal);
  return { ok: true, value, coupon: c };
}
export function upsertCoupon(data) {
  if (data.id) {
    const c = state.coupons.find((x) => x.id === data.id);
    Object.assign(c, data);
  } else {
    state.coupons.push({ id: uid('cp'), active: true, ...data });
  }
  emit();
}

/* ================= Apartados ================= */
export function createLayaway({ cart, customerId, customerName }) {
  const t = cartTotals(cart);
  const lay = {
    id: uid('l'), code: 'AP-' + state.seq++, date: new Date().toISOString(),
    branchId: state.currentBranch, customerId: customerId || null, customerName: customerName || '-',
    items: cart.lines.map((l) => ({ ...l })), total: t.total, paid: 0,
    status: 'active', payments: [],
  };
  // descuenta stock
  lay.items.forEach((l) => {
    const p = productById(l.productId);
    const b = p?.branchStock?.[state.currentBranch];
    if (b && b[l.size] != null) b[l.size] = Math.max(0, Number(b[l.size]) - l.qty);
  });
  state.layaways.unshift(lay);
  emit();
  return lay;
}
export function layawayPayment(id, amount) {
  const l = state.layaways.find((x) => x.id === id);
  if (!l) return;
  l.paid = (l.paid || 0) + amount;
  l.payments.push({ amount, date: new Date().toISOString() });
  addCash('in', amount, 'Abono apartado ' + l.code);
  if (l.paid >= l.total) l.status = 'done';
  emit();
}
export function cancelLayaway(id) {
  const l = state.layaways.find((x) => x.id === id);
  if (!l || l.status !== 'active') return;
  l.items.forEach((it) => {
    const p = productById(it.productId);
    const b = p?.branchStock?.[l.branchId];
    if (b && b[it.size] != null) b[it.size] = Number(b[it.size]) + it.qty;
  });
  l.status = 'cancelled';
  emit();
}

/* ================= Caja ================= */
export function openRegister(amount) {
  state.register = { open: true, opening: Number(amount) || 0, openedAt: new Date().toISOString() };
  addCash('open', amount, 'Apertura de caja');
  emit();
}
export function closeRegister() {
  state.register = { open: false, opening: 0 };
  addCash('close', 0, 'Cierre de caja');
  emit();
}
function addCash(type, amount, note) {
  state.cashMovements.push({
    id: uid('cm'), type, amount: Number(amount) || 0, note,
    user: state.user.name, date: new Date().toISOString(), branchId: state.currentBranch,
  });
}
export function registerSummary() {
  const mv = state.cashMovements.filter((m) => m.branchId === state.currentBranch);
  const inc = mv.filter((m) => m.type === 'in' || m.type === 'open').reduce((a, m) => a + m.amount, 0);
  const out = mv.filter((m) => m.type === 'out').reduce((a, m) => a + m.amount, 0);
  const cashSales = state.sales
    .filter((s) => s.status === 'done' && s.method === 'cash' && s.branchId === state.currentBranch)
    .reduce((a, s) => a + s.total, 0);
  return { opening: state.register.opening, inc, out, cashSales, expected: state.register.opening + cashSales + inc - out };
}

/* ================= Gastos ================= */
export function upsertExpense(data) {
  if (data.id) {
    const e = state.expenses.find((x) => x.id === data.id);
    Object.assign(e, data);
  } else {
    state.expenses.unshift({ id: uid('x'), paid: false, date: new Date().toISOString(), ...data });
  }
  emit();
}
export function payExpense(id) {
  const e = state.expenses.find((x) => x.id === id);
  if (e) { e.paid = true; addCash('out', e.amount, 'Gasto: ' + e.name); emit(); }
}
/* ================= Multiempresa ================= */
export function switchCompany(id) {
  state.currentCompany = id;
  const c = state.companies.find((x) => x.id === id);
  if (c) state.company.name = c.name;
  emit();
}
export function createCompany(name) {
  const id = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || ('negocio-' + Date.now().toString(36));
  if (!state.companies.some((x) => x.id === id)) state.companies.push({ id, name });
  return id;
}
/* ================= Checador ================= */
export const TIME_TYPES = {
  ENTRY: 'Entrada', EXIT: 'Salida', BREAK_START: 'Descanso', BREAK_END: 'Fin descanso',
};

export function timeAction(userId, type) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return null;
  const rec = {
    id: uid('t'), userId, userName: u.name, type,
    timestamp: new Date().toISOString(), branchId: state.currentBranch,
  };
  state.timeRecords.push(rec);
  emit();
  return rec;
}

export function recordsFor(userId, dateStr = new Date().toISOString()) {
  const day = new Date(dateStr).toDateString();
  return state.timeRecords
    .filter((r) => r.userId === userId && new Date(r.timestamp).toDateString() === day)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function dayStats(userId, dateStr = new Date().toISOString()) {
  const recs = recordsFor(userId, dateStr);
  const first = (t) => recs.find((r) => r.type === t) || null;
  const last = (t) => [...recs].reverse().find((r) => r.type === t) || null;
  const entry = first('ENTRY');
  const exit = last('EXIT');
  let breakMin = 0;
  let open = null;
  recs.forEach((r) => {
    if (r.type === 'BREAK_START') open = new Date(r.timestamp);
    if (r.type === 'BREAK_END' && open) { breakMin += (new Date(r.timestamp) - open) / 60000; open = null; }
  });
  let minutes = 0;
  if (entry) {
    const end = exit ? new Date(exit.timestamp) : new Date();
    minutes = Math.max(0, (end - new Date(entry.timestamp)) / 60000);
  }
  return {
    entry, exit, breakStart: first('BREAK_START'), breakEnd: last('BREAK_END'),
    minutes: Math.max(0, minutes - breakMin), breakMin,
    working: !!entry && !exit,
    onBreak: !!open,
    records: recs,
  };
}

export function weekStats(userId, days = 7) {
  let minutes = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    minutes += dayStats(userId, d.toISOString()).minutes;
  }
  return minutes;
}

export function payFor(user, minutes) {
  if (!user) return 0;
  const rate = Number(user.payRate) || 0;
  if (user.payType === 'DAILY') return minutes > 0 ? rate : 0;
  return (minutes / 60) * rate;
}

export function hhmm(minutes) {
  const m = Math.max(0, Math.round(minutes));
  return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}
/* ================= Nómina ================= */
export function payroll(fromISO, toISO) {
  const from = new Date(fromISO), to = new Date(toISO);
  return state.users.filter((u) => u.active).map((u) => {
    let minutes = 0; const days = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const s = dayStats(u.id, d.toISOString());
      if (s.minutes > 0) { days.push({ date: new Date(d).toISOString(), minutes: s.minutes }); minutes += s.minutes; }
    }
    return { user: u, minutes, days: days.length, detail: days, pay: payFor(u, minutes) };
  });
}
/* ================= Finanzas personales ================= */
export const PERSONAL_CATS_OUT = ['Comida', 'Casa', 'Transporte', 'Salud', 'Ropa', 'Escuela', 'Servicios', 'Ocio', 'Otros'];
export const PERSONAL_CATS_IN = ['Sueldo', 'Ventas', 'Préstamo', 'Devolución', 'Otros'];

export function addPersonalMovement({ type, amount, method, category, note }) {
  if (!state.personal || !Array.isArray(state.personal.movements)) state.personal = { movements: [] };
  const mv = {
    id: uid('pm'), type: type === 'in' ? 'in' : 'out',
    amount: Math.abs(Number(amount) || 0),
    method: method === 'card' ? 'card' : 'cash',
    category: category || 'Otros',
    note: note || '',
    date: new Date().toISOString(),
    branchId: state.currentBranch,
  };
  state.personal.movements.push(mv);
  emit();
  return mv;
}

export function personalSummary(fromISO, toISO) {
  const from = new Date(fromISO), to = new Date(toISO);
  if (!state.personal || !Array.isArray(state.personal.movements)) state.personal = { movements: [] };
  const mv = state.personal.movements.filter((m) => {
    const d = new Date(m.date);
    return d >= from && d <= to;
  });
  const inc = mv.filter((m) => m.type === 'in').reduce((a, m) => a + m.amount, 0);
  const out = mv.filter((m) => m.type === 'out').reduce((a, m) => a + m.amount, 0);
  const cash = mv.filter((m) => m.method === 'cash');
  const card = mv.filter((m) => m.method === 'card');
  return {
    ingresos: inc, gastos: out, balance: inc - out,
    efectivo: cash.reduce((a, m) => a + (m.type === 'in' ? m.amount : -m.amount), 0),
    tarjeta: card.reduce((a, m) => a + (m.type === 'in' ? m.amount : -m.amount), 0),
    movimientos: mv.length, detalle: mv.slice().reverse().slice(0, 50),
  };
}

/* Gastos fijos (recurrentes) */
export function setSavingGoal(amount) {
  if (!state.settings) state.settings = {};
  state.settings.savingGoal = Math.max(0, Number(amount) || 0);
  emit();
  return state.settings.savingGoal;
}

export function expenseMonthly(e) {
  return e.freq === 'anual' ? (Number(e.amount) || 0) / 12
    : e.freq === 'semanal' ? (Number(e.amount) || 0) * 4.33
    : (Number(e.amount) || 0);
}
export function fixedMonthlyTotal() {
  return state.expenses.filter((e) => e.recurring).reduce((a, e) => a + expenseMonthly(e), 0);
}
/* ================= Comisiones, metas y documentos ================= */
export function commissionOf(sale) {
  const u = state.users.find((x) => x.id === sale.userId) || state.users.find((x) => x.name === sale.user);
  const pct = Number(u?.commissionPct || 0);
  if (!pct) return 0;
  return Math.round(sale.total * (pct / 100) * 100) / 100;
}

export function sellerStats(userId, fromISO, toISO) {
  const from = new Date(fromISO), to = new Date(toISO);
  const sales = state.sales.filter((s) => s.status === 'done' && s.userId === userId
    && new Date(s.date) >= from && new Date(s.date) <= to);
  const total = sales.reduce((a, s) => a + s.total, 0);
  const commission = sales.reduce((a, s) => a + (s.commission != null ? s.commission : commissionOf(s)), 0);
  return { userId, unidades: sales.reduce((a, s) => a + s.items.reduce((x, i) => x + i.qty, 0), 0), tickets: sales.length, total, comision: commission };
}

export function setGoal({ scope, userId, period, target }) {
  if (!Array.isArray(state.goals)) state.goals = [];
  const key = { scope, userId: scope === 'seller' ? userId : null, period };
  const existing = state.goals.find((g) => g.scope === key.scope && g.userId === key.userId && g.period === key.period);
  if (existing) existing.target = Math.max(0, Number(target) || 0);
  else state.goals.push({ id: uid('goal'), scope, userId: key.userId, period, target: Math.max(0, Number(target) || 0) });
  emit();
}

export function goalFor(scope, userId, period) {
  return (state.goals || []).find((g) => g.scope === scope
    && (scope === 'seller' ? g.userId === userId : true) && g.period === period);
}

export function goalRange(period) {
  const now = new Date();
  if (period === 'day') { const d = new Date(now); d.setHours(0, 0, 0, 0); return [d, now]; }
  if (period === 'week') { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return [d, now]; }
  if (period === 'year') return [new Date(now.getFullYear(), 0, 1), now];
  return [new Date(now.getFullYear(), now.getMonth(), 1), now];
}

export function goalProgress(goal) {
  const [from, to] = goalRange(goal.period);
  const sales = state.sales.filter((s) => s.status === 'done'
    && (!goal.userId || s.userId === goal.userId)
    && new Date(s.date) >= from && new Date(s.date) <= to);
  const done = sales.reduce((a, s) => a + s.total, 0);
  return { done, target: goal.target || 0, pct: goal.target > 0 ? Math.min(100, Math.round((done / goal.target) * 100)) : 0, tickets: sales.length };
}

export function addUserDoc(userId, doc) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return;
  if (!Array.isArray(u.docs)) u.docs = [];
  u.docs.push({ id: uid('doc'), date: new Date().toISOString(), ...doc });
  emit();
}

export function removeUserDoc(userId, docId) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return;
  u.docs = (u.docs || []).filter((d) => d.id !== docId);
  emit();
}

export function setUserCredential(userId, cred) {
  const u = state.users.find((x) => x.id === userId);
  if (!u) return;
  u.webauthn = cred;
  emit();
}
/* ================= Lotes de importación (deshacer) ================= */
export function recordImport({ id, fileName, ids, source }) {
  if (!Array.isArray(state.imports)) state.imports = [];
  const batch = {
    id: id || ('imp' + Date.now()),
    date: new Date().toISOString(),
    fileName: fileName || 'archivo',
    source: source || 'excel',
    ids: ids.slice(),
    count: ids.length,
  };
  state.imports.unshift(batch);
  if (state.imports.length > 20) state.imports = state.imports.slice(0, 20);
  emit();
  return batch;
}

export function undoImport(batchId) {
  const b = (state.imports || []).find((x) => x.id === batchId);
  if (!b) return 0;
  const before = state.products.length;
  state.products = state.products.filter((p) => p.importBatch !== batchId);
  state.imports = state.imports.filter((x) => x.id !== batchId);
  emit();
  return before - state.products.length;
}

/** Respaldo: si no hay lote registrado, borra los productos creados en los últimos N minutos. */
export function undoRecentProducts(minutes = 30) {
  const limit = Date.now() - minutes * 60000;
  const ids = state.products
    .filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= limit)
    .map((p) => p.id);
  if (!ids.length) return 0;
  const set = new Set(ids);
  state.products = state.products.filter((p) => !set.has(p.id));
  emit();
  return ids.length;
}
/* ================= Empezar de cero (quitar el demo) ================= */
export function resetToBlank() {
  // Conserva: empresa, sucursales, configuración, usuarios y al dueño
  const owner = state.users.find((u) => u.role === 'owner') || state.users[0] || null;

  state.products = [];
  state.sales = [];
  state.customers = [];
  state.layaways = [];
  state.coupons = [];
  state.expenses = [];
  state.cashMovements = [];
  state.timeRecords = [];
  state.goals = [];
  state.imports = [];
  state.personal = { movements: [] };
  state.register = { open: false, opening: 0 };

  if (owner) {
    state.users = [{
      ...owner,
      role: 'OWNER',
      active: true,
      balance: 0,
    }];
    state.user = state.users[0];
  }

  state.cart = makeCart ? makeCart() : [];
  emit();
  return true;
}

/** Respaldo completo en JSON (para guardar antes de limpiar). */
export function exportBackup() {
  return JSON.stringify({ zoco: 2, exportedAt: new Date().toISOString(), data: state }, null, 2);
}