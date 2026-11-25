// Agrega sillas alrededor de cada mesa y mejora el realismo del salón.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) Sillas calculadas alrededor de la mesa
const viejo = `  function mesaHTML(t, orden, totales) {
    const est = estadoMesa(t);
    const mins = est.order ? minutos(est.order.openedAt) : 0;
    const gente = est.order ? (est.order.people || 1) : t.seats;
    const mesa = est.order ? money(totales) : '';`;
const nuevo = `  function sillasHTML(n, ocupadas) {
    const total = Math.max(1, Math.min(12, Number(n) || 4));
    let html = '';
    for (let i = 0; i < total; i++) {
      const ang = (360 / total) * i - 90;
      const rad = (ang * Math.PI) / 180;
      const x = 50 + Math.cos(rad) * 62;
      const y = 50 + Math.sin(rad) * 62;
      html += '<span class="fd-silla' + (i < ocupadas ? ' on' : '') + '" style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%"></span>';
    }
    return html;
  }
  function mesaHTML(t, orden, totales) {
    const est = estadoMesa(t);
    const mins = est.order ? minutos(est.order.openedAt) : 0;
    const gente = est.order ? (est.order.people || 1) : 0;
    const mesa = est.order ? money(totales) : '';
    const sillas = sillasHTML(t.seats || 4, gente);`;
must(a.includes(viejo), 'cabecera de mesaHTML');
a = a.replace(viejo, nuevo);

// 2) Insertar las sillas dentro del botón de la mesa
const viejoBtn = `      + '<span class="fd-mesa-shadow" aria-hidden="true"></span>'
      + '</button>';`;
const nuevoBtn = `      + sillas
      + '<span class="fd-mesa-shadow" aria-hidden="true"></span>'
      + '</button>';`;
must(a.includes(viejoBtn), 'cierre del botón de mesa');
a = a.replace(viejoBtn, nuevoBtn);

fs.writeFileSync(ruta, a, 'utf8');
console.log('sillas agregadas a las mesas');
