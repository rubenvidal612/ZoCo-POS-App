// Auto-acomodo: calcula columnas/filas y encoge las mesas para que quepan todas.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Rejilla inteligente: cuántas columnas/filas y tamaño de mesa
const viejo = `  function asegurarPosiciones(lista) {
    let cambiado = false;
    lista.forEach((t, i) => {
      if (typeof t.x !== 'number' || typeof t.y !== 'number') {
        const cols = 4;
        const col = i % cols;
        const fila = Math.floor(i / cols);
        // Rejilla centrada y con aire: 4 por fila, sin pegarse a las orillas.
        t.x = 20 + col * 20 + (fila % 2 ? 8 : 0);
        t.y = 28 + fila * 30;
        cambiado = true;
      }
      if (!t.shape) { t.shape = 'square'; cambiado = true; }
      if (!t.seats) { t.seats = 4; cambiado = true; }
      if (!t.zone) { t.zone = ZONAS_BASE[0]; cambiado = true; }
    });
    if (cambiado) save();
    return cambiado;
  }`;

const nuevo = `  /** Rejilla que cabe: elige columnas según el ancho del piso y encoge las mesas. */
  function rejillaPara(n) {
    const total = Math.max(1, n);
    // El piso es ancho (16:7.6), así que conviene más columnas que filas.
    let cols = Math.max(1, Math.ceil(Math.sqrt(total * 1.9)));
    let filas = Math.ceil(total / cols);
    // Si quedan demasiadas filas, abre una columna más.
    while (filas > 5 && cols < total) {
      cols += 1;
      filas = Math.ceil(total / cols);
    }
    // Tamaño de mesa: se encoge cuando hay muchas (112 px es el máximo).
    const anchoUtil = 980;
    const tam = Math.round(Math.min(112, Math.max(46, (anchoUtil / cols) * 0.66)));
    return { cols, filas, tam };
  }
  function posicionesRejilla(lista) {
    const { cols, filas } = rejillaPara(lista.length);
    lista.forEach((t, i) => {
      const col = i % cols;
      const fila = Math.floor(i / cols);
      t.x = Math.round(((col + 0.5) / cols) * 1000) / 10;
      t.y = Math.round(((fila + 0.5) / filas) * 1000) / 10;
    });
    return { cols, filas };
  }
  function asegurarPosiciones(lista) {
    let cambiado = false;
    const faltan = lista.filter(t => typeof t.x !== 'number' || typeof t.y !== 'number');
    if (faltan.length) {
      // Las que ya tienen posición se respetan; las nuevas van a la rejilla libre.
      posicionesRejilla(lista);
      cambiado = true;
    }
    lista.forEach((t) => {
      if (!t.shape) { t.shape = 'square'; cambiado = true; }
      if (!t.seats) { t.seats = 4; cambiado = true; }
      if (!t.zone) { t.zone = ZONAS_BASE[0]; cambiado = true; }
    });
    if (cambiado) save();
    return cambiado;
  }`;
must(a.includes(viejo), 'asegurarPosiciones');
a = a.replace(viejo, nuevo);

// 2) El salón recibe el tamaño de mesa calculado
const viejoSalon = `      + '<div class="fd-salon' + (cfg.mode3d ? ' is3d' : '') + (cfg.editing ? ' editing' : '') + '" id="fd-salon">'`;
const nuevoSalon = `      + '<div class="fd-salon' + (cfg.mode3d ? ' is3d' : '') + (cfg.editing ? ' editing' : '') + '" id="fd-salon" style="--mesa:' + rejillaPara(lista.length).tam + 'px">'`;
must(a.includes(viejoSalon), 'div del salón');
a = a.replace(viejoSalon, nuevoSalon);

// 3) Reacomodar usa la rejilla inteligente
const viejoReac = `      activeTables().filter(t => (t.zone || ZONAS_BASE[0]) === zona).forEach((t) => { delete t.x; delete t.y; });
      save();
      render();
      toast('Mesas acomodadas');`;
const nuevoReac = `      const enZona = activeTables().filter(t => (t.zone || ZONAS_BASE[0]) === zona);
      const { cols, filas } = posicionesRejilla(enZona);
      save();
      render();
      toast(enZona.length + ' mesas en ' + cols + ' × ' + filas);`;
must(a.includes(viejoReac), 'handler reacomodar');
a = a.replace(viejoReac, nuevoReac);

fs.writeFileSync(ruta, a, 'utf8');
console.log('auto-acomodo agregado');
