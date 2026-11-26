// Pruebas del corte de caja (Z). Se ejecutan con: node --test test/
// Regla que protegen: cada peso entra a la caja una sola vez y solo del turno abierto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cashBreakdownOf, isAutoCashMovement, round2 } from '../app/js/cash.js';

const T0 = '2026-11-25T10:00:00.000Z';
const T1 = '2026-11-25T10:30:00.000Z';
const T2 = '2026-11-25T11:00:00.000Z';
const BEFORE = '2026-11-25T09:00:00.000Z';

function base(over = {}) {
  return {
    currentBranch: 'b1',
    register: { open: true, opening: 500, openedAt: T0 },
    sales: [],
    returns: [],
    expenses: [],
    cashMovements: [],
    ...over,
  };
}

const saleCash = (total, date = T1) => ({
  id: 's1', branchId: 'b1', status: 'done', method: 'cash', total, date,
});

test('venta en efectivo + gasto: el efectivo se cuenta una vez', () => {
  const st = base({
    sales: [saleCash(690)],
    expenses: [{ id: 'x1', branchId: 'b1', paid: true, paidAt: T2, amount: 100 }],
    cashMovements: [
      { id: 'cm1', branchId: 'b1', type: 'in', amount: 690, note: 'Venta 1-1001', origin: 'sale', date: T1 },
      { id: 'cm2', branchId: 'b1', type: 'out', amount: 100, note: 'Gasto: luz', origin: 'expense', date: T2 },
    ],
  });
  const d = cashBreakdownOf(st);
  assert.equal(d.expected, 1090); // 500 + 690 − 100 (antes daba 1680)
  assert.equal(d.cashIn, 0);
  assert.equal(d.cashOut, 0);
  assert.equal(d.cashSales, 690);
  assert.equal(d.expenseCash, 100);
});

test('pago dividido: solo la parte en efectivo entra a la caja', () => {
  const st = base({
    sales: [{ id: 's2', branchId: 'b1', status: 'done', method: 'mixed', total: 690, date: T1,
      payments: [{ method: 'cash', amount: 200 }, { method: 'debit', amount: 490 }] }],
  });
  const d = cashBreakdownOf(st);
  assert.equal(d.methods.cash, 200);
  assert.equal(d.methods.debit, 490);
  assert.equal(d.expected, 700);
});

test('movimientos manuales sí mueven el esperado', () => {
  const st = base({
    cashMovements: [
      { id: 'a', branchId: 'b1', type: 'in', amount: 100, note: 'Abono apartado AP-1', origin: 'manual', date: T1 },
      { id: 'b', branchId: 'b1', type: 'out', amount: 50, note: 'Retiro', origin: 'manual', date: T1 },
      { id: 'c', branchId: 'b1', type: 'open', amount: 500, note: 'Apertura de caja', origin: 'manual', date: T0 },
    ],
  });
  const d = cashBreakdownOf(st);
  assert.equal(d.cashIn, 100);
  assert.equal(d.cashOut, 50);
  assert.equal(d.expected, 550);
});

test('movimientos viejos sin origin no se cuentan dos veces', () => {
  const st = base({
    sales: [saleCash(690)],
    cashMovements: [
      { id: 'old1', branchId: 'b1', type: 'in', amount: 690, note: 'Venta 1-0999', date: T1 },
      { id: 'old2', branchId: 'b1', type: 'out', amount: 100, note: 'Gasto: renta', date: T1 },
    ],
  });
  const d = cashBreakdownOf(st);
  assert.equal(d.cashIn, 0);
  assert.equal(d.cashOut, 0);
  assert.equal(d.expected, 1190); // 500 + 690 (el gasto no está pagado en el fixture)
});

test('el corte solo mira el turno abierto', () => {
  const st = base({
    sales: [saleCash(300, BEFORE), saleCash(690)],
    cashMovements: [{ id: 'v', branchId: 'b1', type: 'in', amount: 300, note: 'Venta 1-0900', origin: 'sale', date: BEFORE }],
  });
  const d = cashBreakdownOf(st);
  assert.equal(d.countSales, 1);
  assert.equal(d.expected, 1190);
  assert.equal(d.from, T0);
});

test('devolución en efectivo resta del esperado', () => {
  const st = base({
    sales: [saleCash(690)],
    returns: [{ id: 'r1', branchId: 'b1', method: 'cash', total: 80, date: T2 }],
  });
  assert.equal(cashBreakdownOf(st).expected, 1110);
});

test('otra sucursal no contamina el corte', () => {
  const st = base({ sales: [{ ...saleCash(999), branchId: 'b2' }] });
  assert.equal(cashBreakdownOf(st).expected, 500);
});

test('canceladas no cuentan', () => {
  const st = base({ sales: [{ ...saleCash(690), status: 'cancelled' }] });
  assert.equal(cashBreakdownOf(st).expected, 500);
});

test('redondeo a centavos', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(66.465), 66.47);
});

test('isAutoCashMovement distingue origen y notas viejas', () => {
  assert.equal(isAutoCashMovement({ origin: 'sale' }), true);
  assert.equal(isAutoCashMovement({ origin: 'expense' }), true);
  assert.equal(isAutoCashMovement({ note: 'Venta 1-1001' }), true);
  assert.equal(isAutoCashMovement({ note: 'Gasto: luz' }), true);
  assert.equal(isAutoCashMovement({ note: 'Abono apartado AP-1' }), false);
  assert.equal(isAutoCashMovement({ note: 'Pago a proveedor PO-1', origin: 'manual' }), false);
  assert.equal(isAutoCashMovement(null), false);
});
