import { shoeDemoRows, boutiqueDemoRows } from './demo-catalog.js';

// Datos del demo interactivo: zapatería ficticia con fotos, tallas, colores,
// existencias, clientes, ventas de ejemplo y caja abierta.
// Todo vive SOLO en localStorage del navegador (clave zoco.demo.v1).

/** Tallas reales de cada sección (deben coincidir con SECTIONS del store). */
function rank(from, to) {
  const out = [];
  for (let v = from; v <= to + 1e-9; v += 0.5) out.push(Number.isInteger(v) ? String(v) : v.toFixed(1));
  return out;
}
const SIZE_SETS = {
  dama: rank(22, 27),
  infantil: rank(12, 21.5),
  caballero: rank(22, 30),
  escolar: rank(1, 6.5),
  bolsas: ['Único'],
  carteras: ['Único'],
  accesorios: ['Único'],
  ropa: ['CH', 'M', 'G'],
  calzado: rank(22, 30),
};

function buildProduct(id, [name, section, price, cost, image], code, colors, stockPorTalla) {
  const sizes = SIZE_SETS[section] || SIZE_SETS.dama;
  const branchStock = { b1: {}, b2: {} };
  colors.forEach((c, ci) => {
    sizes.forEach((s, i) => {
      const base = stockPorTalla[i % stockPorTalla.length] ?? 2;
      const ajuste = ci === 0 ? 0 : 1;
      branchStock.b1[`${s}|${c}`] = Math.max(0, base - ajuste);
      branchStock.b2[`${s}|${c}`] = Math.max(0, Math.round(base / 2));
    });
  });
  return {
    id, name, code, price, cost, section,
    colors: colors.slice(),
    color: colors[0],
    image,
    active: true,
    catalog: true,
    isDemo: true,
    sellBy: 'pza',
    stockHistory: [],
    branchStock,
  };
}

function buildDemoProducts() {
  const rows = [...shoeDemoRows, ...boutiqueDemoRows];
  const colors = ['Blanco', 'Café', 'Beige', 'Negro', 'Negro', 'Negro', 'Blanco', 'Azul', 'Negro', 'Café'];
  return rows.map((row, index) => buildProduct(
    'dp-photo-' + index, row, 'DEMO-' + (index + 1), [colors[index]], [4, 6, 8, 6, 5, 3],
  ));
}

export function upgradeDemoCatalog(data) {
  if (data.photoCatalogVersion === 1) return false;
  const legacy = data.products.filter(product =>
    product.isDemo && /^dp[1-8]$/.test(product.id) &&
    product.image?.startsWith('data:image/svg+xml;charset=utf-8,'));
  if (legacy.length) {
    legacy.forEach(product => { product.active = false; product.catalog = false; });
    const known = new Set(data.products.map(product => product.id));
    data.products.push(...buildDemoProducts().filter(product => !known.has(product.id)));
  }
  data.photoCatalogVersion = 1;
  return true;
}

