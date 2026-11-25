// Aplica: foto al inicio del editor + campo de descuento + precio con descuento.
// Usa split/join para no interpretar "$" como patrón de reemplazo.
import fs from 'node:fs';

const cat = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let a = fs.readFileSync(cat, 'utf8');
const must = (cond, msg) => { if (!cond) { console.error('FALLO:', msg); process.exit(1); } };
const put = (oldStr, newStr, msg) => {
  must(a.includes(oldStr), msg);
  a = a.split(oldStr).join(newStr);
  console.log('ok:', msg);
};

// 1) Foto al inicio del formulario
const inicio = `      body: \`
        <div class="row2">
          <div class="field"><label>Nombre</label>`;
const conFoto = `      body: \`
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--line)">
          <div id="f-img-prev" style="width:118px;height:118px;border-radius:16px;border:1px solid var(--line);background:var(--surface-2,#F1F5F9);display:grid;place-items:center;overflow:hidden;flex-shrink:0">
            \${p?.image ? \`<img src="\${p.image}" style="width:100%;height:100%;object-fit:cover">\` : '<span style="font-size:30px;color:var(--muted)">📷</span>'}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:800;color:var(--muted);letter-spacing:.4px;margin-bottom:8px">FOTO DEL PRODUCTO</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <label class="btn ghost sm" style="cursor:pointer;margin:0">Subir foto
                <input id="f-img" type="file" accept="image/*" style="display:none">
              </label>
              \${p?.image ? '<button type="button" class="btn ghost sm" id="f-img-del">Quitar</button>' : ''}
            </div>
            <div class="hint" style="margin-top:8px">Se comprime automáticamente (máx 1200px).</div>
          </div>
        </div>
        <div class="row2">
          <div class="field"><label>Nombre</label>`;
put(inicio, conFoto, 'foto al inicio');

// 2) Quitar el bloque viejo de foto
const viejoFoto = `        <div class="field"><label>Foto del producto</label>
          <input id="f-img" type="file" accept="image/*">
          <div id="f-img-prev" style="margin-top:8px">\${p?.image ? \`<img src="\${p.image}" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">\` : ''}</div>
          <div class="hint">Se comprime automáticamente al subir (máx 1200px).</div>
        </div>
`;
put(viejoFoto, '', 'quitar foto vieja');

// 3) Campo de descuento después de precio/costo
const precioCosto = `          <div class="field"><label>Precio de venta</label><input id="f-price" type="number" step="0.01" value="\${p?.price ?? ''}" placeholder="0.00"></div>
          <div class="field"><label>Costo</label><input id="f-cost" type="number" step="0.01" value="\${p?.cost ?? ''}" placeholder="0.00"></div>`;
const conDescuento = precioCosto + `
          <div class="field" style="grid-column:1/-1">
            <label>Descuento</label>
            <label style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:700;margin-bottom:8px">
              <input type="checkbox" id="f-disc-on" \${p?.discount?.on ? 'checked' : ''}> Este producto tiene descuento
            </label>
            <div id="f-disc-box" style="display:\${p?.discount?.on ? 'flex' : 'none'};gap:8px;align-items:center">
              <select id="f-disc-type" style="flex:1">
                <option value="percent" \${(p?.discount?.type || 'percent') === 'percent' ? 'selected' : ''}>Porcentaje (%)</option>
                <option value="amount" \${p?.discount?.type === 'amount' ? 'selected' : ''}>Monto en pesos ($)</option>
              </select>
              <input id="f-disc-val" type="number" min="0" step="0.01" style="width:120px" value="\${p?.discount?.value ?? ''}" placeholder="0">
            </div>
            <div class="hint" id="f-disc-prev" style="margin-top:8px"></div>
          </div>`;
put(precioCosto, conDescuento, 'campo de descuento');

