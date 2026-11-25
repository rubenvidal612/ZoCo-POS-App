// Reemplaza la cuadrícula de mesas por un salón visual con efecto 3D.
// Mesas con posición, forma, lugares, salón (zona), mesero, tiempo y comensales.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

const inicio = a.indexOf('  function paintTables() {');
const fin = a.indexOf('  function paintTable() {');
must(inicio > 0 && fin > inicio, 'bloque paintTables');

const nuevo = `  /* ===================== Salón visual (3D) ===================== */
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
      + '<b class="fd-mesa-n">' + e(String(t.name).replace(/^Mesa\\s*/i, '')) + '</b>'
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
      (manager() ? '<div class="fd-box fd-config">'
        + '<div class="fd-cfg-inline"><label>Mesas del local <input id="fd-table-count" type="number" min="1" max="99" value="' + Math.max(todas.length, 8) + '"></label>'
        + '<button class="btn" id="fd-create-tables">Aplicar</button>'
        + '<button class="btn ghost sm" id="fd-salon-edit" aria-pressed="' + cfg.editing + '">' + (cfg.editing ? '✓ Terminar de mover' : '✥ Mover mesas') + '</button>'
        + '<select id="fd-salon-zone" aria-label="Salón">' + zonas().map(z => '<option value="' + e(z) + '"' + (z === zonaActual ? ' selected' : '') + '>' + e(z) + '</option>').join('') + '</select>'
        + '<button class="btn ghost sm" id="fd-zone-new">+ Salón</button>'
        + '</div></div>' : '')
      + '<div class="fd-salon-bar">'
      + '<div class="fd-salones">' + zonas().map(z => '<button type="button" class="fd-zona' + (z === zonaActual ? ' on' : '') + '" data-zona="' + e(z) + '">' + e(z) + '</button>').join('') + '</div>'
      + '<div class="fd-salon-tools">'
      + '<button type="button" class="btn ghost sm" id="fd-view3d">' + (cfg.mode3d ? '▦ Vista plana' : '⬒ Vista 3D') + '</button>'
      + '<button type="button" class="btn ghost sm" id="fd-zoom-out" aria-label="Alejar">−</button>'
      + '<span class="fd-zoom-val">' + cfg.zoom + '%</span>'
      + '<button type="button" class="btn ghost sm" id="fd-zoom-in" aria-label="Acercar">+</button>'
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
      'Mesa ' + t.name + '\\n\\nEscribe:\\n1 = cuadrada\\n2 = redonda\\n3 = cambiar lugares\\n4 = mover a otro salón\\n5 = eliminar mesa',
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
      const z = prompt('¿A qué salón la mueves?\\n' + zonas().join(' / '), t.zone || ZONAS_BASE[0]);
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

`;
a = a.slice(0, inicio) + nuevo + a.slice(fin);
fs.writeFileSync(ruta, a, 'utf8');
console.log('salón 3D insertado en views-food-service.js');
