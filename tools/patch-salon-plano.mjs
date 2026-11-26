// Vista plana por default + botón reacomodar + versión visible (para diagnosticar caché).
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Config del salón: migración a vista plana una sola vez
const viejoCfg = `    if (typeof c.mode3d !== 'boolean') c.mode3d = true;`;
const nuevoCfg = `    if (typeof c.mode3d !== 'boolean') c.mode3d = true;
    // Migración: la vista plana se ve mejor; se aplica una sola vez.
    if (c.ver !== 2) { c.mode3d = false; c.ver = 2; }`;
must(a.includes(viejoCfg), 'config del salón');
a = a.replace(viejoCfg, nuevoCfg);

// 2) Botón reacomodar en la barra
const viejoTools = `      + (manager() ? '<button type="button" class="btn ghost sm" id="fd-reservas-todas">📅 Reservas</button>' : '')`;
const nuevoTools = `      + (manager() ? '<button type="button" class="btn ghost sm" id="fd-reservas-todas">📅 Reservas</button>' : '')
      + (manager() ? '<button type="button" class="btn ghost sm" id="fd-reacomodar" title="Acomodar las mesas en rejilla">↺ Reacomodar</button>' : '')`;
must(a.includes(viejoTools), 'barra de herramientas');
a = a.replace(viejoTools, nuevoTools);

const viejoBind = `    root.querySelector('#fd-reservas-todas')?.addEventListener('click', () => abrirReservas(null));`;
const nuevoBind = viejoBind + `
    root.querySelector('#fd-reacomodar')?.addEventListener('click', () => {
      const zona = salonCfg().zone;
      activeTables().filter(t => (t.zone || ZONAS_BASE[0]) === zona).forEach((t) => { delete t.x; delete t.y; });
      save();
      render();
      toast('Mesas acomodadas');
    });`;
must(a.includes(viejoBind), 'handler reservas');
a = a.replace(viejoBind, nuevoBind);

// 3) Versión visible en el salón (para saber si cargó la nueva)
const viejoBar = `      + '<div class="fd-salones">'`;
const nuevoBar = `      + '<div class="fd-salones" data-fd-ver="' + e(state.appVersion || '') + '">'`;
if (a.includes(viejoBar)) a = a.replace(viejoBar, nuevoBar);

fs.writeFileSync(ruta, a, 'utf8');
console.log('vista plana por default + reacomodar');
