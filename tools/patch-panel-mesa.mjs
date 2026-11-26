// Panel de mesa: asignar mesero, cliente y comentario; renombrar mesas.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Cabecera de la mesa con selector de mesero + cliente y comentario
const viejoHeader = `      '<div class="fd-back"><button class="btn ghost sm" id="fd-back">← Mesas</button><h3>' + e(table.name) + '</h3><span>Mesero: ' + e(order.waiterName) + '</span></div>' +`;
const nuevoHeader = `      '<div class="fd-back"><button class="btn ghost sm" id="fd-back">← Mesas</button><h3>' + e(table.name) + '</h3><span class="fd-badge ' + (order.items.length ? 'on' : '') + '">' + (order.items.length ? money(sum(order.items)) : 'Mesa abierta') + '</span></div>' +
      '<div class="fd-box" style="margin-bottom:12px"><h3>Datos de la mesa</h3>' +
      '<div class="fd-inline" style="flex-wrap:wrap">' +
      '<label>Mesero<select id="fd-waiter">' + (state.users || []).filter(u => u.role !== 'KITCHEN').map(u => '<option value="' + e(u.id) + '"' + (u.id === order.waiterId ? ' selected' : '') + '>' + e(u.name) + ' · ' + e(u.role || '') + '</option>').join('') + '</select></label>' +
      '<label>Personas<input id="fd-table-people" type="number" min="1" max="30" value="' + e(order.people || 1) + '"></label>' +
      '<label>Cliente (opcional)<input id="fd-table-client" maxlength="60" placeholder="Nombre del cliente" value="' + e(order.customerName || '') + '"></label>' +
      '</div>' +
      '<label style="display:block;margin-top:10px">Comentario de la mesa<input id="fd-table-note" maxlength="160" placeholder="Cumpleaños, reserva a nombre de…" value="' + e(order.tableNote || '') + '"></label>' +
      '</div>' +`;
must(a.includes(viejoHeader), 'cabecera del panel de mesa');
a = a.replace(viejoHeader, nuevoHeader);

// 2) Guardar los datos al cambiar
const ancla = `    root.querySelector('#fd-back').onclick = () => {tab='mesas';currentTable=null;render();};`;
const handlers = `    root.querySelector('#fd-back').onclick = () => {tab='mesas';currentTable=null;render();};
    // Datos de la mesa: mesero, personas, cliente y comentario
    root.querySelector('#fd-waiter')?.addEventListener('change', (ev) => {
      const u = (state.users || []).find(x => x.id === ev.target.value);
      if (!u) return;
      order.waiterId = u.id;
      order.waiterName = u.name;
      save();
      toast('Mesero asignado: ' + u.name);
    });
    root.querySelector('#fd-table-people')?.addEventListener('change', (ev) => {
      const n = Number(ev.target.value);
      if (!Number.isFinite(n) || n < 1) return;
      order.people = Math.min(30, Math.round(n));
      save();
    });
    root.querySelector('#fd-table-client')?.addEventListener('change', (ev) => {
      order.customerName = String(ev.target.value || '').slice(0, 60);
      save();
    });
    root.querySelector('#fd-table-note')?.addEventListener('change', (ev) => {
      order.tableNote = String(ev.target.value || '').slice(0, 160);
      save();
    });`;
must(a.includes(ancla), 'handler de regreso');
a = a.replace(ancla, handlers);

// 3) Renombrar mesa desde el menú de ajuste
const viejoMenu = `      'Mesa ' + t.name + '\\\\n\\\\nEscribe:\\\\n1 = cuadrada\\\\n2 = redonda\\\\n3 = cambiar lugares\\\\n4 = mover a otro salón\\\\n5 = eliminar mesa',`;
const nuevoMenu = `      'Mesa ' + t.name + '\\\\n\\\\nEscribe:\\\\n1 = cuadrada\\\\n2 = redonda\\\\n3 = cambiar lugares\\\\n4 = mover a otro salón\\\\n5 = eliminar mesa\\\\n6 = renombrar mesa',`;
if (a.includes(viejoMenu)) a = a.replace(viejoMenu, nuevoMenu);

const viejoFin = `    if (accion === '5') {`;
const nuevoFin = `    if (accion === '6') {
      const nombre = prompt('Nuevo nombre para la mesa', t.name);
      if (nombre && nombre.trim()) { t.name = nombre.trim().slice(0, 24); save(); render(); }
      return;
    }
    if (accion === '5') {`;
must(a.includes(viejoFin), 'fin del menú de ajuste');
a = a.replace(viejoFin, nuevoFin);

fs.writeFileSync(ruta, a, 'utf8');
console.log('panel de mesa con mesero, cliente y comentario');
