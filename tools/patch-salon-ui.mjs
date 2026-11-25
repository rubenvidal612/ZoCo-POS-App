// Deja el salón como protagonista: configuración colapsada y mover mesas en la barra.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Configuración dentro de <details> y sin el botón de mover (se mueve a la barra)
const cfgViejo = `      (manager() ? '<div class="fd-box fd-config">'
        + '<div class="fd-cfg-inline"><label>Mesas del local <input id="fd-table-count" type="number" min="1" max="99" value="' + Math.max(todas.length, 8) + '"></label>'
        + '<button class="btn" id="fd-create-tables">Aplicar</button>'
        + '<button class="btn ghost sm" id="fd-salon-edit" aria-pressed="' + cfg.editing + '">' + (cfg.editing ? '✓ Terminar de mover' : '✥ Mover mesas') + '</button>'
        + '<select id="fd-salon-zone" aria-label="Salón">' + zonas().map(z => '<option value="' + e(z) + '"' + (z === zonaActual ? ' selected' : '') + '>' + e(z) + '</option>').join('') + '</select>'
        + '<button class="btn ghost sm" id="fd-zone-new">+ Salón</button>'
        + '</div></div>' : '')`;
const cfgNuevo = `      (manager() ? '<details class="fd-cfg"><summary>⚙ Configurar mesas y salones</summary>'
        + '<div class="fd-cfg-inline"><label>Mesas del local <input id="fd-table-count" type="number" min="1" max="99" value="' + Math.max(todas.length, 8) + '"></label>'
        + '<button class="btn sm" id="fd-create-tables">Aplicar</button>'
        + '<select id="fd-salon-zone" aria-label="Salón">' + zonas().map(z => '<option value="' + e(z) + '"' + (z === zonaActual ? ' selected' : '') + '>' + e(z) + '</option>').join('') + '</select>'
        + '<button class="btn ghost sm" id="fd-zone-new">+ Salón nuevo</button>'
        + '</div></details>' : '')`;
must(a.includes(cfgViejo), 'bloque de configuración');
a = a.replace(cfgViejo, cfgNuevo);

// 2) Botón "Mover mesas" en la barra del salón (junto a zoom)
const toolsViejo = `      + '<button type="button" class="btn ghost sm" id="fd-zoom-in" aria-label="Acercar">+</button>'
      + '</div></div>'`;
const toolsNuevo = `      + '<button type="button" class="btn ghost sm" id="fd-zoom-in" aria-label="Acercar">+</button>'
      + (manager() ? '<button type="button" class="btn ghost sm' + (cfg.editing ? ' on' : '') + '" id="fd-salon-edit" aria-pressed="' + cfg.editing + '">' + (cfg.editing ? '✓ Listo' : '✥ Mover mesas') + '</button>' : '')
      + '</div></div>'`;
must(a.includes(toolsViejo), 'barra de herramientas');
a = a.replace(toolsViejo, toolsNuevo);

fs.writeFileSync(ruta, a, 'utf8');
console.log('configuración colapsada y botón de mover reubicado');
