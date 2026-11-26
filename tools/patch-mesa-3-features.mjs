// QR por mesa, transferir mesa y dividir cuenta.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Imports
a = a.replace(
  "import { esc, toast, money, confirmDialog } from './ui.js';",
  "import { esc, toast, money, confirmDialog, modal } from './ui.js';\nimport { qrDataUrl } from './qr.js';",
);

// 2) Total con pagado / pendiente y botones nuevos
const viejoTotal = `      '<div class="fd-total">Total <strong>' + money(sum(order.items)) + '</strong></div>' +`;
const nuevoTotal = `      '<div class="fd-total">Total <strong>' + money(sum(order.items)) + '</strong></div>' +
      (pagadoDe(order) > 0
        ? '<p class="fd-help"><b>Pagado: ' + money(pagadoDe(order)) + '</b> · Pendiente: <b>' + money(Math.max(0, sum(order.items) - pagadoDe(order))) + '</b></p>'
        : '') +`;
must(a.includes(viejoTotal), 'total de la cuenta');
a = a.replace(viejoTotal, nuevoTotal);

const viejoAcciones = `      '<button class="btn ghost" id="fd-bill">Imprimir precuenta</button>' +`;
const nuevoAcciones = `      '<button class="btn ghost" id="fd-bill">Imprimir precuenta</button>' +
      '<button class="btn ghost" id="fd-qr">QR de la mesa</button>' +
      '<button class="btn ghost" id="fd-transfer">⇄ Transferir</button>' +
      (order.items.length ? '<button class="btn ghost" id="fd-split">Dividir cuenta</button>' : '') +`;
must(a.includes(viejoAcciones), 'botón de precuenta');
a = a.replace(viejoAcciones, nuevoAcciones);

