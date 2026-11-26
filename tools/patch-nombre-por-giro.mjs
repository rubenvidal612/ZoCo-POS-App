// Nombre del negocio por giro (Ramber Zapatos / Aguas frescas Ramber).
import fs from 'node:fs';

const enc = 'utf8';
const cat = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let a = fs.readFileSync(cat, enc);
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Campo nuevo junto al nombre comercial
const viejoField = '<div class="field"><label>Nombre comercial</label><input id="c-name" value="${esc(state.company.name)}"></div>';
const nuevoField = [
  viejoField,
  '<div class="field">',
  '  <label>Nombre en este giro <span style="font-weight:400;color:var(--muted)">(opcional)</span></label>',
  '  <input id="c-name-mode" value="${esc((state.company.nameByMode || {})[state.company.mode] || "")}" placeholder="${esc(state.company.name)} · ${esc((MODES[state.company.mode]?.label || "este giro"))}">',
  '  <div class="hint">Sirve para diferenciar tus negocios: por ejemplo <b>Ramber Zapatos</b> o <b>Aguas frescas Ramber</b>. Aparece en el ticket y en el catálogo de este giro.</div>',
  '</div>',
].join('\n');
must(a.includes(viejoField), 'campo de nombre comercial');
a = a.replace(viejoField, nuevoField);

// 2) Guardar el nombre del giro (la línea original lleva 4 espacios de sangría)
const viejoSave = "    state.company.name = $('#c-name', root).value.trim() || 'ZoCo';";
const nuevoSave = [
  viejoSave,
  '    {',
  "      const porGiro = $('#c-name-mode', root);",
  '      state.company.nameByMode = state.company.nameByMode || {};',
  '      const valor = porGiro ? String(porGiro.value || "").trim() : "";',
  '      if (valor) state.company.nameByMode[state.company.mode] = valor.slice(0, 60);',
  '      else delete state.company.nameByMode[state.company.mode];',
  '    }',
].join('\n');
must(a.includes(viejoSave), 'guardado del nombre comercial');
a = a.replace(viejoSave, nuevoSave);

fs.writeFileSync(cat, a, enc);
console.log('campo de nombre por giro agregado');

// 3) Store: helper con el nombre efectivo
const store = 'C:/ZOCOPOS 2.0/app/js/store.js';
let s = fs.readFileSync(store, enc);
const ancla = '/* ================= Sucursales por giro =================';
const helper = [
  '/** Nombre del negocio en el giro actual (cae al nombre comercial). */',
  'export function businessName() {',
  '  const c = state.company || {};',
  '  const porGiro = (c.nameByMode || {})[c.mode];',
  '  return String(porGiro || c.name || "ZoCo");',
  '}',
  '',
].join('\n');
if (!s.includes('export function businessName')) {
  s = s.replace(ancla, helper + ancla);
  fs.writeFileSync(store, s, enc);
  console.log('helper businessName() en store');
} else {
  console.log('businessName ya existia');
}
