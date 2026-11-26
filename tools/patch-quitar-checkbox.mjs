// Quita la casilla de renombrar (ya no aplica) y explica que cada giro tiene sus sucursales.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let a = fs.readFileSync(ruta, 'utf8');

const lineas = [
  '          ${(state.branches || []).some(b => !/^Sucursal/i.test(String(b.name || ""))) ? `<label style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:12.5px;font-weight:700">',
  '            <input type="checkbox" id="renombrar-sucursales" checked style="margin-top:2px">',
  '            <span>Renombrar sucursales a nombres neutros<br><span class="hint" style="font-weight:400">',
  '              Hoy se llaman: ${(state.branches || []).map(b => esc(b.name)).join(", ")}. Quedarán como Sucursal Principal, Sucursal 2…</span></span>',
  '          </label>` : ""}',
];
const viejo = lineas.join('\n');
const nuevo = [
  '          <div class="hint" style="margin-top:8px"><b>Cada giro tiene sus propias sucursales.</b>',
  '            Las de este giro se manejan por separado de las de otros giros.</div>',
].join('\n');

if (!a.includes(viejo)) { console.error('FALLO: bloque de la casilla'); process.exit(1); }
a = a.replace(viejo, nuevo);
fs.writeFileSync(ruta, a, 'utf8');
console.log('casilla de renombrar reemplazada por aviso');
