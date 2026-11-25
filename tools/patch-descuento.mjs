// Inserta el manejo del descuento del producto en views-catalog.js
import fs from 'node:fs';

const path = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let a = fs.readFileSync(path, 'utf8');

// 1) preview de foto al nuevo tamaño
a = a.replace(
  `m.root.querySelector('#f-img-prev').innerHTML = \`<img src="\${r.dataUrl}" style="width:96px;height:96px;object-fit:cover;`,
  `m.root.querySelector('#f-img-prev').innerHTML = \`<img src="\${r.dataUrl}" style="width:100%;height:100%;object-fit:cover;`,
);

const ancla = `m.root.querySelector('#f-img').onchange = async (e) => {`;
const bloque = `  // ===== Descuento del producto =====
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
    if (v <= 0) { discPrev.textContent = 'Escribe el descuento que quieres aplicar.'; return; }
    const final = discType.value === 'amount' ? base - v : base - (base * v) / 100;
    discPrev.innerHTML = 'Precio normal <s>' + money(base) + '</s> → se vende en <b style="color:var(--brand-700,#C2410C)">' + money(Math.max(0, final)) + '</b>';
  };
  if (discOn) {
    discOn.onchange = pintarDescuento;
    discType.onchange = pintarDescuento;
    discVal.oninput = pintarDescuento;
    m.root.querySelector('#f-price').oninput = pintarDescuento;
    pintarDescuento();
  }
  const quitarFoto = m.root.querySelector('#f-img-del');
  if (quitarFoto) quitarFoto.onclick = () => {
    pendingImage = '';
    m.root.querySelector('#f-img-prev').innerHTML = '<span style="font-size:30px;color:var(--muted)">📷</span>';
    quitarFoto.remove();
  };

`;

if (!a.includes('pintarDescuento') && a.includes(ancla)) {
  a = a.replace(ancla, bloque + ancla);
  console.log('handlers insertados');
} else {
  console.log('ya estaba o sin ancla');
}

// 2) guardar el descuento en el producto
const viejoObj = `        id: p?.id, name, brand: marca, price, image: pendingImage, extra, porMl, recipe, prepararAlVender,`;
const nuevoObj = `        id: p?.id, name, brand: marca, price, image: pendingImage, extra, porMl, recipe, prepararAlVender,
        discount: {
          on: !!(m.root.querySelector('#f-disc-on')?.checked),
          type: m.root.querySelector('#f-disc-type')?.value || 'percent',
          value: Math.max(0, Number(m.root.querySelector('#f-disc-val')?.value) || 0),
        },`;
if (a.includes(viejoObj) && !a.includes('discount: {')) {
  a = a.replace(viejoObj, nuevoObj);
  console.log('descuento se guarda');
} else {
  console.log('NO se pudo enganchar el guardado');
}

fs.writeFileSync(path, a, 'utf8');
