// Prueba de humo del arnés: el estado de prueba carga y se puede vender.
import test from 'node:test';
import assert from 'node:assert/strict';
import { importarStore } from './helpers/store.mjs';

test('el arnés carga store.js con un estado de prueba', async () => {
  const { store } = await importarStore();
  assert.equal(store.state.company.name, 'Negocio Prueba');
  assert.equal(store.state.branches.length, 1);
  assert.equal(store.state.currentBranch, 'b1');
});

test('se puede crear un producto y consultarlo', async () => {
  const { store } = await importarStore();
  store.upsertProduct({ name: 'Playera', price: 100, cost: 40, section: 'playeras' });
  const p = store.state.products[0];
  assert.ok(p && p.id, 'el producto debe tener id');
  assert.equal(store.productById(p.id).name, 'Playera');
});
