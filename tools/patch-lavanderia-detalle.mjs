// Agrega QR de seguimiento, mensaje editable de WhatsApp y fotos a la orden de lavandería.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-laundry.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Imports
a = a.replace(
  `import { el, esc, money, toast, modal, confirmDialog } from './ui.js';`,
  `import { el, esc, money, toast, modal, confirmDialog, readImageCompressed } from './ui.js';`,
);
a = a.replace(
  `  laundryStats, LAUNDRY_STATUS, productById, sectionsForMode, sizesFor, fmtSize,`,
  `  laundryStats, LAUNDRY_STATUS, productById, sectionsForMode, addLaundryPhoto, removeLaundryPhoto,`,
);

// 2) Helper del enlace público
const anclaLink = `function waLink(orden, estado) {`;
const helper = `function trackUrl(orden) {
  const base = location.origin + '/orden';
  const c = encodeURIComponent(state.currentCompany || 'default');
  const f = encodeURIComponent(orden.folio);
  const k = orden.trackCode ? '&k=' + encodeURIComponent(orden.trackCode) : '';
  return base + '?c=' + c + '&f=' + f + k;
}

function waLink(orden, estado) {`;
must(a.includes(anclaLink), 'ancla waLink');
a = a.split(anclaLink).join(helper);

// 3) Detalle con fotos, QR y mensaje editable
const viejoDetalleInicio = `  const abrirDetalle = (id) => {`;
const nuevoDetalleInicio = `  const abrirDetalle = (id) => {`;
must(a.includes(viejoDetalleInicio), 'ancla abrirDetalle');

// Reemplaza el cuerpo del modal de detalle completo
const inicio = a.indexOf('  const abrirDetalle = (id) => {');
const fin = a.indexOf('  const nuevaOrden = () => {');
must(inicio > 0 && fin > inicio, 'bloque abrirDetalle');

const nuevoDetalle = `  const abrirDetalle = (id) => {
    const o = laundryOrders().find((x) => x.id === id);
    if (!o) return;
    const estado = COLUMNAS.find((c) => c.key === o.status)?.label || o.status;
    const link = trackUrl(o);
    const mensajeBase = \`Hola \${o.customer}! Tu orden \${o.folio} está \${estado.toLowerCase()}. Total \${money(o.total)}.\` +
      (o.status === 'listo' ? \` Ya puedes pasar por ella.\` : '') +
      \`\\nSigue tu orden aquí: \${link}\`;

    const m = modal({
      title: 'Orden ' + o.folio,
      wide: true,
      body: \`
        <div class="ld-det">
          <div class="ld-det-row"><span>Cliente</span><b>\${esc(o.customer)}</b></div>
          \${o.phone ? \`<div class="ld-det-row"><span>WhatsApp</span><b>\${esc(o.phone)}</b></div>\` : ''}
          <div class="ld-det-row"><span>Estado</span><b>\${esc(estado)}</b></div>
          \${o.shelf ? \`<div class="ld-det-row"><span>Estante</span><b>\${esc(o.shelf)}</b></div>\` : ''}
          <table style="width:100%;margin-top:12px"><thead><tr><th>Prenda / servicio</th><th>Cant.</th><th>Precio</th><th>Importe</th></tr></thead>
          <tbody>\${o.items.map((i) => \`<tr><td>\${esc(i.name)}</td><td>\${i.qty}</td><td>\${money(i.price)}</td><td>\${money(i.qty * i.price)}</td></tr>\`).join('')}</tbody></table>
          \${o.extra ? \`<div class="ld-det-row" style="margin-top:8px"><span>Cargo extra</span><b>\${money(o.extra)}</b></div>\` : ''}
          <div class="ld-det-total"><span>Total</span><b>\${money(o.total)}</b></div>
          \${o.note ? \`<div class="hint" style="margin-top:10px">Nota: \${esc(o.note)}</div>\` : ''}

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
            <div class="ld-link">\${esc(link)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              <button class="btn ghost sm" id="ld-copy">Copiar enlace</button>
              <a class="btn ghost sm" href="\${esc(link)}" target="_blank" rel="noopener">Abrir seguimiento</a>
            </div>
          </div>

          <div class="ld-block">
            <div class="ld-block-head"><b>Mensaje para el cliente</b><span class="hint">Puedes editarlo</span></div>
            <textarea id="ld-msg" class="ld-textarea" rows="4">\${esc(mensajeBase)}</textarea>
          </div>
        </div>\`,
      foot: \`<button class="btn ghost" data-close>Cerrar</button>
             <button class="btn ghost" id="ld-wa">Enviar por WhatsApp</button>
             <button class="btn" id="ld-print">Imprimir ticket</button>\`,
    });

    // --- Fotos ---
    const photosBox = m.root.querySelector('#ld-photos');
    const pintarFotos = () => {
      const fotos = o.photos || [];
      photosBox.innerHTML = fotos.length
        ? fotos.map((f, i) => \`<div class="ld-photo">
            <img src="\${f.url}" alt="Foto \${i + 1}">
            <button data-del-photo="\${i}" title="Quitar">✕</button></div>\`).join('')
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
      qrBox.innerHTML = \`<img src="\${o.qrData}" alt="QR de seguimiento">\`;
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
          qrBox.innerHTML = \`<img src="\${dataUrl}" alt="QR de seguimiento">\`;
        } catch {
          qrBox.innerHTML = \`<img src="\${qrSrc}" alt="QR de seguimiento">\`;
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
      const tel = String(o.phone || '').replace(/\\D/g, '');
      const num = tel ? (tel.length === 10 ? '52' + tel : tel) : '';
      const url = num
        ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(texto)
        : 'https://wa.me/?text=' + encodeURIComponent(texto);
      window.open(url, '_blank');
    };

    m.root.querySelector('#ld-print').onclick = () => {
      const w = window.open('', '_blank', 'width=380,height=640');
      if (!w) { toast('Permite las ventanas emergentes'); return; }
      const fotos = (o.photos || []).map((f) => \`<img src="\${f.url}" style="width:100%;border-radius:6px;margin-top:6px">\`).join('');
      w.document.write(\`<pre style="font-family:ui-monospace,monospace;font-size:12px;line-height:1.45;padding:10px">
\${esc(state.company?.name || 'ZoCo')}
Orden \${o.folio}
\${new Date(o.createdAt).toLocaleString('es-MX')}
Cliente: \${esc(o.customer)}\${o.shelf ? '\\nEstante: ' + esc(o.shelf) : ''}
--------------------------------
\${o.items.map((i) => \`\${i.qty} x \${esc(i.name)}  \${money(i.qty * i.price)}\`).join('\\n')}
\${o.extra ? 'Extra: ' + money(o.extra) : ''}
--------------------------------
TOTAL: \${money(o.total)}
Estado: \${esc(estado)}

Sigue tu orden:
\${esc(link)}
\${o.qrData ? '<img src="' + o.qrData + '" style="width:150px;height:150px">' : ''}
\${fotos}
</pre>\`);
      w.document.close();
      w.focus();
      setTimeout(() => { try { w.print(); } catch {} }, 400);
    };
  };

`;
a = a.slice(0, inicio) + nuevoDetalle + a.slice(fin);

fs.writeFileSync(ruta, a, 'utf8');
console.log('vista actualizada: QR + mensaje editable + fotos');