// 3) Funciones nuevas (antes de paintTable)
const ancla = `  function paintTable() {`;
const funciones = `  /* ============ Cuenta dividida ============ */
  const pagadoDe = (order) => (order.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pendienteDe = (order) => Math.max(0, sum(order.items) - pagadoDe(order));

  function registrarPagoParcial(order, monto, metodo, etiqueta) {
    const m = Math.min(Number(monto) || 0, pendienteDe(order));
    if (m <= 0) return false;
    if (!Array.isArray(order.payments)) order.payments = [];
    order.payments.push({ id: uid(), amount: m, method: metodo, label: etiqueta || '', at: new Date().toISOString(), user: waiter().name });
    save();
    return true;
  }

  function abrirDividir(order, table) {
    const total = sum(order.items);
    const yaPagado = pagadoDe(order);
    const pendiente = pendienteDe(order);
    const m = modal({
      title: 'Dividir cuenta · ' + table.name,
      wide: true,
      body:
        '<div class="fd-split">'
        + '<div class="fd-split-res"><div><small>Total</small><b>' + money(total) + '</b></div>'
        + '<div><small>Pagado</small><b>' + money(yaPagado) + '</b></div>'
        + '<div class="on"><small>Pendiente</small><b>' + money(pendiente) + '</b></div></div>'
        + '<div class="fd-split-tabs"><button class="on" data-modo="personas">Por personas</button><button data-modo="productos">Por producto</button></div>'
        + '<div id="fd-split-personas">'
        + '<label style="display:block;margin:10px 0 6px;font-size:12.5px;font-weight:800;color:var(--muted)">¿Entre cuántas personas?</label>'
        + '<div class="fd-split-people"><input id="fd-split-n" type="number" min="2" max="30" value="2">'
        + '<span id="fd-split-each">' + money(pendiente / 2) + ' c/u</span>'
        + '<button class="btn sm" id="fd-split-cobrar1">Cobrar 1 parte</button></div></div>'
        + '<div id="fd-split-productos" hidden><div id="fd-split-items"></div>'
        + '<div class="fd-split-foot"><b id="fd-split-sel">' + money(0) + '</b><button class="btn sm" id="fd-split-cobrar-sel" disabled>Cobrar selección</button></div></div>'
        + '</div>',
      foot: '<button class="btn ghost" data-close>Cerrar</button>',
    });

    const respuestas = m.root;

    // Pestañas
    respuestas.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => {
      respuestas.querySelectorAll('[data-modo]').forEach(x => x.classList.toggle('on', x === b));
      respuestas.querySelector('#fd-split-personas').hidden = b.dataset.modo !== 'personas';
      respuestas.querySelector('#fd-split-productos').hidden = b.dataset.modo !== 'productos';
    });

    // Por personas
    const inputN = respuestas.querySelector('#fd-split-n');
    const cada = respuestas.querySelector('#fd-split-each');
    const recalcular = () => {
      const n = Math.max(2, Math.min(30, Number(inputN.value) || 2));
      cada.textContent = money(pendienteDe(order) / n) + ' c/u';
    };
    inputN.oninput = recalcular;
    respuestas.querySelector('#fd-split-cobrar1').onclick = () => {
      const n = Math.max(2, Math.min(30, Number(inputN.value) || 2));
      const parte = Math.round((pendienteDe(order) / n) * 100) / 100;
      if (!registrarPagoParcial(order, parte, 'cash', 'Parte de ' + n)) { toast('Nada pendiente'); return; }
      toast('Cobrado ' + money(parte));
      cerrarYRefrescar();
    };

    // Por producto
    const box = respuestas.querySelector('#fd-split-items');
    const sel = respuestas.querySelector('#fd-split-sel');
    const btnSel = respuestas.querySelector('#fd-split-cobrar-sel');
    const pintarItems = () => {
      box.innerHTML = order.items.map(i =>
        '<label class="fd-split-item"><input type="checkbox" data-item="' + e(i.id) + '">'
        + '<span>' + e(i.qty) + ' × ' + e(i.name) + (i.note ? ' <small>(' + e(i.note) + ')</small>' : '') + '</span>'
        + '<b>' + money(i.qty * i.price) + '</b></label>').join('');
      box.querySelectorAll('input[data-item]').forEach(ch => ch.onchange = () => {
        const total = [...box.querySelectorAll('input[data-item]:checked')].reduce((s, c) => {
          const it = order.items.find(x => x.id === c.dataset.item);
          return s + (it ? it.qty * it.price : 0);
        }, 0);
        sel.textContent = money(total);
        btnSel.disabled = total <= 0;
        btnSel.dataset.total = total;
      });
    };
    pintarItems();
    btnSel.onclick = () => {
      const monto = Number(btnSel.dataset.total) || 0;
      if (!registrarPagoParcial(order, monto, 'cash', 'Productos seleccionados')) { toast('Nada pendiente'); return; }
      toast('Cobrado ' + money(monto));
      cerrarYRefrescar();
    };

    function cerrarYRefrescar() {
      const pend = pendienteDe(order);
      if (pend <= 0.01) {
        m.close();
        toast('Cuenta completa: ' + money(total) + '. Puedes cerrar la mesa');
      } else {
        m.close();
        toast('Falta cobrar ' + money(pend));
      }
      render();
    }
  }

  /* ============ QR de la mesa ============ */
  function abrirQRMesa(order, table) {
    const base = location.origin + '/menu';
    const comp = encodeURIComponent(state.currentCompany || 'default');
    const link = base + '?c=' + comp + '&m=' + encodeURIComponent(table.name) + '&t=' + encodeURIComponent(table.id);
    let png = '';
    try { png = qrDataUrl(link, { size: 300, margin: 4, ec: 'M' }); } catch {}
    const m = modal({
      title: 'QR de ' + table.name,
      body:
        '<div class="fd-qr-box">' + (png ? '<img src="' + png + '" alt="QR de ' + e(table.name) + '" width="230" height="230">' : '<p>No se pudo dibujar el QR</p>') + '</div>'
        + '<p class="fd-help" style="text-align:center">El cliente escanea este código, ve el menú y su pedido llega por WhatsApp con el número de mesa.</p>'
        + '<div class="fd-qr-link">' + e(link) + '</div>',
      foot: '<button class="btn ghost" data-close>Cerrar</button><button class="btn ghost" id="fd-qr-copy">Copiar enlace</button><button class="btn" id="fd-qr-print">Imprimir QR</button>',
    });
    m.root.querySelector('#fd-qr-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(link); toast('Enlace copiado'); } catch { toast('No se pudo copiar'); }
    };
    m.root.querySelector('#fd-qr-print').onclick = () => {
      const w = window.open('', '_blank', 'width=420,height=620');
      if (!w) { toast('Permite las ventanas emergentes'); return; }
      w.document.write('<!doctype html><meta charset="utf-8"><title>QR ' + esc(table.name) + '</title>'
        + '<body style="font-family:system-ui;text-align:center;padding:24px">'
        + '<h2 style="margin:0 0 4px">' + esc(state.company?.name || 'ZoCo') + '</h2>'
        + '<p style="margin:0 0 16px;font-size:20px;font-weight:800">' + esc(table.name) + '</p>'
        + (png ? '<img src="' + png + '" style="width:260px;height:260px">' : '')
        + '<p style="font-size:13px;margin-top:14px">Escanea para ver el menú y pedir desde tu mesa</p>'
        + '</body>');
      w.document.close();
      setTimeout(() => { try { w.print(); } catch {} }, 400);
    };
  }

  /* ============ Transferir mesa ============ */
  function abrirTransferir(order, table) {
    const meseros = (state.users || []).filter(u => u.role !== 'KITCHEN');
    if (!meseros.length) { toast('No hay personal para asignar'); return; }
    const m = modal({
      title: 'Transferir ' + table.name,
      body: '<p class="fd-help">Elige el mesero que atenderá esta mesa.</p><div class="fd-transfer">'
        + meseros.map(u => '<button class="fd-transfer-op' + (u.id === order.waiterId ? ' on' : '') + '" data-u="' + e(u.id) + '">'
          + '<b>' + e(u.name) + '</b><small>' + e(u.role || '') + '</small></button>').join('')
        + '</div>',
      foot: '<button class="btn ghost" data-close>Cancelar</button>',
    });
    m.root.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
      const u = meseros.find(x => x.id === b.dataset.u);
      if (!u) return;
      order.waiterId = u.id;
      order.waiterName = u.name;
      save();
      m.close();
      toast('Mesa transferida a ' + u.name);
      render();
    });
  }

  function paintTable() {`;
must(a.includes(ancla), 'ancla paintTable');
a = a.replace(ancla, funciones);

// 4) Conectar los botones nuevos
const anclaBack = `    root.querySelector('#fd-back').onclick = () => {tab='mesas';currentTable=null;render();};`;
const handlers = anclaBack + `
    root.querySelector('#fd-qr')?.addEventListener('click', () => abrirQRMesa(order, table));
    root.querySelector('#fd-transfer')?.addEventListener('click', () => abrirTransferir(order, table));
    root.querySelector('#fd-split')?.addEventListener('click', () => abrirDividir(order, table));`;
must(a.includes(anclaBack), 'handler de regreso');
a = a.replace(anclaBack, handlers);

fs.writeFileSync(ruta, a, 'utf8');
console.log('QR, transferir y dividir cuenta agregados');
