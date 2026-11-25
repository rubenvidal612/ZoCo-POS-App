// Muestra el descuento del producto en la tabla y en la tarjeta del POS.
import fs from 'node:fs';

// ---------- 1) Tabla de productos ----------
const cat = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let a = fs.readFileSync(cat, 'utf8');

const viejoTd = `        <td class="mono t-strong">\${Number(p.price) > 0 ? money(p.price) : '<span class="badge grey">Pendiente</span>'}`;
const nuevoTd = `        <td class="mono t-strong">\${Number(p.price) > 0
          ? (p.discount?.on && Number(p.discount.value) > 0
              ? '<div style="font-size:11px;color:var(--muted);text-decoration:line-through">' + money(p.price) + '</div>'
                + '<div>' + money(Math.max(0, p.discount.type === 'amount' ? p.price - p.discount.value : p.price - (p.price * p.discount.value) / 100)) + '</div>'
                + '<span class="badge" style="font-size:9px;background:#FEE2E2;color:#991B1B">' + (p.discount.type === 'amount' ? '-$' + p.discount.value : '-' + p.discount.value + '%') + '</span>'
              : money(p.price))
          : '<span class="badge grey">Pendiente</span>'}`;

if (a.includes(viejoTd)) { a = a.replace(viejoTd, nuevoTd); console.log('tabla de productos: descuento visible'); }
else console.log('NO tabla');

fs.writeFileSync(cat, a, 'utf8');

// ---------- 2) Tarjeta del POS ----------
const pos = 'C:/ZOCOPOS 2.0/app/js/views-pos.js';
let b = fs.readFileSync(pos, 'utf8');

const viejoPrecio = `        <div class="sq-price">\${money(p.price)}</div>`;
const nuevoPrecio = `        <div class="sq-price">\${p.discount?.on && Number(p.discount.value) > 0
          ? '<s style="opacity:.55;font-size:11px">' + money(p.price) + '</s> ' + money(Math.max(0, p.discount.type === 'amount' ? p.price - p.discount.value : p.price - (p.price * p.discount.value) / 100))
          : money(p.price)}\${p.discount?.on && Number(p.discount.value) > 0 ? ' <span style="background:#DC2626;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:999px;vertical-align:middle">' + (p.discount.type === 'amount' ? '-$' + p.discount.value : '-' + p.discount.value + '%') + '</span>' : ''}</div>`;

if (b.includes(viejoPrecio)) { b = b.replace(viejoPrecio, nuevoPrecio); console.log('tarjeta POS: descuento visible'); }
else console.log('NO pos');

fs.writeFileSync(pos, b, 'utf8');
