// P1.4b: cupón idempotente · P1.9: closeOrder cobra solo el pendiente.
import fs from 'node:fs';

const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exitCode = 1; return false; } return true; };

/* ---------- views-pos.js: cupón idempotente ---------- */
{
  const p = 'C:/ZOCOPOS 2.0/app/js/views-pos.js';
  let a = fs.readFileSync(p, 'utf8');

  const viejo = [
    "      const r = applyCoupon(m.root.querySelector('#cp').value, t.subtotal);",
    "      if (!r.ok) { toast(r.msg); return; }",
    '      cart.discount = (cart.discount || 0) + r.value;',
    "      m.close(); render(); toast('Cupón aplicado: ' + money(r.value));",
  ].join('\n');

  const nuevo = [
    "      const codigo = String(m.root.querySelector('#cp').value || '').trim().toUpperCase();",
    '      const r = applyCoupon(codigo, t.subtotal);',
    '      if (!r.ok) { toast(r.msg); return; }',
    '      // Un cupón no se acumula: si se toca dos veces, se reemplaza y no se suma doble.',
    "      if (cart.couponCode === codigo) { toast('Ese cupón ya está aplicado'); m.close(); return; }",
    '      if (Number(cart.couponValue) > 0) cart.discount = Math.max(0, (cart.discount || 0) - Number(cart.couponValue));',
    '      cart.couponCode = codigo;',
    '      cart.couponValue = r.value;',
    '      cart.discount = Math.round(((cart.discount || 0) + r.value) * 100) / 100;',
    "      m.close(); render(); toast('Cupón aplicado: ' + money(r.value));",
  ].join('\n');

  if (ok(a.includes(viejo), 'views-pos: cupón')) {
    a = a.replace(viejo, nuevo);
    // Al vaciar el carrito se olvida el cupón (si no, el siguiente cliente lo hereda).
    a = a.split('cart.lines = []; cart.discount = 0;').join('cart.lines = []; cart.discount = 0; cart.couponCode = null; cart.couponValue = 0;');
    a = a.replace("m.root.querySelector('#clear').onclick = () => { cart.discount = 0; m.close(); render(); };",
      "m.root.querySelector('#clear').onclick = () => { cart.discount = 0; cart.couponCode = null; cart.couponValue = 0; m.close(); render(); };");
    fs.writeFileSync(p, a, 'utf8');
    console.log('views-pos.js: cupón idempotente');
  }
}

/* ---------- views-food-service.js: cobrar el pendiente ---------- */
{
  const p = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
  let a = fs.readFileSync(p, 'utf8');

  const viejoTotal = '    const total = sum(order.items);\n    const cart = { lines: order.items.map';
  const nuevoTotal = [
    '    const total = sum(order.items);',
    '    // Lo que ya se cobró por partes (dividir cuenta) no se vuelve a cobrar.',
    '    const yaCobrado = pagadoDe(order);',
    '    const porCobrar = pendienteDe(order);',
    '    const cart = { lines: order.items.map',
  ].join('\n');
  if (ok(a.includes(viejoTotal), 'food: total a cobrar')) a = a.replace(viejoTotal, nuevoTotal);

  const viejoMsg = "        message: 'Se registrará una venta de ' + money(total) + ' y se liberará la mesa. Verifica que el cliente haya pagado.',";
  const nuevoMsg = "        message: (yaCobrado > 0\n          ? 'Ya se cobraron ' + money(yaCobrado) + ' de ' + money(total) + '. Se cobrarán ' + money(porCobrar) + ' y se liberará la mesa.'\n          : 'Se registrará una venta de ' + money(total) + ' y se liberará la mesa. Verifica que el cliente haya pagado.'),";
  if (ok(a.includes(viejoMsg), 'food: mensaje de cobro')) a = a.replace(viejoMsg, nuevoMsg);

  const viejoSale = [
    '        const sale = commitSale({ cart, method: payMethod, received: total,',
  ].join('\n');
  const nuevoSale = [
    '        // Se reconstruye el pago completo: partes ya cobradas + lo que falta ahora.',
    '        const pagosPrevios = (order.payments || []).map((pg) => ({ method: pg.method || "cash", amount: Number(pg.amount) || 0 }));',
    '        if (porCobrar > 0) pagosPrevios.push({ method: payMethod, amount: porCobrar });',
    '        const sale = commitSale({ cart, method: payMethod, received: total,',
    '          payments: pagosPrevios.length > 1 ? pagosPrevios : undefined,',
  ].join('\n');
  if (ok(a.includes(viejoSale), 'food: commitSale')) a = a.replace(viejoSale, nuevoSale);

  fs.writeFileSync(p, a, 'utf8');
  console.log('views-food-service.js: cobra pendienteDe(order)');
}
