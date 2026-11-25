// Herramientas del asistente (tool calling) y consultas de solo lectura
import { state, productById, personalSummary, fixedMonthlyTotal, sellerStats, goalFor, goalProgress, payroll } from './store.js';

export const TOOL_DEFS = [
  {
    name: 'create_beauty_appointment',
    description: 'Agenda una cita en ZoCo Belleza, solo después de que el usuario haya dado servicio, nombre completo del profesional, nombre del cliente, teléfono y fecha/hora exacta. Requiere confirmación explícita. Fecha en ISO 8601 con zona horaria local; no inventes datos que falten.',
    parameters: { type:'object',properties: {
      service:{type:'string',description:'Nombre EXACTO del servicio configurado'},
      professional:{type:'string',description:'Nombre EXACTO del profesional que atiende'},
      customerName:{type:'string'},
      phone:{type:'string'},
      start:{type:'string',description:'Fecha y hora con zona horaria ISO 8601'},
      notes:{type:'string'},
    },required:['service','professional','customerName','phone','start']},
  },
  {
    name: 'buscar_datos',
    description: 'Consulta datos del negocio: productos, ventas, clientes, stock bajo, caja, resumen o ANALISIS FINANCIERO completo (utilidad, márgenes, tendencias, top productos, gastos). Úsala siempre antes de opinar sobre cómo va el negocio.',
    parameters: {
      type: 'object',
      properties: {
        tema: { type: 'string', enum: ['productos', 'ventas', 'clientes', 'stock_bajo', 'caja', 'resumen', 'finanzas', 'personal', 'equipo'] },
        filtro: { type: 'string', description: 'Texto para filtrar (producto, cliente, folio)' },
        dias: { type: 'number', description: 'Para finanzas: cuántos días analizar (7 por defecto, 30 o 90)' },
      },
      required: ['tema'],
    },
  },
  {
    name: 'cancel_sale',
    description: 'Cancela una venta y repone el stock. Sin folio, cancela la última.',
    parameters: { type: 'object', properties: { code: { type: 'string' }, reason: { type: 'string' } }, required: [] },
  },
  {
    name: 'set_price',
    description: 'Cambia el precio de venta de un producto. Úsala si conviene ajustar margen.',
    parameters: { type: 'object', properties: { product: { type: 'string' }, price: { type: 'number' } }, required: ['product', 'price'] },
  },
  {
    name: 'add_stock',
    description: 'Suma piezas al inventario de un producto en una talla.',
    parameters: { type: 'object', properties: { product: { type: 'string' }, qty: { type: 'number' }, size: { type: 'string' } }, required: ['product', 'qty'] },
  },
  {
    name: 'create_product',
    description: 'Da de alta un producto nuevo.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string' }, price: { type: 'number' }, qty: { type: 'number' }, section: { type: 'string' } },
      required: ['name', 'price'],
    },
  },
  {
    name: 'create_coupon',
    description: 'Crea un cupón de descuento.',
    parameters: {
      type: 'object',
      properties: { code: { type: 'string' }, value: { type: 'number' }, type: { type: 'string', enum: ['PERCENT', 'FIXED'] } },
      required: ['code', 'value'],
    },
  },
  {
    name: 'create_customer',
    description: 'Registra un cliente con límite de crédito opcional.',
    parameters: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, creditLimit: { type: 'number' } }, required: ['name'] },
  },
  {
    name: 'register_expense',
    description: 'Registra un gasto del negocio.',
    parameters: { type: 'object', properties: { name: { type: 'string' }, amount: { type: 'number' } }, required: ['name', 'amount'] },
  },
  {
    name: 'registrar_movimiento_personal',
    description: 'Registra un gasto o ingreso PERSONAL del dueño (no del negocio): comida, casa, transporte, sueldo personal, etc.',
    parameters: {
      type: 'object',
      properties: {
        monto: { type: 'number' },
        descripcion: { type: 'string' },
        metodo: { type: 'string', enum: ['efectivo', 'tarjeta'] },
        tipo: { type: 'string', enum: ['gasto', 'ingreso'] },
      },
      required: ['monto'],
    },
  },
  {
    name: 'set_saving_goal',
    description: 'Fija la meta de ahorro mensual del dueño (para calcular cuánto puede gastar al día).',
    parameters: { type: 'object', properties: { monto: { type: 'number', description: 'Meta de ahorro al mes en pesos' } }, required: ['monto'] },
  },
  { name: 'open_register', description: 'Abre la caja con fondo inicial.', parameters: { type: 'object', properties: { amount: { type: 'number' } }, required: [] } },
  { name: 'close_register', description: 'Cierra la caja del turno.', parameters: { type: 'object', properties: {}, required: [] } },
];

