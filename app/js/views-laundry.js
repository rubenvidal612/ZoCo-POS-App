// ZoCo Lavandería / Tintorería: tablero de órdenes de servicio.
import { el, esc, money, toast, modal, confirmDialog, readImageCompressed } from './ui.js';
import {
  state, emit, laundryOrders, createLaundryOrder, moveLaundryOrder,
  laundryStats, LAUNDRY_STATUS, productById, sectionsForMode, addLaundryPhoto, removeLaundryPhoto,
} from './store.js';

const COLUMNAS = LAUNDRY_STATUS;

function trackUrl(orden) {
  const base = location.origin + '/orden';
  const c = encodeURIComponent(state.currentCompany || 'default');
  const f = encodeURIComponent(orden.folio);
  const k = orden.trackCode ? '&k=' + encodeURIComponent(orden.trackCode) : '';
  return base + '?c=' + c + '&f=' + f + k;
}

function waLink(orden, estado) {
  const tel = String(orden.phone || '').replace(/\D/g, '');
  const num = tel ? (tel.length === 10 ? '52' + tel : tel) : '';
  const texto = `Hola ${orden.customer}! Tu orden ${orden.folio} está: ${estado}. Total ${money(orden.total)}.`;
  return num
    ? `https://wa.me/${num}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

export function laundryView(ctx) {
  const root = el(`
    <div class="ld-root">
    <div class="panel ld-wrap">
      <div class="panel-head ld-head">
        <h2>Lavandería · Órdenes</h2>
        <div class="sp"></div>
        <button class="btn sm" id="ld-new">+ Nueva orden</button>
      </div>
      <div class="ld-kpis" id="ld-kpis"></div>
      <div class="ld-board" id="ld-board"></div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-head"><h2>Insumos con stock bajo</h2></div>
      <div style="padding:14px 18px" id="ld-low"></div>
    </div>
    </div>
  `);

  const kpis = root.querySelector('#ld-kpis');
  const board = root.querySelector('#ld-board');
  const lowBox = root.querySelector('#ld-low');

  const pintar = () => {
    const st = laundryStats();
    kpis.innerHTML = `
      ${COLUMNAS.map((c) => `<div class="ld-kpi ${c.key}">
        <b>${st.porEstado[c.key] || 0}</b><span>${esc(c.label)}</span></div>`).join('')}
      <div class="ld-kpi wide"><b>${money(st.ingresosHoy)}</b><span>Entregado hoy (${st.entregadasHoy})</span></div>`;

    const orders = laundryOrders();
    board.innerHTML = COLUMNAS.map((c) => {
      const lista = orders.filter((o) => o.status === c.key);
      return `<div class="ld-col" data-col="${c.key}">
        <div class="ld-col-head">${esc(c.label)} <b>${lista.length}</b></div>
        <div class="ld-col-body">
          ${lista.length ? lista.map((o) => `
            <article class="ld-card" data-id="${o.id}">
              <div class="ld-card-top"><b>${esc(o.folio)}</b><span>${new Date(o.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div class="ld-card-name">${esc(o.customer)}</div>
              <div class="ld-card-meta">${o.items.reduce((s, i) => s + Number(i.qty || 0), 0)} prenda(s) · ${money(o.total)}</div>
              ${o.shelf ? `<div class="ld-shelf">📍 Estante ${esc(o.shelf)}</div>` : ''}
              <div class="ld-card-actions">
                ${c.key !== 'recibido' ? `<button class="ld-mini" data-back="${o.id}" title="Regresar">←</button>` : ''}
                ${c.key !== 'entregado' ? `<button class="ld-mini go" data-next="${o.id}">Avanzar →</button>` : ''}
              </div>
            </article>`).join('')
            : '<div class="ld-empty">Sin órdenes</div>'}
        </div>
      </div>`;
    }).join('');

    board.querySelectorAll('[data-next]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const o = laundryOrders().find((x) => x.id === b.dataset.next);
        const idx = COLUMNAS.findIndex((c) => c.key === o?.status);
        const siguiente = COLUMNAS[Math.min(COLUMNAS.length - 1, idx + 1)];
        moveLaundryOrder(b.dataset.next, siguiente.key);
        pintar();
        toast(o.folio + ' → ' + siguiente.label);
      };
    });
    board.querySelectorAll('[data-back]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const o = laundryOrders().find((x) => x.id === b.dataset.back);
        const idx = COLUMNAS.findIndex((c) => c.key === o?.status);
        const prev = COLUMNAS[Math.max(0, idx - 1)];
        moveLaundryOrder(b.dataset.back, prev.key);
        pintar();
      };
    });
    board.querySelectorAll('.ld-card').forEach((card) => {
      card.onclick = () => abrirDetalle(card.dataset.id);
    });

    // Insumos con stock bajo (sección 'insumos')
    const insumos = (state.products || []).filter((p) => p.section === 'insumos');
    const totalStock = (p) => Object.values(p.branchStock || {})
      .reduce((s, rama) => s + Object.values(rama || {}).reduce((x, q) => x + (Number(q) || 0), 0), 0);
    const bajos = insumos.filter((p) => totalStock(p) <= 5);
    lowBox.innerHTML = insumos.length
      ? (bajos.length
        ? bajos.map((p) => `<div class="ld-low-row"><b>${esc(p.name)}</b><span>quedan pocas existencias</span></div>`).join('')
        : '<div class="hint">Todos tus insumos tienen existencia suficiente.</div>')
      : '<div class="hint">Agrega tus insumos (detergente, suavizante, bolsas) en Productos con la sección <b>Insumos</b> para ver alertas aquí.</div>';
  };

  const abrirDetalle = (id) => {
    const o = laundryOrders().find((x) => x.id === id);
    if (!o) return;
    const estado = COLUMNAS.find((c) => c.key === o.status)?.label || o.status;
    const link = trackUrl(o);
    const mensajeBase = `Hola ${o.customer}! Tu orden ${o.folio} está ${estado.toLowerCase()}. Total ${money(o.total)}.` +
      (o.status === 'listo' ? ` Ya puedes pasar por ella.` : '') +
      `\nSigue tu orden aquí: ${link}`;

    const m = modal({
      title: 'Orden ' + o.folio,
      wide: true,
      body: `
        <div class="ld-det">
          <div class="ld-det-row"><span>Cliente</span><b>${esc(o.customer)}</b></div>
          ${o.phone ? `<div class="ld-det-row"><span>WhatsApp</span><b>${esc(o.phone)}</b></div>` : ''}
          <div class="ld-det-row"><span>Estado</span><b>${esc(estado)}</b></div>
          ${o.shelf ? `<div class="ld-det-row"><span>Estante</span><b>${esc(o.shelf)}</b></div>` : ''}
          <table style="width:100%;margin-top:12px"><thead><tr><th>Prenda / servicio</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead>
          <tbody>${o.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(i.qty * i.price)}</td></tr>`).join('')}</tbody></table>
          ${o.extra ? `<div class="ld-det-row" style="margin-top:8px"><span>Cargo extra</span><b>${money(o.extra)}</b></div>` : ''}
          <div class="ld-det-total"><span>Total</span><b>${money(o.total)}</b></div>
          ${o.note ? `<div class="hint" style="margin-top:10px">Nota: ${esc(o.note)}</div>` : ''}

          <div class="ld-block">
            <div class="ld-block-head"><b>Fotos de la orden</b><span class="hint">Al recibir y al entregar</span></div>
            <div class="ld-photos" id="ld-photos"></div>
            <label class="btn ghost sm" style="cursor:pointer;display:inline-block;margin-top:8px">Agregar foto
              <input id="ld-photo-input" type="file" accept="image/*" capture="environment" style="display:none">
            </label>
          </div>

          <div class="ld-block">
            <div class="ld-block-head"><b>QR de seguimiento</b><span class="hint">El cliente ve el estado</span></div>
            <div class="ld-qr" id="ld-qr"><div class="hint">Generando…</div></div>
            <div class="ld-link">${esc(link)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <button class="btn ghost sm" id="ld-copy">Copiar enlace</button>
              <a class="btn ghost sm" href="${esc(link)}" target="_blank" rel="noopener">Abrir seguimiento</a>
            </div>
          </div>

          <div class="ld-block">
            <div class="ld-block-head"><b>Mensaje para el cliente</b><span class="hint">Puedes editarlo</span></div>
            <textarea id="ld-msg" class="ld-textarea" rows="4">${esc(mensajeBase)}</textarea>
          </div>
        </div>`,
      foot: `<button class="btn ghost" data-close>Cerrar</button>
             <button class="btn ghost" id="ld-wa">Enviar por WhatsApp</button>
             <button class="btn" id="ld-print">Imprimir ticket</button>`,
    });

    // --- Fotos ---
    const photosBox = m.root.querySelector('#ld-photos');
    const pintarFotos = () => {
      const fotos = o.photos || [];
      photosBox.innerHTML = fotos.length
        ? fotos.map((f, i) => `<div class="ld-photo">
            <img src="${f.url}" alt="Foto ${i + 1}">
            <button data-del-photo="${i}" title="Quitar">✕</button></div>`).join('')
        : '<div class="hint">Sin fotos todavía.</div>';
      photosBox.querySelectorAll('[data-del-photo]').forEach((b) => {
        b.onclick = () => { removeLaundryPhoto(o.id, Number(b.dataset.delPhoto)); o.photos.splice(Number(b.dataset.delPhoto), 1); pintarFotos(); };
      });
    };
    pintarFotos();
    m.root.querySelector('#ld-photo-input').onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const r = await readImageCompressed(f, 900, 0.6, 90 * 1024);
        const res = addLaundryPhoto(o.id, r.dataUrl);
        if (!res.ok) { toast(res.msg || 'No se pudo agregar'); return; }
        o.photos = res.photos.slice();
        pintarFotos();
        toast('Foto agregada');
      } catch (err) { toast(err.message || 'No se pudo procesar la foto'); }
    };

    // --- QR (se guarda en la orden para reimprimir sin internet) ---
    const qrBox = m.root.querySelector('#ld-qr');
    const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=6&data=' + encodeURIComponent(link);
    const guardarQr = (dataUrl) => { o.qrData = dataUrl; };
    if (o.qrData) {
      qrBox.innerHTML = `<img src="${o.qrData}" alt="QR de seguimiento">`;
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = img.width; cv.height = img.height;
          cv.getContext('2d').drawImage(img, 0, 0);
          const dataUrl = cv.toDataURL('image/png');
          guardarQr(dataUrl);
          qrBox.innerHTML = `<img src="${dataUrl}" alt="QR de seguimiento">`;
        } catch {
          qrBox.innerHTML = `<img src="${qrSrc}" alt="QR de seguimiento">`;
        }
      };
      img.onerror = () => {
        qrBox.innerHTML = '<div class="hint">Sin conexión: el QR se genera cuando haya internet. Comparte el enlace de abajo.</div>';
      };
      img.src = qrSrc;
    }

    m.root.querySelector('#ld-copy').onclick = async () => {
      try {
        await navigator.clipboard.writeText(link);
        toast('Enlace copiado');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = link; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast('Enlace copiado'); } catch { toast('No se pudo copiar'); }
        ta.remove();
      }
    };

    m.root.querySelector('#ld-wa').onclick = () => {
      const texto = m.root.querySelector('#ld-msg').value;
      const tel = String(o.phone || '').replace(/\D/g, '');
      const num = tel ? (tel.length === 10 ? '52' + tel : tel) : '';
      const url = num
        ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(texto)
        : 'https://wa.me/?text=' + encodeURIComponent(texto);
      window.open(url, '_blank');
    };

    m.root.querySelector('#ld-print').onclick = () => {
      const w = window.open('', '_blank', 'width=380,height=640');
      if (!w) { toast('Permite las ventanas emergentes'); return; }
      const fotos = (o.photos || []).map((f) => `<img src="${f.url}" style="width:100%;border-radius:6px;margin-top:6px">`).join('');
      w.document.write(`<pre style="font-family:ui-monospace,monospace;font-size:12px;line-height:1.45;padding:10px">
${esc(state.company?.name || 'ZoCo')}
Orden ${o.folio}
${new Date(o.createdAt).toLocaleString('es-MX')}
Cliente: ${esc(o.customer)}${o.shelf ? '\nEstante: ' + esc(o.shelf) : ''}
--------------------------------
${o.items.map((i) => `${i.qty} x ${esc(i.name)}  ${money(i.qty * i.price)}`).join('\n')}
${o.extra ? 'Extra: ' + money(o.extra) : ''}
--------------------------------
TOTAL: ${money(o.total)}
Estado: ${esc(estado)}

Sigue tu orden:
${esc(link)}
${o.qrData ? '<img src="' + o.qrData + '" style="width:150px;height:150px">' : ''}
${fotos}
</pre>`);
      w.document.close();
      w.focus();
      setTimeout(() => { try { w.print(); } catch {} }, 400);
    };
  };

  const nuevaOrden = () => {
    const secs = sectionsForMode();
    const productos = (state.products || []).filter((p) => p.active !== false);
    const lineas = [];
    const m = modal({
      title: 'Nueva orden de servicio',
      wide: true,
      body: `
        <div class="row2">
          <div class="field"><label>Cliente</label><input id="lo-cli" placeholder="Nombre"></div>
          <div class="field"><label>WhatsApp</label><input id="lo-tel" inputmode="tel" placeholder="10 dígitos"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Estante / ubicación</label><input id="lo-shelf" placeholder="Ej. A3"></div>
          <div class="field"><label>Cargo extra</label><input id="lo-extra" type="number" step="0.01" placeholder="0.00"></div>
        </div>
        <div class="field"><label>Agregar prenda o servicio</label>
          <div style="display:flex;gap:8px">
            <select id="lo-prod" style="flex:1">
              <option value="">Elige del catálogo…</option>
              ${productos.map((p) => `<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join('')}
            </select>
            <input id="lo-qty" type="number" min="1" step="1" value="1" style="width:80px">
            <button class="btn sm" id="lo-add" type="button">Agregar</button>
          </div>
        </div>
        <div id="lo-lines" style="margin-top:10px"></div>
        <div class="field" style="margin-top:10px"><label>Nota</label><input id="lo-note" placeholder="Ej. mancha en el puño"></div>
        <div class="ld-det-total" style="margin-top:10px"><span>Total</span><b id="lo-total">$0.00</b></div>
      `,
      foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="lo-save">Guardar orden</button>`,
    });

    const linesBox = m.root.querySelector('#lo-lines');
    const totalEl = m.root.querySelector('#lo-total');
    const pintarLineas = () => {
      const sub = lineas.reduce((s, l) => s + l.qty * l.price, 0);
      const extra = Number(m.root.querySelector('#lo-extra').value) || 0;
      totalEl.textContent = money(sub + extra);
      linesBox.innerHTML = lineas.length
        ? lineas.map((l, i) => `<div class="ld-line"><span>${l.qty}× ${esc(l.name)}</span><b>${money(l.qty * l.price)}</b>
            <button class="ld-mini" data-del="${i}">✕</button></div>`).join('')
        : '<div class="hint">Aún no agregas prendas.</div>';
      linesBox.querySelectorAll('[data-del]').forEach((b) => {
        b.onclick = () => { lineas.splice(Number(b.dataset.del), 1); pintarLineas(); };
      });
    };

    m.root.querySelector('#lo-extra').oninput = pintarLineas;
    m.root.querySelector('#lo-add').onclick = () => {
      const id = m.root.querySelector('#lo-prod').value;
      if (!id) { toast('Elige un producto o servicio'); return; }
      const p = productById(id);
      if (!p) return;
      const qty = Math.max(1, Number(m.root.querySelector('#lo-qty').value) || 1);
      lineas.push({ productId: p.id, name: p.name, qty, price: Number(p.price) || 0 });
      pintarLineas();
    };

    m.root.querySelector('#lo-save').onclick = () => {
      const r = createLaundryOrder({
        customer: m.root.querySelector('#lo-cli').value,
        phone: m.root.querySelector('#lo-tel').value,
        shelf: m.root.querySelector('#lo-shelf').value,
        extra: m.root.querySelector('#lo-extra').value,
        note: m.root.querySelector('#lo-note').value,
        items: lineas,
      });
      if (!r.ok) { toast(r.msg); return; }
      m.close();
      pintar();
      toast('Orden ' + r.order.folio + ' creada');
    };
    pintarLineas();
  };

  root.querySelector('#ld-new').onclick = nuevaOrden;
  pintar();
  return { root, refresh: pintar };
}
