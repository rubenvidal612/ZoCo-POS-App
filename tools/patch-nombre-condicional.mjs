// El campo "Nombre en este giro" solo aparece si el negocio tiene más de un giro.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

const bloque = [
  '<div class="field">',
  '  <label>Nombre en este giro <span style="font-weight:400;color:var(--muted)">(opcional)</span></label>',
  '  <input id="c-name-mode" value="${esc((state.company.nameByMode || {})[state.company.mode] || "")}" placeholder="${esc(state.company.name)} · ${esc((MODES[state.company.mode]?.label || "este giro"))}">',
  '  <div class="hint">Sirve para diferenciar tus negocios: por ejemplo <b>Ramber Zapatos</b> o <b>Aguas frescas Ramber</b>. Aparece en el ticket y en el catálogo de este giro.</div>',
  '</div>',
].join('\n');

const envuelto = [
  '${((Object.keys(state.branchesByMode || {}).length > 1) || (Object.keys(state.company.nameByMode || {}).length > 0)) ? `',
  bloque,
  '` : ""}',
].join('\n');

must(a.includes(bloque), 'bloque del nombre por giro');
a = a.replace(bloque, envuelto);

// El guardado debe tolerar que el campo no exista (ya lo hace: porGiro puede ser null)
fs.writeFileSync(ruta, a, 'utf8');
console.log('campo de nombre por giro ahora es condicional');
