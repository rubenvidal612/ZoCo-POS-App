// Reservas por mesa: alta, lista del día y estado "reservada" en el salón.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Estado de la mesa: considerar reservas de hoy
const viejoEstado = `  function estadoMesa(table) {
    const order = orderFor(table.id);
    if (!order) return { key: 'libre', label: 'Libre', order: null };`;
const nuevoEstado = `  /* ===== Reservas ===== */
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const reservas = () => {
    if (!Array.isArray(state.food.reservations)) state.food.reservations = [];
    return state.food.reservations;
  };
  const reservasDeMesaHoy = (tableId) => reservas()
    .filter(r => r.tableId === tableId && r.date === hoyISO() && r.status !== 'cancelada')
    .sort((x, y) => String(x.time).localeCompare(String(y.time)));
  function estadoMesa(table) {
    const order = orderFor(table.id);
    if (!order) {
      const res = reservasDeMesaHoy(table.id)[0];
      if (res) return { key: 'reservada', label: 'Reservada ' + res.time, order: null, reserva: res };
      return { key: 'libre', label: 'Libre', order: null };
    }`;
must(a.includes(viejoEstado), 'cabecera de estadoMesa');
a = a.replace(viejoEstado, nuevoEstado);

// 2) Mostrar la reserva en la tarjeta del salón
const viejoTile = `        : '<small class="fd-mesa-meta">👥 ' + (t.seats || 4) + ' lugares</small>'
          + '<small class="fd-mesa-libre">Libre</small>')`;
const nuevoTile = `        : (est.reserva
          ? '<small class="fd-mesa-w">' + e(est.reserva.name || '') + '</small>'
            + '<small class="fd-mesa-meta">📅 ' + e(est.reserva.time) + ' · 👥 ' + (est.reserva.people || t.seats) + '</small>'
            + '<small class="fd-mesa-libre">Reservada</small>'
          : '<small class="fd-mesa-meta">👥 ' + (t.seats || 4) + ' lugares</small>'
            + '<small class="fd-mesa-libre">Libre</small>'))`;
must(a.includes(viejoTile), 'tarjeta del salón');
a = a.replace(viejoTile, nuevoTile);