export function buildDemoState() {
  const now = Date.now();
  const haceDias = (d) => new Date(now - d * 864e5).toISOString();
  const products = buildDemoProducts();

  const customers = [
    { id: 'dc1', name: 'María López', phone: '555-102-3344', email: 'maria@ejemplo.com', balance: 0, creditLimit: 0, notes: 'Cliente frecuente' },
    { id: 'dc2', name: 'Jorge Ramírez', phone: '555-887-1122', email: 'jorge@ejemplo.com', balance: 0, creditLimit: 0, notes: '' },
    { id: 'dc3', name: 'Sofía Herrera', phone: '555-443-9911', email: 'sofia@ejemplo.com', balance: 0, creditLimit: 0, notes: 'Le gusta el rosa' },
    { id: 'dc4', name: 'Luis Fernández', phone: '555-221-7788', email: 'luis@ejemplo.com', balance: 0, creditLimit: 0, notes: '' },
  ];

  // ===== Proveedores y compras de ejemplo (módulo Compras) =====
  const suppliers = [
    { id: 'dsup1', name: 'Distribuidora del Valle', phone: '555-700-1122', email: 'ventas@delvalle.mx', notes: 'Entrega martes y jueves' },
    { id: 'dsup2', name: 'Calzado León', phone: '555-700-3344', email: 'pedidos@calzadoleon.mx', notes: 'Mínimo 6 pares por modelo' },
    { id: 'dsup3', name: 'Importadora Sur', phone: '555-700-5566', email: '', notes: '' },
  ];

  const poItem = (p, size, color, qty, received, cost) => ({
    productId: p.id, vkey: `${size}|${color}`, qty, received, cost,
  });

  const purchases = [
    {
      id: 'dpo1', folio: 'OC-9000', supplierId: 'dsup1', date: haceDias(12), branchId: 'b1',
      status: 'received', items: [poItem(products[3], '3', 'Negro', 12, 12, 260)],
      total: 3120, paid: 3120, creditApplied: 0,
      payments: [{ at: haceDias(10), amount: 3120, note: 'Transferencia' }],
      note: 'Pedido de temporada escolar', photo: null,
    },
    {
      id: 'dpo2', folio: 'OC-9001', supplierId: 'dsup2', date: haceDias(6), branchId: 'b1',
      status: 'partial',
      items: [poItem(products[1], '25', 'Café', 8, 5, 520), poItem(products[4], 'Único', 'Negro', 6, 0, 210)],
      total: 5420, paid: 3000, creditApplied: 0,
      payments: [{ at: haceDias(4), amount: 3000, note: 'Anticipo' }],
      note: 'Faltan 3 pares de la bota', photo: null,
    },
    {
      id: 'dpo3', folio: 'OC-9002', supplierId: 'dsup3', date: haceDias(1), branchId: 'b1',
      status: 'ordered', items: [poItem(products[0], '25', 'Blanco', 10, 0, 380)],
      total: 3800, paid: 0, creditApplied: 0,
      payments: [],
      note: 'Por recibir esta semana', photo: null,
    },
  ];

  const item = (p, size, color, qty, price) => ({
    productId: p.id, name: p.name, size, vkey: `${size}|${color}`, color,
    colorVariant: color, price: price ?? p.price, qty, unit: 'pza',
  });

  const sales = [
    {
      id: 'ds1', code: '1-1000', date: haceDias(2), branchId: 'b1', branchName: 'Centro',
      user: 'Demo Dueño', customer: 'María López', customerId: 'dc1', note: '',
      items: [item(products[3], '3', 'Negro', 1, 450)],
      subtotal: 450, discount: 0, total: 450,
      method: 'cash', payments: null, fiscalMode: 'interno',
      received: 500, change: 50, status: 'done', cancelReason: null, cancelledAt: null,
    },
    {
      id: 'ds2', code: 'F-5000', date: haceDias(1), branchId: 'b1', branchName: 'Centro',
      user: 'Demo Dueño', customer: 'Jorge Ramírez', customerId: 'dc2', note: '',
      items: [item(products[0], '25', 'Blanco', 1, 690), item(products[5], 'M', 'Negro', 1, 320)],
      subtotal: 1010, discount: 0, total: 1010,
      method: 'debit', payments: null, fiscalMode: 'fiscal',
      received: 1010, change: 0, status: 'done', cancelReason: null, cancelledAt: null,
    },
    {
      id: 'ds3', code: '1-1001', date: new Date(now - 3 * 3600e3).toISOString(), branchId: 'b1', branchName: 'Centro',
      user: 'Demo Dueño', customer: 'Sofía Herrera', customerId: 'dc3', note: '',
      items: [item(products[2], '24', 'Beige', 2, 640)],
      subtotal: 1280, discount: 50, total: 1230,
      method: 'cash', payments: null, fiscalMode: 'interno',
      received: 1250, change: 20, status: 'done', cancelReason: null, cancelledAt: null,
    },
  ];

  const cashMovements = [
    { id: 'cm0', date: haceDias(2), type: 'open', amount: 500, note: 'Apertura de caja', branchId: 'b1', user: 'Demo Dueño' },
    { id: 'cm1', date: sales[0].date, type: 'in', amount: 450, note: 'Venta 1-1000', branchId: 'b1', user: 'Demo Dueño' },
    { id: 'cm2', date: sales[2].date, type: 'in', amount: 1230, note: 'Venta 1-1001', branchId: 'b1', user: 'Demo Dueño' },
    { id: 'cm3', date: new Date(now - 2 * 3600e3).toISOString(), type: 'out', amount: 120, note: 'Compra de bolsas', branchId: 'b1', user: 'Demo Dueño' },
  ];

  return {
    version: 1,
    photoCatalogVersion: 1,
    company: {
      id: 'demo-company',
      name: 'Zapatería Demo',
      legalId: '',
      phone: '555-000-0000',
      address: 'Av. Demo 123, Centro',
      theme: 'classic',
      mode: 'shoe',
      plan: 'pro',
      isDemo: true,
    },
    companies: [{ id: 'demo-company', name: 'Zapatería Demo' }],
    currentCompany: 'demo-company',
    branches: [
      { id: 'b1', name: 'Centro' },
      { id: 'b2', name: 'Plaza' },
    ],
    currentBranch: 'b1',
    users: [{
      id: 'u-demo', name: 'Demo Dueño', email: 'demo@zoco.app', pass: 'demo',
      role: 'OWNER', pin: '1234', active: true, jobTitle: 'Propietario',
      payType: 'HOURLY', payRate: 0, commission: 0, balance: 0,
    }],
    user: null,
    products,
    customers,
    suppliers,
    purchases,
    supplierCredits: {},
    sales,
    returns: [],
    adjustments: [],
    transfers: [],
    layaways: [],
    coupons: [
      { id: 'dcoup1', code: 'BIENVENIDO10', type: 'percent', value: 10, active: true, uses: 0, note: 'Demo' },
    ],
    expenses: [
      { id: 'dex1', date: haceDias(1), category: 'Renta', amount: 3500, note: 'Renta del local (ejemplo)', paid: true, paidAt: haceDias(1), branchId: 'b1' },
      { id: 'dex2', date: haceDias(3), category: 'Servicios', amount: 480, note: 'Luz (ejemplo)', paid: true, paidAt: haceDias(3), branchId: 'b1' },
    ],
    cashMovements,
    register: { open: true, opening: 500, openedAt: haceDias(2) },
    cuts: [],
    seq: 1002,
    settings: {
      extraCategoryModes: ['boutique'],
      discountMax: 100,
      aiKey: '',
      aiProvider: 'gemini',
      betaFree: true,
      ticket: { name: 'Zapatería Demo', line1: 'Av. Demo 123, Centro', footer: '¡Gracias por su compra! (demo)' },
      customFields: [],
    },
    personal: { movements: [] },
    imports: [],
    rev: 0,
    isDemo: true,
  };
}