const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const money2 = (n) => Math.round(n * 100) / 100;

/** Utilidad bruta de una venta: (precio - costo) * cantidad, menos descuento. */
function saleProfit(s) {
  const units = sum(s.items || [], (i) => {
    const p = i.productId ? productById(i.productId) : null;
    const cost = p?.cost || 0;
    return (i.price - cost) * i.qty;
  });
  return units - (s.discount || 0);
}

function financialReport(days = 7) {
  const done = state.sales.filter((s) => s.status === 'done');
  const now = new Date();
  const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

  const from = dayStart(new Date(now.getTime() - (days - 1) * 86400000));
  const prevFrom = new Date(from.getTime() - days * 86400000);
  const inR = (s, a, b) => { const d = new Date(s.date); return d >= a && d <= b; };

  const period = done.filter((s) => inR(s, from, now));
  const prev = done.filter((s) => d(s) >= prevFrom && d(s) < from);
  function d(s) { return new Date(s.date); }

  const rev = sum(period, (s) => s.total);
  const prof = sum(period, saleProfit);
  const cost = rev - prof;
  const prevRev = sum(prev, (s) => s.total);
  const prevProf = sum(prev, saleProfit);

  const today = done.filter((s) => d(s) >= dayStart(now));
  const revToday = sum(today, (s) => s.total);

  // Mezcla de pago
  const cash = sum(period.filter((s) => s.method === 'cash'), (s) => s.total);
  const card = sum(period.filter((s) => s.method === 'debit' || s.method === 'credit' || s.method === 'split'), (s) => s.total);

  // Productos
  const byProduct = {};
  period.forEach((s) => s.items.forEach((i) => {
    const key = i.name;
    byProduct[key] = byProduct[key] || { nombre: key, unidades: 0, ingresos: 0, utilidad: 0 };
    const p = i.productId ? productById(i.productId) : null;
    byProduct[key].unidades += i.qty;
    byProduct[key].ingresos += i.price * i.qty;
    byProduct[key].utilidad += (i.price - (p?.cost || 0)) * i.qty;
  }));
  const prods = Object.values(byProduct).sort((a, b) => b.ingresos - a.ingresos);
  const vendidos = new Set(Object.keys(byProduct).map((k) => k.toLowerCase()));

  const top = prods.slice(0, 5).map((p) => ({ ...p, ingresos: money2(p.ingresos), utilidad: money2(p.utilidad) }));
  const sinVenta = state.products
    .filter((p) => !vendidos.has(p.name.toLowerCase()))
    .slice(0, 8)
    .map((p) => ({ nombre: p.name, precio: p.price, stock: Object.values(p.branchStock?.[state.currentBranch] || {}).reduce((a, x) => a + Number(x || 0), 0) }));

  const gastos = sum(state.expenses.filter((e) => e.paid && new Date(e.date) >= from), (e) => e.amount);
  const gastosPend = sum(state.expenses.filter((e) => !e.paid), (e) => e.amount);

  const porDia = {};
  for (let i = days - 1; i >= 0; i--) {
    const dd = new Date(now.getTime() - i * 86400000);
    const key = dd.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    porDia[key] = 0;
  }
  period.forEach((s) => {
    const key = new Date(s.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    if (key in porDia) porDia[key] += s.total;
  });

  return {
    periodo: { dias: days, desde: from.toISOString().slice(0, 10) },
    sucursal: state.branches.find((b) => b.id === state.currentBranch)?.name,
    ventas: {
      hoy: money2(revToday),
      periodo: money2(rev),
      tickets: period.length,
      ticket_promedio: period.length ? money2(rev / period.length) : 0,
      periodo_anterior: money2(prevRev),
      variacion_pct: prevRev > 0 ? money2(((rev - prevRev) / prevRev) * 100) : null,
    },
    utilidad: {
      bruta: money2(prof),
      costo_mercancia: money2(cost),
      margen_pct: rev > 0 ? money2((prof / rev) * 100) : 0,
      periodo_anterior: money2(prevProf),
      variacion_pct: prevProf > 0 ? money2(((prof - prevProf) / prevProf) * 100) : null,
    },
    gastos: { pagados: money2(gastos), pendientes: money2(gastosPend), resultado: money2(prof - gastos) },
    pagos: { efectivo: money2(cash), tarjeta: money2(card) },
    top_productos: top,
    sin_venta: sinVenta,
    ventas_por_dia: porDia,
    inventario: {
      productos: state.products.length,
      valor_costo: money2(sum(state.products, (p) => (p.cost || 0) * Object.values(p.branchStock?.[state.currentBranch] || {}).reduce((a, x) => a + Number(x || 0), 0))),
      stock_bajo: state.products.filter((p) => Object.values(p.branchStock?.[state.currentBranch] || {}).reduce((a, x) => a + Number(x || 0), 0) <= 3).length,
    },
    clientes_con_saldo: state.customers.filter((c) => (c.balance || 0) > 0).map((c) => ({ nombre: c.name, saldo: money2(c.balance) })),
  };
}


/** Reporte de finanzas personales con presupuesto diario recomendado. */
function personalReport() {
  const now = new Date();
  const start30 = new Date(now.getTime() - 29 * 86400000); start30.setHours(0, 0, 0, 0);
  const today0 = new Date(now); today0.setHours(0, 0, 0, 0);

  const s30 = personalSummary(start30.toISOString(), now.toISOString());
  const sHoy = personalSummary(today0.toISOString(), now.toISOString());
  const fijos = fixedMonthlyTotal();

  const ingreso = s30.ingresos;
  const gasto = s30.gastos;
  const dias = 30;
  const metaAhorro = Number(state.settings?.savingGoal || 0);

  // Sin meta de ahorro, no se descuenta nada: se toma el ingreso completo (ganancia normal).
  // Con meta, se aparta primero esa cantidad y el resto se reparte entre los días.
  let presupuesto = null;
  let base = '';
  if (ingreso > 0) {
    if (metaAhorro > 0) {
      presupuesto = Math.max(0, ingreso - metaAhorro) / dias;
      base = `tus ingresos de 30 días ($${money2(ingreso)}) menos tu meta de ahorro ($${money2(metaAhorro)}), entre 30 días`;
    } else {
      presupuesto = ingreso / dias;
      base = 'tus ingresos de 30 días entre 30 (no fijaste meta de ahorro, así que no se descuenta nada)';
    }
  } else if (gasto > 0) {
    presupuesto = Math.max(0, (gasto / dias) - (metaAhorro > 0 ? metaAhorro / dias : 0));
    base = 'tu gasto promedio diario (aún no capturas ingresos personales)';
  }

  const gastoHoy = sHoy.gastos;
  const disponible = presupuesto != null ? presupuesto - gastoHoy : null;
  const ahorroSugerido = metaAhorro > 0 ? metaAhorro : (ingreso > 0 ? ingreso * 0.1 : null);

  // Top categorías de gasto
  const cats = {};
  s30.detalle.forEach((m) => {
    if (m.type === 'out') cats[m.category || 'Otros'] = (cats[m.category || 'Otros'] || 0) + m.amount;
  });
  const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => ({ categoria: k, total: money2(v) }));

  return {
    periodo: 'últimos 30 días',
    ingresos: money2(ingreso),
    gastos: money2(gasto),
    balance: money2(ingreso - gasto),
    promedio_diario_gasto: money2(gasto / dias),
    gastos_hoy: money2(gastoHoy),
    movimientos_hoy: sHoy.movimientos,
    presupuesto_diario_recomendado: presupuesto != null ? money2(presupuesto) : null,
    meta_ahorro_mensual: money2(metaAhorro),
    base_del_presupuesto: base,
    disponible_hoy: disponible != null ? money2(disponible) : null,
    ahorro_sugerido_mes: ahorroSugerido != null ? money2(ahorroSugerido) : null,
    top_categorias: topCats,
    nota: presupuesto == null ? 'No hay datos suficientes: registra ingresos o gastos personales para calcular el presupuesto diario.' : undefined,
  };
}

