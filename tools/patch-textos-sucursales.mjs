// Textos claros: cada giro es un "negocio" con sus propias sucursales.
import fs from 'node:fs';

const cat = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let a = fs.readFileSync(cat, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

const viejoDesc = '            Una <b>sucursal</b> es una tienda del mismo negocio: comparte catálogo y clientes,\n            pero cada una lleva <b>su propio inventario</b> y sus ventas.';
const nuevaDesc = [
  '            Una <b>sucursal</b> es una tienda de <b>este negocio</b>: comparte catálogo y clientes,',
  '            pero cada una lleva <b>su propio inventario</b> y sus ventas.',
  '            <div class="hint" style="margin-top:6px">',
  '              <b>${esc(state.company?.name || "Tu negocio")} · ${esc(MODES[state.company?.mode]?.label || "giro actual")}</b>',
  '              tiene sus propias sucursales. Si agregas otro giro (por ejemplo aguas frescas),',
  '              ese giro maneja su lista aparte.',
  '            </div>',
].join('\n');
must(a.includes(viejoDesc), 'descripcion de sucursales');
a = a.replace(viejoDesc, nuevaDesc);

const viejoAviso = '          <div class="hint" style="margin-top:8px"><b>Cada giro tiene sus propias sucursales.</b>\n            Las de este giro se manejan por separado de las de otros giros.</div>';
const nuevoAviso = [
  '          <div class="hint" style="margin-top:8px"><b>Cada giro es un negocio aparte.</b>',
  '            En este giro, ${esc(state.company?.name || "tu negocio")} tendrá sus propias sucursales,',
  '            su catálogo y sus ventas, por separado de tus otros giros.</div>',
].join('\n');
if (a.includes(viejoAviso)) { a = a.replace(viejoAviso, nuevoAviso); console.log('aviso del modal actualizado'); }
else { console.log('aviso del modal: sin cambios (no encontrado)'); }

fs.writeFileSync(cat, a, 'utf8');
console.log('textos de sucursales actualizados');
