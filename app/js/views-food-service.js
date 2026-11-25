// ZoCo Food · Restaurante: mesas, comandas y estaciones de cocina/barra.
// Funciona sobre el estado persistente de ZoCo; no abre conexiones de impresora automáticamente.
import { state, emit, can, currentUser, productById, commitSale, subscribe, salePriceOf } from './store.js';
import { esc, toast, money, confirmDialog } from './ui.js';
import { syncNow } from './sync.js';

const stations = [
  { id: 'cocina', label: 'Cocina', icon: '🍳' },
  { id: 'barra', label: 'Barra', icon: '🥤' },
];
const e = value => esc(String(value ?? ''));
const uid = () => globalThis.crypto?.randomUUID?.() || ('f' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const dateText = iso => new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
const sum = arr => arr.reduce((n, x) => n + Number(x.price || 0) * Number(x.qty || 0), 0);
const validAmount = n => Number.isInteger(Number(n)) && Number(n) >= 1 && Number(n) <= 99;
function model() {
  if (!state.food || typeof state.food !== 'object') state.food = { ingredients: [], recipes: [] };
  state.food.tables ||= [];
  state.food.tableOrders ||= [];
  state.food.stationSettings ||= { cocina: 'Cocina', barra: 'Barra' };
  return state.food;
}
function availableMenu() {
  const ids = new Set((model().recipes || []).map(r => r.productId).filter(Boolean));
  return (state.products || []).filter(p => p.active !== false &&
    (ids.has(p.id) || ['platillos','bebidas_r','postres'].includes(p.section)));
}
function stationOf(product) {
  const recipe = (model().recipes || []).find(r => r.productId === product.id);
  return recipe?.station === 'barra' || (!recipe && product.section === 'bebidas_r') ? 'barra' : 'cocina';
}
function orderFor(tableId) {
  return model().tableOrders.find(o => o.tableId === tableId && o.branchId === state.currentBranch && o.status !== 'paid');
}
function openOrders() {
  return model().tableOrders.filter(o => o.branchId === state.currentBranch && o.status !== 'paid');
}
function activeTables() {
  return model().tables.filter(t => t.branchId === state.currentBranch);
}
function batches() {
  return openOrders().flatMap(o => (o.batches || []).map(b => ({ ...b, order: o })));
}
function printComanda({ title, table, waiter, items, note = '', date = new Date().toISOString(), total = null }) {
  const lines = [
    title, 'Mesa: ' + table, 'Mesero: ' + waiter, dateText(date),
    '----------------------------------',
    ...items.map(i => String(i.qty) + ' x ' + i.name + (i.note ? '\n  ' + i.note : '')),
    '----------------------------------',
    ...(total == null ? [] : ['TOTAL: ' + money(total)]),
    ...(note ? ['Nota: ' + note] : []),
  ];
  const popup = window.open('', '_blank', 'width=440,height=660');
  if (!popup) { toast('Permite ventanas emergentes para imprimir la comanda'); return; }
  const body = popup.document;
  body.open();
  // textContent evita ejecutar HTML introducido en nombres y notas.
  body.write('<!doctype html><html lang="es"><head><title>Comanda ZoCo</title><style>body{font:15px monospace;white-space:pre-wrap;padding:12px;width:280px;max-width:100%;margin:auto}@media print{@page{margin:5mm;size:80mm auto}}</style></head><body><pre id="ticket"></pre></body></html>');
  body.close();
  const pre = body.getElementById('ticket');
  pre.textContent = lines.join('\n');
  popup.focus();
  popup.print();
}
export function foodServiceView() {
  const root = document.createElement('div');
  root.className = 'food-service';
  let tab = currentUser()?.role === 'KITCHEN' ? 'cocina' : 'mesas', currentTable = null, selectedMenu = '', draftNote = '';
  const waiter = () => currentUser() || { name: 'Personal', id: '' };
  const manager = () => can('products.edit');
  const waiterAccess = () => can('food.order') || manager();
  const kitchenAccess = () => can('food.kitchen') || manager();
  const cashierAccess = () => can('sales.sell');
  const save = () => emit();

  function createTables() {
    if (!manager()) return toast('No tienes permiso');
    const n = Number(root.querySelector('#fd-table-count')?.value);
    if (!validAmount(n)) return toast('Indica entre 1 y 99 mesas');
    const existing = activeTables().length;
    if (n < existing) return toast('Para quitar mesas, elimina una mesa libre individualmente');
    const names = new Set(activeTables().map(t => t.name.toLowerCase()));
    for (let i = 1; i <= n; i++) {
      const name = 'Mesa ' + i;
      if (!names.has(name.toLowerCase())) {
        model().tables.push({ id: uid(), name, branchId: state.currentBranch });
        names.add(name.toLowerCase());
      }
    }
    save(); render();
  }
  function openTable(tableId) {
    if (!waiterAccess()) return toast('Solo meseros y encargados pueden tomar pedidos');
    const table = activeTables().find(t => t.id === tableId);
    if (!table) return;
    let order = orderFor(table.id);
    if (!order) {
      order = {
        id: uid(), tableId: table.id, branchId: state.currentBranch,
        waiterId: waiter().id, waiterName: waiter().name,
        people: 1, items: [], batches: [], status: 'open',
        openedAt: new Date().toISOString(),
      };
      model().tableOrders.push(order);
      save();
    }
    currentTable = table.id; tab = 'mesa'; render();
  }
  function addItem(order) {
    if (!waiterAccess()) return toast('Sin permiso');
    const p = productById(selectedMenu);
    if (!p || p.active === false) return toast('Elige un platillo registrado en Productos');
    if (!(Number(salePriceOf(p)) > 0)) return toast('Configura un precio de venta para este platillo antes de agregarlo');
    const qty = Number(root.querySelector('#fd-qty')?.value);
    if (!validAmount(qty)) return toast('La cantidad debe ser entre 1 y 99');
    const note = String(root.querySelector('#fd-note')?.value || '').trim().slice(0, 220);
    order.items.push({
      id: uid(), productId: p.id, name: p.name, qty,
      price: salePriceOf(p), note, station: stationOf(p), sent: false,
    });
    save(); render();
  }
  function sendOrder(order) {
    if (!waiterAccess()) return toast('Sin permiso');
    const unsent = order.items.filter(i => !i.sent);
    if (!unsent.length) return toast('No hay productos nuevos para enviar');
    for (const station of stations) {
      const chosen = unsent.filter(i => i.station === station.id);
      if (!chosen.length) continue;
      order.batches.push({
        id: uid(), station: station.id, createdAt: new Date().toISOString(),
        status: 'pending', items: chosen.map(i => ({ ...i })),
      });
    }
    unsent.forEach(i => { i.sent = true; });
    order.status = 'sent';
    save(); toast('Comandas enviadas a cocina y barra'); render();
  }
  function setStatus(batchId, status) {
    if (!kitchenAccess()) return toast('Sin permiso para cocina');
    if (!['pending', 'preparing', 'ready'].includes(status)) return;
    const match = batches().find(b => b.id === batchId);
    if (!match) return;
    const original = match.order.batches.find(b => b.id === batchId);
    if (!original || original.status === 'ready') return;
    original.status = status;
    if (status === 'ready') original.readyAt = new Date().toISOString();
    save(); render();
  }
  function closeOrder(orderId) {
    if (!cashierAccess()) return toast('El cobro solo está disponible para caja o administración');
    const order = openOrders().find(o => o.id === orderId);
    if (!order || !order.items.length) return toast('No hay artículos por cobrar');
    if (order.items.some(i => !i.sent)) return toast('Envía los productos nuevos antes de cobrar');
    if (order.batches.some(b => b.status !== 'ready')) return toast('Hay comandas pendientes de cocina o barra');
    const payMethod = root.querySelector('#fd-pay-method')?.value || 'cash';
    if (!['cash','debit','credit'].includes(payMethod)) return toast('Método no válido');
    const total = sum(order.items);
    const cart = { lines: order.items.map(i => ({
      key: i.id, productId: i.productId, name: i.name, size: 'Único', vkey: 'Único',
      qty: i.qty, price: i.price, unit: 'pza', color: '', colorVariant: '',
    })), discount: 0, coupon: null };
    const doSave = async () => {
      const confirmed = await confirmDialog({
        title: 'Cobrar y liberar mesa',
        message: 'Se registrará una venta de ' + money(total) + ' y se liberará la mesa. Verifica que el cliente haya pagado.',
        okText: 'Registrar pago',
      });
      if (!confirmed) return;
      // Protección antes de escribir: un solo cierre por pedido.
      if (order.status === 'paid' || order.saleId) return toast('La mesa ya fue cobrada');
      const inBranch = order.branchId === state.currentBranch;
      if (!inBranch) return toast('Selecciona la sucursal correcta');
      try {
        const sale = commitSale({ cart, method: payMethod, received: total,
          customerName: 'Mesa ' + (activeTables().find(t => t.id === order.tableId)?.name || ''),
          note: 'ZoCo Food · mesa · orden ' + order.id, allowFoodShortage: true });
        order.status = 'paid'; order.saleId = sale.id; order.closedAt = new Date().toISOString();
        save(); currentTable = null; tab = 'mesas'; toast('Venta registrada: ' + sale.code); render();
      } catch (err) { toast(err?.message || 'No se pudo cobrar'); }
    };
    doSave();
  }
  function tile(table) {
    const order = orderFor(table.id);
    const ready = order?.batches?.length && order.batches.every(b => b.status === 'ready');
    const status = !order ? 'Libre' : ready ? 'Lista' : order.batches?.length ? 'En preparación' : 'Abierta';
    return '<button type="button" class="fd-table ' + (order ? 'occupied' : '') + '" data-table="' + e(table.id) + '">' +
      '<b>' + e(table.name) + '</b><span>' + e(status) + '</span>' +
      (order ? '<strong>' + money(sum(order.items)) + '</strong><small>Mesero: ' + e(order.waiterName) + '</small>' : '') +
      '</button>';
  }
  /* ===================== Salón visual (3D) ===================== */
  const ZONAS_BASE = ['Salón Principal', 'Terraza'];
  const salonCfg = () => {
    if (!state.food.salon) state.food.salon = { zone: ZONAS_BASE[0], mode3d: true, zoom: 100, editing: false };
    const c = state.food.salon;
    if (!c.zone) c.zone = ZONAS_BASE[0];
    if (typeof c.mode3d !== 'boolean') c.mode3d = true;
    if (!Number(c.zoom)) c.zoom = 100;
    c.editing = !!c.editing;
    return c;
  };
  const zonas = () => {
    const set = new Set([...ZONAS_BASE, ...activeTables().map(t => t.zone || ZONAS_BASE[0])]);
    return [...set];
  };
  // Coloca las mesas que aún no tienen posición (reparto en rejilla).
  function asegurarPosiciones(lista) {
    let cambiado = false;
    lista.forEach((t, i) => {
      if (typeof t.x !== 'number' || typeof t.y !== 'number') {
        const cols = 4;
        const col = i % cols;
        const fila = Math.floor(i / cols);
        t.x = 14 + col * 19 + (fila % 2 ? 6 : 0);
        t.y = 20 + fila * 22;
        cambiado = true;
      }
      if (!t.shape) { t.shape = 'square'; cambiado = true; }
      if (!t.seats) { t.seats = 4; cambiado = true; }
      if (!t.zone) { t.zone = ZONAS_BASE[0]; cambiado = true; }
    });
    if (cambiado) save();
    return cambiado;
  }
  function estadoMesa(table) {
    const order = orderFor(table.id);
    if (!order) return { key: 'libre', label: 'Libre', order: null };
    const enviado = order.items.length > 0 && order.items.every(i => i.sent);
    const listo = order.batches.length > 0 && order.batches.every(b => b.status === 'ready');
    if (enviado && listo) return { key: 'esperando', label: 'Esperando pago', order };
    return { key: 'ocupada', label: 'Ocupada', order };
  }
  const minutos = (iso) => {
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  };
  function mesaHTML(t, orden, totales) {
    const est = estadoMesa(t);
    const mins = est.order ? minutos(est.order.openedAt) : 0;
    const gente = est.order ? (est.order.people || 1) : t.seats;
    const mesa = est.order ? money(totales) : '';
    return '<button type="button" class="fd-mesa ' + est.key + (t.shape === 'round' ? ' round' : '') + '"'
      + ' data-mesa="' + e(t.id) + '" style="--x:' + Number(t.x) + '%;--y:' + Number(t.y) + '%;--seats:' + (t.seats || 4) + '">'
      + '<span class="fd-mesa-top">'
      + '<b class="fd-mesa-n">' + e(String(t.name).replace(/^Mesa\s*/i, '')) + '</b>'
      + (est.order
        ? '<small class="fd-mesa-w">' + e(est.order.waiterName || '') + '</small>'
          + '<small class="fd-mesa-meta">⏱ ' + mins + "' · 👥 " + gente + '</small>'
          + '<small class="fd-mesa-total">' + mesa + '</small>'
        : '<small class="fd-mesa-meta">👥 ' + (t.seats || 4) + ' lugares</small>'
          + '<small class="fd-mesa-libre">Libre</small>')
      + '</span>'
      + '<span class="fd-mesa-shadow" aria-hidden="true"></span>'
      + '</button>';
  }
  function paintTables() {
    const cfg = salonCfg();
    const todas = activeTables();
    asegurarPosiciones(todas);
    const zonaActual = cfg.zone;
    const lista = todas.filter(t => (t.zone || ZONAS_BASE[0]) === zonaActual);
    const ordenes = lista.map(t => orderFor(t.id));

    root.querySelector('#fd-body').innerHTML =
      (manager() ? '<details class="fd-cfg"><summary>⚙ Configurar mesas y salones</summary>'
        + '<div class="fd-cfg-inline"><label>Mesas del local <input id="fd-table-count" type="number" min="1" max="99" value="' + Math.max(todas.length, 8) + '"></label>'
        + '<button class="btn sm" id="fd-create-tables">Aplicar</button>'
        + '<select id="fd-salon-zone" aria-label="Salón">' + zonas().map(z => '<option value="' + e(z) + '"' + (z === zonaActual ? ' selected' : '') + '>' + e(z) + '</option>').join('') + '</select>'
        + '<button class="btn ghost sm" id="fd-zone-new">+ Salón nuevo</button>'
        + '</div></details>' : '')
      + '<div class="fd-salon-bar">'
      + '<div class="fd-salones">' + zonas().map(z => '<button type="button" class="fd-zona' + (z === zonaActual ? ' on' : '') + '" data-zona="' + e(z) + '">' + e(z) + '</button>').join('') + '</div>'
      + '<div class="fd-salon-tools">'
      + '<button type="button" class="btn ghost sm" id="fd-view3d">' + (cfg.mode3d ? '▦ Vista plana' : '⬒ Vista 3D') + '</button>'
      + '<button type="button" class="btn ghost sm" id="fd-zoom-out" aria-label="Alejar">−</button>'
      + '<span class="fd-zoom-val">' + cfg.zoom + '%</span>'
      + '<button type="button" class="btn ghost sm" id="fd-zoom-in" aria-label="Acercar">+</button>'
      + (manager() ? '<button type="button" class="btn ghost sm' + (cfg.editing ? ' on' : '') + '" id="fd-salon-edit" aria-pressed="' + cfg.editing + '">' + (cfg.editing ? '✓ Listo' : '✥ Mover mesas') + '</button>' : '')
      + '</div></div>'
      + '<div class="fd-salon-wrap' + (cfg.zoom !== 100 ? ' zoom' : '') + '" style="--zoom:' + (cfg.zoom / 100) + '">'
      + '<div class="fd-salon' + (cfg.mode3d ? ' is3d' : '') + (cfg.editing ? ' editing' : '') + '" id="fd-salon">'
      + lista.map((t, i) => mesaHTML(t, ordenes[i], ordenes[i] ? sum(ordenes[i].items) : 0)).join('')
      + (lista.length ? '' : '<div class="fd-salon-empty">Este salón no tiene mesas todavía.</div>')
      + '</div></div>'
      + '<div class="fd-leyenda"><span class="k libre"></span>Libre <span class="k ocupada"></span>Ocupada <span class="k esperando"></span>Esperando pago</div>';

    // Crear mesas
    root.querySelector('#fd-create-tables')?.addEventListener('click', createTables);
    // Zonas
    root.querySelectorAll('[data-zona]').forEach(b => b.onclick = () => { salonCfg().zone = b.dataset.zona; render(); });
    root.querySelector('#fd-salon-zone')?.addEventListener('change', (ev) => { salonCfg().zone = ev.target.value; render(); });
    root.querySelector('#fd-zone-new')?.addEventListener('click', () => {
      if (!manager()) return;
      const nombre = prompt('Nombre del nuevo salón (ej. Terraza, Barra, Jardín)');
      if (!nombre || !nombre.trim()) return;
      const z = nombre.trim().slice(0, 30);
      const mesa = activeTables()[0];
      if (mesa) { mesa.zone = z; }
      salonCfg().zone = z;
      save(); render();
    });
    // Vista y zoom
    root.querySelector('#fd-view3d')?.addEventListener('click', () => { salonCfg().mode3d = !salonCfg().mode3d; render(); });
    root.querySelector('#fd-zoom-in')?.addEventListener('click', () => { const c = salonCfg(); c.zoom = Math.min(160, c.zoom + 10); render(); });
    root.querySelector('#fd-zoom-out')?.addEventListener('click', () => { const c = salonCfg(); c.zoom = Math.max(60, c.zoom - 10); render(); });
    // Modo mover
    root.querySelector('#fd-salon-edit')?.addEventListener('click', () => { const c = salonCfg(); c.editing = !c.editing; render(); });

    const salon = root.querySelector('#fd-salon');
    if (!salon) return;

    // Arrastrar mesas (solo en modo mover)
    if (salonCfg().editing) {
      salon.querySelectorAll('[data-mesa]').forEach(btn => {
        let arrastrando = false;
        let movido = false;
        btn.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          arrastrando = true;
          movido = false;
          btn.setPointerCapture(ev.pointerId);
        });
        btn.addEventListener('pointermove', (ev) => {
          if (!arrastrando) return;
          const r = salon.getBoundingClientRect();
          const x = Math.min(96, Math.max(4, ((ev.clientX - r.left) / r.width) * 100));
          const y = Math.min(94, Math.max(6, ((ev.clientY - r.top) / r.height) * 100));
          const t = activeTables().find(z => z.id === btn.dataset.mesa);
          if (!t) return;
          t.x = Math.round(x * 10) / 10;
          t.y = Math.round(y * 10) / 10;
          btn.style.setProperty('--x', t.x + '%');
          btn.style.setProperty('--y', t.y + '%');
          movido = true;
        });
        btn.addEventListener('pointerup', (ev) => {
          if (!arrastrando) return;
          arrastrando = false;
          try { btn.releasePointerCapture(ev.pointerId); } catch {}
          if (movido) { save(); }
          else abrirAjusteMesa(btn.dataset.mesa);
        });
        btn.addEventListener('pointercancel', () => { arrastrando = false; });
      });
    } else {
      salon.querySelectorAll('[data-mesa]').forEach(btn => btn.addEventListener('click', () => openTable(btn.dataset.mesa)));
    }
  }

  function abrirAjusteMesa(id) {
    const t = activeTables().find(x => x.id === id);
    if (!t || !manager()) return;
    const accion = prompt(
      'Mesa ' + t.name + '\n\nEscribe:\n1 = cuadrada\n2 = redonda\n3 = cambiar lugares\n4 = mover a otro salón\n5 = eliminar mesa',
      '1',
    );
    if (accion === null) return;
    if (accion === '1') { t.shape = 'square'; save(); render(); return; }
    if (accion === '2') { t.shape = 'round'; save(); render(); return; }
    if (accion === '3') {
      const n = Number(prompt('¿Cuántos lugares tiene la mesa? (1 a 20)', String(t.seats || 4)));
      if (Number.isFinite(n) && n >= 1 && n <= 20) { t.seats = n; save(); render(); }
      return;
    }
    if (accion === '4') {
      const z = prompt('¿A qué salón la mueves?\n' + zonas().join(' / '), t.zone || ZONAS_BASE[0]);
      if (z && z.trim()) { t.zone = z.trim(); save(); render(); }
      return;
    }
    if (accion === '5') {
      if (estadoMesa(t).order) { toast('No puedes eliminar una mesa con pedido abierto'); return; }
      if (!confirm('¿Eliminar ' + t.name + '?')) return;
      model().tables = model().tables.filter(x => x.id !== t.id);
      save(); render();
    }
  }

  function paintTable() {
    const table = activeTables().find(t => t.id === currentTable);
    const order = table && orderFor(table.id);
    if (!table || !order) { tab = 'mesas'; paintTables(); return; }
    const products = availableMenu();
    const pending = order.items.filter(i => !i.sent);
    const readyCount = order.batches.filter(b => b.status === 'ready').length;
    root.querySelector('#fd-body').innerHTML =
      '<div class="fd-back"><button class="btn ghost sm" id="fd-back">← Mesas</button><h3>' + e(table.name) + '</h3><span>Mesero: ' + e(order.waiterName) + '</span></div>' +
      '<div class="fd-two"><div class="fd-box"><h3>Agregar pedido</h3><label>Platillo o bebida<select id="fd-menu"><option value="">Selecciona un producto</option>' +
      products.map(p => '<option value="' + e(p.id) + '"' + (p.id === selectedMenu ? ' selected' : '') + '>' + e(p.name) + ' · ' + money(salePriceOf(p)) + '</option>').join('') +
      '</select></label><div class="fd-inline"><label>Cantidad<input id="fd-qty" type="number" min="1" max="99" value="1"></label><label>Personas en mesa<input id="fd-people" type="number" min="1" max="30" value="' + e(order.people) + '"></label></div>' +
      '<label>Indicaciones para cocina<input id="fd-note" maxlength="220" placeholder="Sin cebolla, término medio…" value="' + e(draftNote) + '"></label>' +
      '<button class="btn" id="fd-add">+ Agregar a la mesa</button>' +
      (!products.length ? '<p class="fd-help">Primero vincula platillos con productos en ZoCo Food o crea productos del giro restaurante.</p>' : '') +
      '</div><div class="fd-box"><h3>Cuenta actual</h3>' +
      (order.items.length ? order.items.map(i =>
        '<div class="fd-line"><div><b>' + e(i.qty) + ' × ' + e(i.name) + '</b><small>' + e(i.note || '') +
        ' · ' + (i.sent ? 'Enviado' : 'Sin enviar') + '</small></div><b>' + money(i.qty * i.price) + '</b>' +
        (!i.sent ? '<button class="btn ghost sm" data-delete="' + e(i.id) + '" aria-label="Quitar producto">×</button>' : '') + '</div>').join('') :
        '<p class="fd-empty">Aún no hay productos en esta mesa.</p>') +
      '<div class="fd-total">Total <strong>' + money(sum(order.items)) + '</strong></div>' +
      '<p class="fd-help">Comandas listas: ' + readyCount + ' de ' + order.batches.length + ' · Pendientes de enviar: ' + pending.length + '</p>' +
      '<div class="fd-actions"><button class="btn" id="fd-send" ' + (!pending.length ? 'disabled' : '') + '>Enviar comanda</button>' +
      (cashierAccess() ? '<select aria-label="Método de pago" id="fd-pay-method"><option value="cash">Efectivo</option><option value="debit">Tarjeta débito</option><option value="credit">Tarjeta crédito</option></select><button class="btn ghost" id="fd-checkout">Cobrar mesa</button>' : '') +
      '<button class="btn ghost" id="fd-bill">Imprimir precuenta</button>' + (!order.items.length ? '<button class="btn ghost" id="fd-release">Liberar mesa vacía</button>' : '') + '</div></div></div>';
    root.querySelector('#fd-back').onclick = () => {tab='mesas';currentTable=null;render();};
    root.querySelector('#fd-menu').onchange = ev => {selectedMenu = ev.target.value;};
    root.querySelector('#fd-note').oninput = ev => {draftNote = ev.target.value;};
    root.querySelector('#fd-people').onchange = ev => {
      const n = Number(ev.target.value);
      if (!Number.isInteger(n) || n < 1 || n > 30) return toast('Entre 1 y 30 personas');
      order.people = n; save();
    };
    root.querySelector('#fd-add').onclick = () => {selectedMenu = root.querySelector('#fd-menu').value;addItem(order);draftNote = '';};
    root.querySelector('#fd-send').onclick = () => sendOrder(order);
    root.querySelector('#fd-checkout')?.addEventListener('click', () => closeOrder(order.id));
    root.querySelector('#fd-release')?.addEventListener('click', async () => {
      if (order.items.length) return toast('No se puede liberar una mesa con productos; cobra primero');
      const ok = await confirmDialog({title:'Liberar mesa vacía',message:'Se eliminará el pedido vacío de esta mesa.',okText:'Liberar mesa'});
      if (!ok) return;
      model().tableOrders = model().tableOrders.filter(o => o.id !== order.id);
      save(); tab='mesas'; currentTable=null; render();
    });
    root.querySelector('#fd-bill').onclick = () => printComanda({
      title: 'PRECUENTA · NO PAGADA', table: table.name, waiter: order.waiterName,
      items: order.items, date: order.openedAt, total: sum(order.items),
    });
    root.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => {
      order.items = order.items.filter(i => i.id !== b.dataset.delete || i.sent);
      save(); render();
    });
  }
  function paintKitchen() {
    if (!kitchenAccess()) {
      root.querySelector('#fd-body').innerHTML = '<p class="fd-empty">Tu cuenta no puede administrar cocina o barra.</p>'; return;
    }
    const list = batches();
    root.querySelector('#fd-body').innerHTML =
      '<p class="fd-help">Cada estación muestra sus propias comandas. Usa «Imprimir» para elegir manualmente la impresora de ese sector.</p>' +
      '<div class="fd-kds">' + stations.map(s => {
        const rows = list.filter(b => b.station === s.id);
        return '<section class="fd-box"><h3>' + s.icon + ' ' + e(s.label) + ' <small>(' + rows.filter(b => b.status !== 'ready').length + ' pendientes)</small></h3>' +
          (rows.length ? rows.map(b => {
            const table = activeTables().find(t => t.id === b.order.tableId);
            return '<article class="fd-ticket"><div class="fd-ticket-head"><b>' + e(table?.name || 'Mesa') + '</b><span>' + e(dateText(b.createdAt)) + '</span></div>' +
              '<small>Mesero: ' + e(b.order.waiterName) + ' · ' + (b.status === 'ready' ? 'LISTO' : b.status === 'preparing' ? 'PREPARANDO' : 'NUEVO') + '</small>' +
              b.items.map(i => '<p><b>' + e(i.qty) + ' × ' + e(i.name) + '</b>' + (i.note ? '<br><small>' + e(i.note) + '</small>' : '') + '</p>').join('') +
              '<div class="fd-actions"><button type="button" class="btn ghost sm" data-print="' + e(b.id) + '">🖨 Imprimir</button>' +
              (b.status === 'pending' ? '<button class="btn sm" data-status="preparing" data-batch="' + e(b.id) + '">Preparar</button>' : '') +
              (b.status !== 'ready' ? '<button class="btn sm" data-status="ready" data-batch="' + e(b.id) + '">Listo</button>' : '') +
              '</div></article>';
          }).join('') : '<p class="fd-empty">Sin comandas.</p>') + '</section>';
      }).join('') + '</div>';
    root.querySelectorAll('[data-status]').forEach(b => b.onclick = () => setStatus(b.dataset.batch,b.dataset.status));
    root.querySelectorAll('[data-print]').forEach(b => b.onclick = () => {
      const item = batches().find(x => x.id === b.dataset.print);
      if (!item) return;
      const table = activeTables().find(t => t.id === item.order.tableId);
      printComanda({ title: item.station === 'barra' ? 'COMANDA · BARRA' : 'COMANDA · COCINA',
        table: table?.name || 'Mesa', waiter: item.order.waiterName, items: item.items, date: item.createdAt });
    });
  }
  function render() {
    if (!waiterAccess() && kitchenAccess()) tab = 'cocina';
    if ((tab === 'cocina' && !kitchenAccess()) || (tab === 'mesa' && !waiterAccess())) tab = 'mesas';
    root.innerHTML = '<div class="fd-heading"><h2>Servicio en mesas</h2><p>Meseros, cocina, barra y caja en una misma orden.</p></div>' +
      '<div class="fd-tabs">' + (waiterAccess() ? '<button data-tab="mesas" class="' + (tab === 'mesas' || tab === 'mesa' ? 'active' : '') + '">🪑 Mesas</button>' : '') +
      (kitchenAccess() ? '<button data-tab="cocina" class="' + (tab === 'cocina' ? 'active' : '') + '">🍳 Cocina y barra</button>' : '') + '</div>' +
      '<div class="fd-syncbar"><button type="button" class="btn ghost sm" id="fd-refresh">↻ Actualizar pedidos</button><small>Para ver cambios de otros dispositivos, utiliza la sincronización de tu cuenta.</small></div><div id="fd-body"></div>';
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {tab = b.dataset.tab;currentTable=null;render();});
    root.querySelector('#fd-refresh').onclick=async()=>{
      const btn=root.querySelector('#fd-refresh');btn.disabled=true;
      const result=await syncNow().catch(err=>({ok:false,error:err.message}));
      if(!result.ok){toast(result.error || 'Conecta la nube para actualizar otros dispositivos');btn.disabled=false;return}
      render();toast('Pedidos actualizados');
    };
    if (tab === 'mesa') paintTable();
    else if (tab === 'cocina') paintKitchen();
    else paintTables();
  }
  const unsubscribe = subscribe(() => {
    if (root.isConnected && (tab === 'mesas' || tab === 'cocina')) render();
  });
  render();
  return { root, refresh: () => { if (root.isConnected && (tab === 'mesas' || tab === 'cocina')) render(); },
    destroy: () => unsubscribe() };
}