/** Reporte del equipo: ventas, comisión, horas, sueldo y meta de cada vendedor. */
function teamReport(dias = 30) {
  const now = new Date();
  const from = new Date(now.getTime() - (dias - 1) * 86400000); from.setHours(0, 0, 0, 0);
  const pay = payroll(from.toISOString(), now.toISOString());
  const people = state.users.filter((u) => u.active !== false).map((u) => {
    const st = sellerStats(u.id, from.toISOString(), now.toISOString());
    const goal = goalFor('seller', u.id, 'month');
    const pr = goal ? goalProgress(goal) : null;
    const p = pay.find((x) => x.user.id === u.id);
    return {
      nombre: u.name,
      puesto: u.jobTitle || u.role,
      ventas: money2(st.total),
      tickets: st.tickets,
      comision_pct: u.commissionPct || 0,
      comision: money2(st.comision),
      horas: p ? Math.round((p.minutes / 60) * 10) / 10 : 0,
      sueldo: p ? money2(p.pay) : 0,
      total_a_pagar: money2((p ? p.pay : 0) + st.comision),
      meta_mes: goal ? goal.target : null,
      meta_avance_pct: pr ? pr.pct : null,
    };
  });
  return { periodo_dias: dias, equipo: people, total_comisiones: money2(people.reduce((a, x) => a + x.comision, 0)), total_nomina: money2(people.reduce((a, x) => a + x.total_a_pagar, 0)) };
}
export function runQuery({ tema, filtro, dias } = {}) {
  const q = String(filtro || '').toLowerCase();
  const f = (arr) => (q ? arr.filter((x) => JSON.stringify(x).toLowerCase().includes(q)) : arr);
  const branch = state.currentBranch;

  if (tema === 'finanzas') return financialReport(Number(dias) > 0 ? Number(dias) : 7);
  if (tema === 'personal') return personalReport();
  if (tema === 'equipo') return teamReport(Number(dias) > 0 ? Number(dias) : 30);

  if (tema === 'productos') {
    return {
      productos: f(state.products.map((p) => ({
        nombre: p.name, precio: p.price, costo: p.cost, sku: p.code, color: p.color,
        margen_pct: p.price > 0 ? Math.round(((p.price - (p.cost || 0)) / p.price) * 1000) / 10 : 0,
        stock: Object.values(p.branchStock?.[branch] || {}).reduce((a, x) => a + Number(x || 0), 0),
        tallas: p.branchStock?.[branch],
      }))).slice(0, 60),
    };
  }
  if (tema === 'ventas') {
    return {
      ventas: f(state.sales.map((s) => ({
        folio: s.code, total: s.total, metodo: s.method, modo: s.fiscalMode, cliente: s.customer,
        fecha: s.date, estado: s.status, utilidad: money2(saleProfit(s)),
        articulos: s.items.map((i) => i.qty + 'x ' + i.name),
      }))).slice(0, 60),
    };
  }
  if (tema === 'clientes') {
    return { clientes: f(state.customers.map((c) => ({ nombre: c.name, telefono: c.phone, saldo: c.balance, limite: c.creditLimit }))).slice(0, 60) };
  }
  if (tema === 'stock_bajo') {
    return {
      stock_bajo: state.products
        .map((p) => ({ nombre: p.name, total: Object.values(p.branchStock?.[branch] || {}).reduce((a, x) => a + Number(x || 0), 0) }))
        .filter((x) => x.total <= 3),
    };
  }
  if (tema === 'caja') {
    const cash = state.sales.filter((s) => s.status === 'done' && s.method === 'cash').reduce((a, s) => a + s.total, 0);
    return { caja_abierta: state.register.open, fondo: state.register.opening, ventas_efectivo: cash, movimientos: state.cashMovements.slice(-30) };
  }
  return {
    resumen: {
      empresa: state.company.name,
      sucursal: state.branches.find((b) => b.id === branch)?.name,
      productos: state.products.length, ventas: state.sales.length,
      clientes: state.customers.length, usuarios: state.users.length,
    },
  };
}