// 4) Handlers: toggle de descuento, vista previa y quitar foto
const anclaImg = `  m.root.querySelector('#f-img').onchange = async (e) => {`;
const handlers = `  // ===== Descuento del producto =====
  const discOn = m.root.querySelector('#f-disc-on');
  const discBox = m.root.querySelector('#f-disc-box');
  const discType = m.root.querySelector('#f-disc-type');
  const discVal = m.root.querySelector('#f-disc-val');
  const discPrev = m.root.querySelector('#f-disc-prev');
  const pintarDescuento = () => {
    if (!discOn) return;
    if (discBox) discBox.style.display = discOn.checked ? 'flex' : 'none';
    if (!discPrev) return;
    const base = Number(m.root.querySelector('#f-price').value) || 0;
    if (!discOn.checked) { discPrev.textContent = ''; return; }
    const v = Number(discVal.value) || 0;
    if (v <= 0) { discPrev.textContent = 'Escribe cuánto descuento quieres aplicar.'; return; }
    const fin = discType.value === 'amount' ? base - v : base - (base * v) / 100;
    discPrev.innerHTML = 'Precio normal <s>' + money(base) + '</s> → se vende en <b style="color:var(--brand-700,#C2410C)">' + money(Math.max(0, fin)) + '</b>';
  };
  if (discOn) {
    discOn.onchange = pintarDescuento;
    discType.onchange = pintarDescuento;
    discVal.oninput = pintarDescuento;
    m.root.querySelector('#f-price').oninput = pintarDescuento;
    pintarDescuento();
  }
  m.root.querySelector('#f-img-del')?.addEventListener('click', (ev) => {
    ev.preventDefault();
    pendingImage = '';
    m.root.querySelector('#f-img-prev').innerHTML = '<span style="font-size:30px;color:var(--muted)">📷</span>';
    ev.target.closest('button')?.remove();
  });

` + anclaImg;
put(anclaImg, handlers, 'handlers de descuento y quitar foto');

// 5) Guardar el descuento en el producto
const objOld = `        id: p?.id, name, brand: marca, price, image: pendingImage, extra, porMl, recipe, prepararAlVender,`;
const objNew = objOld + `
        discount: {
          on: !!(m.root.querySelector('#f-disc-on')?.checked),
          type: m.root.querySelector('#f-disc-type')?.value || 'percent',
          value: Math.max(0, Number(m.root.querySelector('#f-disc-val')?.value) || 0),
        },`;
put(objOld, objNew, 'guardar descuento');

// 6) Tabla de productos: precio con descuento
const tdOld = `        <td class="mono t-strong">\${Number(p.price) > 0 ? money(p.price) : '<span class="badge grey">Pendiente</span>'}</td>`;
const tdNew = `        <td class="mono t-strong">\${Number(p.price) > 0
          ? (p.discount?.on && Number(p.discount.value) > 0
            ? '<div style="font-size:10.5px;color:var(--muted);text-decoration:line-through">' + money(p.price) + '</div>'
              + '<div>' + money(Math.max(0, p.discount.type === 'amount' ? p.price - p.discount.value : p.price - (p.price * p.discount.value) / 100)) + '</div>'
              + '<span class="badge" style="font-size:9px;background:#FEE2E2;color:#991B1B">' + (p.discount.type === 'amount' ? ('-' + '$' + p.discount.value) : (p.discount.value + '%')) + '</span>'
            : money(p.price))
          : '<span class="badge grey">Pendiente</span>'}</td>`;
put(tdOld, tdNew, 'precio con descuento en tabla');

fs.writeFileSync(cat, a, 'utf8');

// ---------- POS: precio con descuento en la tarjeta ----------
const pos = 'C:/ZOCOPOS 2.0/app/js/views-pos.js';
let b = fs.readFileSync(pos, 'utf8');
const posOld = `        <div class="sq-price">\${money(p.price)}</div>`;
const posNew = `        <div class="sq-price">\${p.discount?.on && Number(p.discount.value) > 0
          ? '<s style="opacity:.55;font-size:11px">' + money(p.price) + '</s> ' + money(Math.max(0, p.discount.type === 'amount' ? p.price - p.discount.value : p.price - (p.price * p.discount.value) / 100))
            + ' <span style="background:#DC2626;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:999px">' + (p.discount.type === 'amount' ? ('-' + '$' + p.discount.value) : (p.discount.value + '%')) + '</span>'
          : money(p.price)}</div>`;
must(b.includes(posOld), 'POS precio');
b = b.split(posOld).join(posNew);
fs.writeFileSync(pos, b, 'utf8');
console.log('ok: precio con descuento en POS');
console.log('lineas catalog:', a.split('\n').length);
