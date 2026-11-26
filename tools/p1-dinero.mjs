// Bloque 1 de dinero: descuento prorrateado en devoluciones, cancelación sin
// doble reposición, crédito real en pago dividido y redondeo en totales.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/store.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

/* ---------- 1) Helper: proporción cobrada y parte a crédito ---------- */
const anclaHelpers = 'function cartTotals(cart) {';
const helpers = [
  '/** Fracción del precio de lista que realmente se cobró (1 - descuento/subtotal). */',
  'function fraccionCobrada(sale) {',
  '  const subtotal = Number(sale?.subtotal) || 0;',
  '  const descuento = Number(sale?.discount) || 0;',
  '  if (subtotal <= 0) return 1;',
  '  const f = (subtotal - descuento) / subtotal;',
  '  return f > 0 ? Math.min(1, f) : 0;',
  '}',
  '',
  '/** Parte de la venta que quedó a crédito del cliente. */',
  'export function creditPartOf(sale) {',
  '  if (!sale) return 0;',
  '  if (Array.isArray(sale.payments) && sale.payments.length) {',
  '    return round2(sale.payments.filter((p) => p.method === "credit_sale").reduce((s, p) => s + (Number(p.amount) || 0), 0));',
  '  }',
  '  return sale.method === "credit_sale" ? round2(Number(sale.total) || 0) : 0;',
  '}',
  '',
  '/** Parte de la venta que entró en efectivo. */',
  'function cashPartOf(sale) {',
  '  if (!sale) return 0;',
  '  if (Array.isArray(sale.payments) && sale.payments.length) {',
  '    return round2(sale.payments.filter((p) => p.method === "cash").reduce((s, p) => s + (Number(p.amount) || 0), 0));',
  '  }',
  '  return sale.method === "cash" ? round2(Number(sale.total) || 0) : 0;',
  '}',
  '',
  'function cartTotals(cart) {',
].join('\n');
must(a.includes(anclaHelpers), 'cartTotals');
a = a.replace(anclaHelpers, helpers);

/* ---------- 2) cartTotals con round2 ---------- */
const viejoTotales = [
  'function cartTotals(cart) {',
  '  const subtotal = cart.lines.reduce((a, l) => a + l.price * l.qty, 0);',
  '  const discount = Math.min(cart.discount || 0, subtotal);',
  '  return { subtotal, discount, total: Math.max(0, subtotal - discount), count: cart.lines.length };',
  '}',
].join('\n');
const nuevoTotales = [
  'function cartTotals(cart) {',
  '  // round2 en cada paso: con ventas por kg los centavos flotantes rechazaban el importe mostrado.',
  '  const subtotal = round2(cart.lines.reduce((a, l) => a + (Number(l.price) || 0) * (Number(l.qty) || 0), 0));',
  '  const discount = round2(Math.min(Number(cart.discount) || 0, subtotal));',
  '  return { subtotal, discount, total: round2(Math.max(0, subtotal - discount)), count: cart.lines.length };',
  '}',
].join('\n');
must(a.includes(viejoTotales), 'cuerpo de cartTotals');
a = a.replace(viejoTotales, nuevoTotales);

/* ---------- 3) returnSale: prorrateo + tope ---------- */
const viejoReturn = [
  '    const price = Number(item.price) || 0;',
  '    total += price * q;',
  '    out.push({ productId: l.productId, name: item.name, size: item.size, qty: q, price, subtotal: price * q });',
].join('\n');
const nuevoReturn = [
  '    const price = Number(item.price) || 0;',
  '    // Se devuelve lo que el cliente pagó por esa pieza: si la venta tuvo descuento,',
  '    // se prorratea; y nunca se reembolsa más de lo cobrado en la venta.',
  '    const netoUnitario = round2(price * fraccionCobrada(sale));',
  '    let subtotalLinea = round2(netoUnitario * q);',
  '    const disponible = round2((Number(sale.total) || 0) - (Number(sale.refunded) || 0) - total);',
  '    if (subtotalLinea > disponible) subtotalLinea = Math.max(0, disponible);',
  '    total = round2(total + subtotalLinea);',
  '    out.push({',
  '      productId: l.productId, name: item.name, size: item.size, qty: q,',
  '      price, netUnit: netoUnitario, subtotal: subtotalLinea,',
  '    });',
].join('\n');
must(a.includes(viejoReturn), 'cálculo del reembolso');
a = a.replace(viejoReturn, nuevoReturn);

