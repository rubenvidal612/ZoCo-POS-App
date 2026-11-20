// Datos del demo interactivo: zapatería ficticia con fotos, tallas, colores,
// existencias, clientes, ventas de ejemplo y caja abierta.
// Todo vive SOLO en localStorage del navegador (clave zoco.demo.v1).

/** Foto del producto dibujada como SVG (sin depender de internet ni licencias). */
function shoePhoto(colorHex, colorName) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F8FAFC"/><stop offset="1" stop-color="#E2E8F0"/>
      </linearGradient>
      <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${colorHex}"/><stop offset="1" stop-color="#0F172A"/>
      </linearGradient>
    </defs>
    <rect width="420" height="300" fill="url(#bg)"/>
    <ellipse cx="210" cy="238" rx="132" ry="20" fill="#0F172A" opacity=".10"/>
    <path d="M96 214c-6-26 2-46 16-66 10-15 12-30 10-48 22 2 34 14 44 30 8 13 18 19 34 22l52 10c26 5 42 18 46 38 2 12-4 20-16 22l-152 10c-18 1-30-4-34-18z"
      fill="url(#sh)"/>
    <path d="M108 196c22 8 54 12 92 10l96-7" stroke="#F8FAFC" stroke-width="5" fill="none" opacity=".55" stroke-linecap="round"/>
    <path d="M132 150c14 6 30 10 46 10" stroke="#F8FAFC" stroke-width="4" fill="none" opacity=".4" stroke-linecap="round"/>
    <circle cx="150" cy="120" r="4" fill="#F8FAFC" opacity=".7"/>
    <circle cx="168" cy="132" r="4" fill="#F8FAFC" opacity=".7"/>
    <text x="210" y="278" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="#475569">${colorName}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

const COLORS = {
  Negro: '#1F2937',
  Blanco: '#CBD5E1',
  Café: '#8B5E34',
  Rojo: '#B91C1C',
  Azul: '#1D4ED8',
  Rosa: '#DB2777',
  Beige: '#D9C7A7',
};

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
};

function buildShoe(id, name, code, price, cost, section, colors, stockPorTalla) {
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
    image: shoePhoto(COLORS[colors[0]] || '#1F2937', colors[0]),
    active: true,
    catalog: true,
    isDemo: true,
    sellBy: 'pza',
    stockHistory: [],
    branchStock,
  };
}

export function buildDemoState() {
  const now = Date.now();
  const haceDias = (d) => new Date(now - d * 864e5).toISOString();

  const products = [
    buildShoe('dp1', 'Zapato escolar negro', 'ZP-ESC-NEG', 499, 260, 'escolar', ['Negro'], [4, 6, 8, 6, 5, 3]),
    buildShoe('dp2', 'Tenis casual urbano', 'TN-URB-001', 799, 420, 'dama', ['Blanco', 'Rosa'], [3, 5, 7, 6, 4, 2]),
    buildShoe('dp3', 'Bota vaquera café', 'BT-VAQ-CAF', 1290, 720, 'caballero', ['Café'], [2, 3, 5, 4, 3, 2]),
    buildShoe('dp4', 'Sandalia de mujer', 'SD-MUJ-002', 449, 210, 'dama', ['Beige', 'Negro'], [5, 6, 6, 4, 3, 2]),
    buildShoe('dp5', 'Zapato formal caballero', 'ZF-CAB-003', 949, 520, 'caballero', ['Negro', 'Café'], [2, 4, 5, 5, 3, 2]),
    buildShoe('dp6', 'Tenis infantil con luz', 'TN-INF-004', 399, 190, 'infantil', ['Azul', 'Rojo'], [6, 7, 6, 5, 4, 2]),
    buildShoe('dp7', 'Mocasín casual', 'MC-CAS-005', 699, 350, 'caballero', ['Beige'], [3, 4, 5, 4, 3, 2]),
    buildShoe('dp8', 'Baleta de vestir', 'BL-VES-006', 549, 280, 'dama', ['Negro', 'Rosa'], [4, 5, 6, 5, 3, 2]),
  ];

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
      status: 'received', items: [poItem(products[0], '3', 'Negro', 12, 12, 260)],
      total: 3120, paid: 3120, creditApplied: 0,
      payments: [{ at: haceDias(10), amount: 3120, note: 'Transferencia' }],
      note: 'Pedido de temporada escolar', photo: null,
    },
    {
      id: 'dpo2', folio: 'OC-9001', supplierId: 'dsup2', date: haceDias(6), branchId: 'b1',
      status: 'partial',
      items: [poItem(products[2], '25', 'Café', 8, 5, 720), poItem(products[4], '26', 'Negro', 6, 0, 520)],
      total: 8880, paid: 3000, creditApplied: 0,
      payments: [{ at: haceDias(4), amount: 3000, note: 'Anticipo' }],
      note: 'Faltan 3 pares de la bota', photo: null,
    },
    {
      id: 'dpo3', folio: 'OC-9002', supplierId: 'dsup3', date: haceDias(1), branchId: 'b1',
      status: 'ordered', items: [poItem(products[1], '25', 'Blanco', 10, 0, 420)],
      total: 4200, paid: 0, creditApplied: 0,
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
      items: [item(products[0], '3', 'Negro', 1, 499)],
      subtotal: 499, discount: 0, total: 499,
      method: 'cash', payments: null, fiscalMode: 'interno',
      received: 500, change: 1, status: 'done', cancelReason: null, cancelledAt: null,
    },
    {
      id: 'ds2', code: 'F-5000', date: haceDias(1), branchId: 'b1', branchName: 'Centro',
      user: 'Demo Dueño', customer: 'Jorge Ramírez', customerId: 'dc2', note: '',
      items: [item(products[1], '25', 'Blanco', 1, 799), item(products[5], '15', 'Azul', 1, 399)],
      subtotal: 1198, discount: 0, total: 1198,
      method: 'debit', payments: null, fiscalMode: 'fiscal',
      received: 1198, change: 0, status: 'done', cancelReason: null, cancelledAt: null,
    },
    {
      id: 'ds3', code: '1-1001', date: new Date(now - 3 * 3600e3).toISOString(), branchId: 'b1', branchName: 'Centro',
      user: 'Demo Dueño', customer: 'Sofía Herrera', customerId: 'dc3', note: '',
      items: [item(products[3], '24', 'Beige', 2, 449)],
      subtotal: 898, discount: 50, total: 848,
      method: 'cash', payments: null, fiscalMode: 'interno',
      received: 900, change: 52, status: 'done', cancelReason: null, cancelledAt: null,
    },
  ];

  const cashMovements = [
    { id: 'cm0', date: haceDias(2), type: 'open', amount: 500, note: 'Apertura de caja', branchId: 'b1', user: 'Demo Dueño' },
    { id: 'cm1', date: sales[0].date, type: 'in', amount: 499, note: 'Venta 1-1000', branchId: 'b1', user: 'Demo Dueño' },
    { id: 'cm2', date: sales[2].date, type: 'in', amount: 848, note: 'Venta 1-1001', branchId: 'b1', user: 'Demo Dueño' },
    { id: 'cm3', date: new Date(now - 2 * 3600e3).toISOString(), type: 'out', amount: 120, note: 'Compra de bolsas', branchId: 'b1', user: 'Demo Dueño' },
  ];

  return {
    version: 1,
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