// 3) Funciones de reservas (antes de paintTable)
const ancla = `  function paintTable() {`;
const funciones = `  /* ============ Reservas ============ */
  function abrirReservas(table) {
    const lista = table ? reservasDeMesaHoy(table.id) : reservas().filter(r => r.status !== 'cancelada').slice(0, 40);
    const filas = lista.length
      ? lista.map(r => {
          const t = activeTables().find(x => x.id === r.tableId);
          return '<div class="fd-res-row"><div><b>' + e(r.name || 'Sin nombre') + '</b>'
            + '<small>' + (t ? e(t.name) + ' · ' : '') + e(r.date) + ' ' + e(r.time) + ' · 👥 ' + (r.people || 1) + (r.phone ? ' · ' + e(r.phone) : '') + '</small>'
            + (r.note ? '<small class="fd-res-note">' + e(r.note) + '</small>' : '') + '</div>'
            + '<button class="btn ghost sm" data-del-res="' + e(r.id) + '">Cancelar</button></div>';
        }).join('')
      : '<p class="fd-empty">Sin reservas' + (table ? ' para ' + e(table.name) : '') + '.</p>';

    const m = modal({
      title: table ? 'Reservas de ' + table.name : 'Reservas de hoy',
      wide: true,
      body: '<div class="fd-res-form">'
        + '<label>Nombre<input id="fd-res-name" maxlength="60" placeholder="A nombre de…"></label>'
        + '<label>Teléfono<input id="fd-res-phone" maxlength="20" inputmode="tel" placeholder="Opcional"></label>'
        + '<label>Fecha<input id="fd-res-date" type="date" value="' + hoyISO() + '"></label>'
        + '<label>Hora<input id="fd-res-time" type="time" value="' + new Date().toTimeString().slice(0, 5) + '"></label>'
        + '<label>Personas<input id="fd-res-people" type="number" min="1" max="30" value="' + (table?.seats || 2) + '"></label>'
        + (table ? '' : '<label>Mesa<select id="fd-res-table">' + activeTables().map(t => '<option value="' + e(t.id) + '">' + e(t.name) + '</option>').join('') + '</select></label>')
        + '</div>'
        + '<label style="display:block;margin:8px 0"><span style="font-size:12px;font-weight:800;color:var(--muted)">Nota</span>'
        + '<input id="fd-res-note" maxlength="120" placeholder="Cumpleaños, silla para bebé…" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px"></label>'
        + '<div class="fd-res-list"><h4 style="margin:14px 0 8px;font-size:13px">Reservas registradas</h4>' + filas + '</div>',
      foot: '<button class="btn ghost" data-close>Cerrar</button><button class="btn" id="fd-res-save">Guardar reserva</button>',
    });

    m.root.querySelector('#fd-res-save').onclick = () => {
      const nombre = m.root.querySelector('#fd-res-name').value.trim();
      if (!nombre) { toast('Escribe el nombre de la reserva'); return; }
      const tableId = table ? table.id : m.root.querySelector('#fd-res-table').value;
      reservas().push({
        id: uid(),
        tableId,
        name: nombre.slice(0, 60),
        phone: m.root.querySelector('#fd-res-phone').value.trim().slice(0, 20),
        date: m.root.querySelector('#fd-res-date').value || hoyISO(),
        time: m.root.querySelector('#fd-res-time').value || '20:00',
        people: Math.max(1, Number(m.root.querySelector('#fd-res-people').value) || 2),
        note: m.root.querySelector('#fd-res-note').value.trim().slice(0, 120),
        status: 'reservada',
        createdAt: new Date().toISOString(),
        user: waiter().name,
      });
      save();
      m.close();
      toast('Reserva guardada: ' + nombre);
      render();
    };

    m.root.querySelectorAll('[data-del-res]').forEach(b => b.onclick = () => {
      const r = reservas().find(x => x.id === b.dataset.delRes);
      if (!r) return;
      r.status = 'cancelada';
      save();
      b.closest('.fd-res-row')?.remove();
      toast('Reserva cancelada');
      render();
    });
  }

  function paintTable() {`;
must(a.includes(ancla), 'ancla paintTable');
a = a.replace(ancla, funciones);

// 4) Botones: reservar en la mesa y lista de reservas en el salón
const viejoBtn = `      '<button class="btn ghost" id="fd-qr">QR de la mesa</button>' +`;
const nuevoBtn = `      '<button class="btn ghost" id="fd-qr">QR de la mesa</button>' +
      '<button class="btn ghost" id="fd-reservar">📅 Reservar</button>' +`;
must(a.includes(viejoBtn), 'botón QR');
a = a.replace(viejoBtn, nuevoBtn);

const viejoHandler = `    root.querySelector('#fd-qr')?.addEventListener('click', () => abrirQRMesa(order, table));`;
const nuevoHandler = viejoHandler + `
    root.querySelector('#fd-reservar')?.addEventListener('click', () => abrirReservas(table));`;
must(a.includes(viejoHandler), 'handler QR');
a = a.replace(viejoHandler, nuevoHandler);

// 5) Botón "Reservas de hoy" en la barra del salón
const viejoTools = `      + (manager() ? '<button type="button" class="btn ghost sm' + (cfg.editing ? ' on' : '') + '" id="fd-salon-edit"`;
const nuevoTools = `      + (manager() ? '<button type="button" class="btn ghost sm" id="fd-reservas-todas">📅 Reservas</button>' : '')
      + (manager() ? '<button type="button" class="btn ghost sm' + (cfg.editing ? ' on' : '') + '" id="fd-salon-edit"`;
must(a.includes(viejoTools), 'barra de herramientas del salón');
a = a.replace(viejoTools, nuevoTools);

const viejoBind = `    root.querySelector('#fd-salon-edit')?.addEventListener('click', () => { const c = salonCfg(); c.editing = !c.editing; render(); });`;
const nuevoBind = viejoBind + `
    root.querySelector('#fd-reservas-todas')?.addEventListener('click', () => abrirReservas(null));`;
must(a.includes(viejoBind), 'handler de mover mesas');
a = a.replace(viejoBind, nuevoBind);

fs.writeFileSync(ruta, a, 'utf8');
console.log('reservas agregadas');
