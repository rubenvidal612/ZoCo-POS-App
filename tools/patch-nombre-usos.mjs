// Usa el nombre del giro en ticket, catálogo público y QR.
import fs from 'node:fs';

const leer = (p) => fs.readFileSync(p, 'utf8');
const escribir = (p, t) => fs.writeFileSync(p, t, 'utf8');
const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exitCode = 1; return false; } return true; };

// 1) printer.js
{
  const p = 'C:/ZOCOPOS 2.0/app/js/printer.js';
  let a = leer(p);
  const viejo = "center(state.company.name || '');";
  const nuevo = "center((state.company?.nameByMode || {})[state.company?.mode] || state.company?.name || '');";
  if (ok(a.includes(viejo), 'printer: nombre')) { escribir(p, a.replace(viejo, nuevo)); console.log('printer.js listo'); }
}

// 2) api/catalog.mjs
{
  const p = 'C:/ZOCOPOS 2.0/api/catalog.mjs';
  let a = leer(p);
  const viejo = "name: String(data.company?.name || 'ZoCo').slice(0, 80),";
  const nuevo = "name: String((data.company?.nameByMode || {})[data.company?.mode] || data.company?.name || 'ZoCo').slice(0, 80),";
  if (ok(a.includes(viejo), 'catalog: nombre')) { escribir(p, a.replace(viejo, nuevo)); console.log('api/catalog.mjs listo'); }
}

// 3) views-food-service.js (QR impreso)
{
  const p = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
  let a = leer(p);
  const viejo = "esc(state.company?.name || 'ZoCo')";
  const nuevo = "esc((state.company?.nameByMode || {})[state.company?.mode] || state.company?.name || 'ZoCo')";
  if (ok(a.includes(viejo), 'food: nombre del QR')) { escribir(p, a.replace(viejo, nuevo)); console.log('views-food-service.js listo'); }
}
