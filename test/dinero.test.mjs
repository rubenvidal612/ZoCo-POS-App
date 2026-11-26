// Pruebas del bloque de dinero: devoluciones con descuento, cancelación,
// pago dividido a crédito y redondeo de totales.
import test from 'node:test';
import assert from 'node:assert/strict';
import { importarStore } from './helpers/store.mjs';

/** Deja un producto con stock y devuelve su id. */
function conProducto(store, { precio = 100, stock = 10, section = 'playeras' } = {}) {
  store.upsertProduct({ name: 'Pieza', price: precio, cost: 40, section });
  const p = store.state.products[0];
  p.branchStock = { b1: { 'Único': stock } };
  return p;
}

function venta(store, { descuento = 0, qty = 1, metodo = 'cash' } = {}) {
  const p = store.state.products[0];
  const cart = {
    lines: [{ key: p.id + '|Único', productId: p.id, name: p.name, size: 'Único', vkey: 'Único', qty, price: p.price }],
    discount: descuento,
  };
  return store.commitSale({ cart, method: metodo, received: 9999 });
}

test('la devolución prorratea el descuento de la venta', async () => {
  const { store } = await importarStore();
  conProducto(store, { precio: 100 });
  const s = venta(store, { descuento: 20 });          // cobró 80
  assert.equal(s.total, 80);

  const r = store.returnSale(s.id, [{ productId: store.state.products[0].id, size: 'Único', qty: 1 }], 'prueba', 'cash');
  assert.equal(r.ok, true);
  assert.equal(r.ret.total, 80, 'devuelve lo cobrado (80), no el precio de lista (100)');
});

test('nunca se reembolsa más de lo cobrado en la venta', async () => {
  const { store } = await importarStore();
  conProducto(store, { precio: 100 });
  const s = venta(store, { descuento: 50 });          // cobró 50

  const r1 = store.returnSale(s.id, [{ productId: store.state.products[0].id, size: 'Único', qty: 1 }], 'uno', 'cash');
  assert.equal(r1.ret.total, 50);
  assert.ok(s.refunded <= s.total, 'refunded no puede pasar el total');

  const r2 = store.returnSale(s.id, [{ productId: store.state.products[0].id, size: 'Único', qty: 1 }], 'dos', 'cash');
  assert.equal(r2.ok, false, 'ya no hay piezas por devolver');
});

test('devolver todo deja refunded igual al total', async () => {
  const { store } = await importarStore();
  conProducto(store, { precio: 60, stock: 10 });
  const s = venta(store, { descuento: 12, qty: 2 });   // 120 - 12 = 108
  const r = store.returnSale(s.id, [{ productId: store.state.products[0].id, size: 'Único', qty: 2 }], 'todo', 'cash');
  assert.equal(r.ret.total, 108);
  assert.equal(s.refunded, 108);
  assert.equal(s.status, 'returned');
});

test('cancelar no repone stock de un servicio', async () => {
  const { store } = await importarStore();
  conProducto(store, { precio: 200, stock: 0, section: 'servicios' });
  const p = store.state.products[0];
  const cart = { lines: [{ key: p.id + '|Único', productId: p.id, name: p.name, size: 'Único', vkey: 'Único', qty: 1, price: p.price }], discount: 0 };
  const s = store.commitSale({ cart, method: 'cash', received: 500 });
  store.cancelSale(s.id, 'prueba');
  assert.equal(p.branchStock.b1['Único'], 0, 'un servicio no genera inventario al cancelar');
});

test('cancelar sí repone stock de una pieza normal', async () => {
  const { store } = await importarStore();
  conProducto(store, { precio: 100, stock: 5 });
  const p = store.state.products[0];
  const s = venta(store, { qty: 2 });
  assert.equal(p.branchStock.b1['Único'], 3);
  store.cancelSale(s.id, 'prueba');
  assert.equal(p.branchStock.b1['Único'], 5);
});

test('no se puede cancelar una venta que ya tuvo devolución', async () => {
  const { store } = await importarStore();
  conProducto(store, { precio: 100, stock: 5 });
  const s = venta(store, { qty: 2 });
  store.returnSale(s.id, [{ productId: store.state.products[0].id, size: 'Único', qty: 1 }], 'uno', 'cash');
  const r = store.cancelSale(s.id, 'prueba');
  assert.equal(r.ok, false);
  assert.match(r.msg, /devolucion/i);
});

test('pago dividido a crédito solo carga al cliente su parte', async () => {
  const { store } = await importarStore();
  conProducto(store, { precio: 100 });
  const p = store.state.products[0];
  store.upsertCustomer({ name: 'Cliente Prueba' });
  const c = store.state.customers[0];
  const cart = { lines: [{ key: p.id + '|Único', productId: p.id, name: p.name, size: 'Único', vkey: 'Único', qty: 2, price: p.price }], discount: 0 };
  const s = store.commitSale({
    cart, method: 'split', received: 200, customerId: c.id,
    payments: [{ method: 'cash', amount: 120 }, { method: 'credit_sale', amount: 80 }],
  });
  assert.equal(s.total, 200);
  assert.equal(c.balance, 80, 'solo la parte a crédito');

  store.cancelSale(s.id, 'prueba');
  assert.equal(c.balance, 0, 'al cancelar se revierte la parte a crédito');
});

test('el total con centavos queda redondeado', async () => {
  const { store } = await importarStore();
  conProducto(store, { precio: 0.1, stock: 10 });
  const p = store.state.products[0];
  const cart = { lines: [{ key: p.id + '|Único', productId: p.id, name: p.name, size: 'Único', vkey: 'Único', qty: 3, price: p.price }], discount: 0 };
  const s = store.commitSale({ cart, method: 'cash', received: 1 });
  assert.equal(s.total, 0.3, 'sin colas flotantes');
  assert.equal(String(s.total), '0.3');
});
