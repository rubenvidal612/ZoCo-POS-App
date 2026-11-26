// Cálculo del corte de caja (Z). Módulo puro: no toca el DOM ni localStorage,
// para poder probarlo con `node --test` sin navegador.
//
// Regla de oro: cada peso entra a la caja UNA sola vez. Los movimientos que ya
// están representados en otra parte del desglose (la venta en efectivo en
// `methods.cash`, el gasto pagado en `expenseCash`) se marcan con `origin`
// 'sale' / 'expense' y NO se vuelven a sumar como movimiento manual.

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const AUTO_ORIGINS = new Set(['sale', 'expense']);
// Compatibilidad con movimientos viejos, guardados antes de existir `origin`.
const LEGACY_AUTO = /^(Venta |Gasto: )/;

export function isAutoCashMovement(m) {
  if (!m) return false;
  if (AUTO_ORIGINS.has(m.origin)) return true;
  return m.origin == null && LEGACY_AUTO.test(String(m.note || ''));
}

/**
 * Desglose de caja del periodo (por defecto: el turno abierto).
 * @param {object} st estado completo del negocio
 * @param {{branchId?:string, from?:string|null, to?:string|null}} opts
 */
export function cashBreakdownOf(st, { branchId, from = null, to = null } = {}) {
  const b = branchId ?? st.currentBranch;
  const desde = from || st.register?.openedAt || null;
  const ok = (d) => (!desde || new Date(d) >= new Date(desde)) && (!to || new Date(d) <= new Date(to));

  const sales = (st.sales || []).filter((s) => s.branchId === b && s.status !== 'cancelled' && ok(s.date));
  const methods = { cash: 0, debit: 0, credit: 0, transfer: 0, credit_sale: 0, other: 0 };
  let totalSales = 0;
  let countSales = 0;

  sales.forEach((s) => {
    totalSales += Number(s.total) || 0;
    countSales++;
    if (Array.isArray(s.payments) && s.payments.length) {
      s.payments.forEach((pm) => { methods[pm.method] = round2((methods[pm.method] || 0) + (Number(pm.amount) || 0)); });
    } else {
      const m = methods[s.method] != null ? s.method : 'other';
      methods[m] = round2(methods[m] + (Number(s.total) || 0));
    }
  });

  const returns = (st.returns || []).filter((r) => r.branchId === b && ok(r.date));
  const refunds = { cash: 0, card: 0, total: 0 };
  returns.forEach((r) => {
    refunds.total = round2(refunds.total + (Number(r.total) || 0));
    if (r.method === 'cash' || r.method === 'credit_note') refunds.cash = round2(refunds.cash + (Number(r.total) || 0));
    else refunds.card = round2(refunds.card + (Number(r.total) || 0));
  });

  const expenses = (st.expenses || []).filter((e) => (e.branchId || b) === b && e.paid && ok(e.paidAt || e.date));
  const expenseCash = round2(expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0));

  // Solo movimientos manuales: aportaciones, retiros, abonos de apartado y pagos
  // a proveedor. Los generados por una venta o un gasto ya están contados arriba.
  const moves = (st.cashMovements || [])
    .filter((m) => m.branchId === b && ok(m.date) && m.type !== 'open' && m.type !== 'close' && !isAutoCashMovement(m));
  const cashIn = round2(moves.filter((m) => m.type === 'in').reduce((a, m) => a + (Number(m.amount) || 0), 0));
  const cashOut = round2(moves.filter((m) => m.type === 'out').reduce((a, m) => a + (Number(m.amount) || 0), 0));

  const opening = Number(st.register?.opening) || 0;
  const expected = round2(opening + methods.cash - refunds.cash - expenseCash + cashIn - cashOut);

  return {
    branchId: b,
    from: desde,
    to: to || new Date().toISOString(),
    opening,
    countSales,
    totalSales: round2(totalSales),
    methods,
    returns: refunds,
    expenseCash,
    cashIn,
    cashOut,
    cashSales: methods.cash,
    cardSales: round2(methods.debit + methods.credit),
    expected,
  };
}
