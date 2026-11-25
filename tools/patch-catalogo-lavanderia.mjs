// Conecta el catálogo base de lavandería: precios de referencia y unidad de venta.
import fs from 'node:fs';

// ---------- 1) store.js: addBaseCatalog respeta precio, costo y unidad ----------
const store = 'C:/ZOCOPOS 2.0/app/js/store.js';
let s = fs.readFileSync(store, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

const viejoCampos = `      price: 0,
      cost: 0,
      section: it.section,`;
const nuevoCampos = `      price: Number(it.price) || 0,
      cost: Number(it.cost) || 0,
      sellBy: it.sellBy || 'pza',
      section: it.section,`;
must(s.includes(viejoCampos), 'campos price/cost en addBaseCatalog');
s = s.replace(viejoCampos, nuevoCampos);

// ---------- 2) ejemplos del giro (botón "Cargar ejemplos") ----------
const anclaDemo = `  restaurante: [`;
const demoLav = `  lavanderia: [
    ['Lavado por kilo', 'lavado', 24, 9],
    ['Camisa lavado y planchado', 'lavado', 48, 18],
    ['Traje tintorería (2 pzas)', 'tintoreria', 180, 65],
    ['Tenis lavado profundo', 'tenis', 160, 60],
  ],
`;
if (s.includes(anclaDemo) && !s.includes("lavanderia: [\n    ['Lavado por kilo'")) {
  s = s.split(anclaDemo).join(demoLav + anclaDemo);
  console.log('ejemplos de lavandería agregados');
}
fs.writeFileSync(store, s, 'utf8');

// ---------- 3) views-catalog.js: botón y carga del catálogo ----------
const cat = 'C:/ZOCOPOS 2.0/app/js/views-catalog.js';
let c = fs.readFileSync(cat, 'utf8');

must(c.includes("${['abarrotes', 'farmacia', 'papeleria'].includes(state.company.mode)"), 'botón catálogo base');
c = c.replace(
  "${['abarrotes', 'farmacia', 'papeleria'].includes(state.company.mode)",
  "${['abarrotes', 'farmacia', 'papeleria', 'lavanderia'].includes(state.company.mode)",
);

must(c.includes("if (giro === 'farmacia') lista = (await import('./catalog-farmacia.js')).CATALOGO_FARMACIA || [];"), 'rama farmacia');
c = c.replace(
  `        if (giro === 'farmacia') lista = (await import('./catalog-farmacia.js')).CATALOGO_FARMACIA || [];`,
  `        if (giro === 'lavanderia') lista = (await import('./catalog-lavanderia.js')).CATALOGO_LAVANDERIA || [];
        else if (giro === 'farmacia') lista = (await import('./catalog-farmacia.js')).CATALOGO_FARMACIA || [];`,
);

// Título del diálogo
c = c.replace(
  `title: 'Catálogo base de ' + (state.company.mode === 'farmacia' ? 'farmacia' : state.company.mode === 'papeleria' ? 'pape`,
  `title: 'Catálogo base de ' + (state.company.mode === 'lavanderia' ? 'lavandería' : state.company.mode === 'farmacia' ? 'farmacia' : state.company.mode === 'papeleria' ? 'pape`,
);

fs.writeFileSync(cat, c, 'utf8');
console.log('botón y carga del catálogo de lavandería conectados');