/* ---------- 4) cancelSale: reponer solo lo descontado y bloquear con devoluciones ---------- */
const viejoCancel = [
  'function cancelSale(saleId, reason) {',
  '  const sale = state.sales.find((s) => s.id === saleId);',
  '  if (!sale || sale.status === "cancelled") return;',
  '  sale.items.forEach((l) => {',
  '    const p = productById(l.productId);',
  '    const b = p?.branchStock?.[sale.branchId];',
  '    const vk3 = l.vkey || l.size;',
  '    if (b && b[vk3] != null) b[vk3] = round3(Number(b[vk3]) + l.qty);',
  '  });',
  '  if (sale.customerId && sale.method === "credit_sale") {',
  '    const c = state.customers.find((x) => x.id === sale.customerId);',
  '    if (c) c.balance = Math.max(0, (c.balance || 0) - sale.total);',
  '  }',
].join('\n').replace(/"/g, "'");

const nuevoCancel = [
  'function cancelSale(saleId, reason) {',
  '  const sale = state.sales.find((s) => s.id === saleId);',
  '  if (!sale || sale.status === "cancelled") return { ok: false, msg: "La venta ya está cancelada" };',
  '  // Si ya hubo devoluciones, cancelar repondría stock y dinero dos veces.',
  '  if (Number(sale.refunded) > 0) {',
  '    return { ok: false, msg: "Esta venta tiene devoluciones: no se puede cancelar" };',
  '  }',
  '  sale.items.forEach((l) => {',
  '    const p = productById(l.productId);',
  '    const b = p?.branchStock?.[sale.branchId];',
  '    const vk3 = l.vkey || l.size;',
  '    // Servicios y platillos que se preparan al vender nunca descontaron el producto:',
  '    // reponerlos inventaría piezas que no existen.',
  '    const sePrepara = !!(p?.recipe && p.prepararAlVender);',
  '    const esServicio = p?.section === "servicios";',
  '    if (esServicio || sePrepara) return;',
  '    if (b && b[vk3] != null) b[vk3] = round3(Number(b[vk3]) + l.qty);',
  '  });',
  '  const aCredito = creditPartOf(sale);',
  '  if (sale.customerId && aCredito > 0) {',
  '    const c = state.customers.find((x) => x.id === sale.customerId);',
  '    if (c) c.balance = Math.max(0, round2((c.balance || 0) - aCredito));',
  '  }',
  '  // El efectivo que había entrado sale de la caja al cancelar.',
  '  const efectivo = cashPartOf(sale);',
  '  if (efectivo > 0) addCash("out", efectivo, "Cancelación " + sale.code, "sale");',
].join('\n');

must(a.includes(viejoCancel), 'cabecera de cancelSale');
a = a.replace(viejoCancel, nuevoCancel);

/* ---------- 5) cancelSale devuelve ok ---------- */
const viejoFinCancel = [
  '  sale.status = "cancelled";',
  '  sale.cancelReason = reason || "Sin motivo";',
  '  sale.cancelledAt = new Date().toISOString();',
  '  emit();',
  '}',
].join('\n').replace(/"/g, "'");
const nuevoFinCancel = [
  '  sale.status = "cancelled";',
  '  sale.cancelReason = reason || "Sin motivo";',
  '  sale.cancelledAt = new Date().toISOString();',
  '  emit();',
  '  return { ok: true };',
  '}',
].join('\n');
must(a.includes(viejoFinCancel), 'cierre de cancelSale');
a = a.replace(viejoFinCancel, nuevoFinCancel);

/* ---------- 6) commitSale: solo la parte a crédito al saldo ---------- */
const viejoCredito = [
  '  if (customerId && (method === "credit_sale" || (payments || []).some((p) => p.method === "credit_sale"))) {',
  '    const c = state.customers.find((x) => x.id === customerId);',
  '    if (c) c.balance = (c.balance || 0) + t.total;',
  '  }',
].join('\n').replace(/"/g, "'");
const nuevoCredito = [
  '  // Solo la parte que quedó a crédito se suma al saldo del cliente:',
  '  // en pago dividido el resto ya se pagó con efectivo o tarjeta.',
  '  const aCredito = payments && payments.length',
  '    ? payments.filter((p) => p.method === "credit_sale").reduce((s, p) => s + (Number(p.amount) || 0), 0)',
  '    : (method === "credit_sale" ? t.total : 0);',
  '  if (customerId && aCredito > 0) {',
  '    const c = state.customers.find((x) => x.id === customerId);',
  '    if (c) c.balance = round2((c.balance || 0) + aCredito);',
  '  }',
].join('\n').replace(/"/g, "'");
must(a.includes(viejoCredito), 'crédito en commitSale');
a = a.replace(viejoCredito, nuevoCredito);

fs.writeFileSync(ruta, a, 'utf8');
console.log('store.js: devoluciones, cancelación, crédito y redondeo');
