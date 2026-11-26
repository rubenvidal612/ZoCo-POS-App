// Cara de mesa más limpia: sin línea que se corte en 3D.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-food-service.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

const viejo = `      + '<span class="fd-mesa-top">'
      + '<b class="fd-mesa-n">' + e(String(t.name).replace(/^Mesa\\s*/i, '')) + '</b>'
      + (est.order
        ? '<small class="fd-mesa-w">' + e(est.order.waiterName || '') + '</small>'
          + '<small class="fd-mesa-meta">⏱ ' + mins + "' · 👥 " + gente + '</small>'
          + '<small class="fd-mesa-total">' + mesa + '</small>'
        : (est.reserva
          ? '<small class="fd-mesa-w">' + e(est.reserva.name || '') + '</small>'
            + '<small class="fd-mesa-meta">📅 ' + e(est.reserva.time) + ' · 👥 ' + (est.reserva.people || t.seats) + '</small>'
            + '<small class="fd-mesa-libre">Reservada</small>'
          : '<small class="fd-mesa-meta">👥 ' + (t.seats || 4) + ' lugares</small>'
            + '<small class="fd-mesa-libre">Libre</small>'))
      + '</span>'`;
const nuevo = `      + '<span class="fd-mesa-top">'
      + '<b class="fd-mesa-n">' + e(String(t.name).replace(/^Mesa\\s*/i, '')) + '</b>'
      + (est.order
        ? '<small class="fd-mesa-w">' + e(est.order.waiterName || '') + '</small>'
          + '<small class="fd-mesa-total">' + mins + "' · " + mesa + '</small>'
        : (est.reserva
          ? '<small class="fd-mesa-w">' + e((est.reserva.name || '').split(' ')[0]) + '</small>'
            + '<small class="fd-mesa-total">📅 ' + e(est.reserva.time) + ' · ' + (est.reserva.people || t.seats) + '</small>'
          : '<small class="fd-mesa-meta">' + (t.seats || 4) + ' lugares</small>'
            + '<small class="fd-mesa-total fd-vacio-c">Libre</small>'))
      + '</span>'`;
must(a.includes(viejo), 'cara de la mesa');
a = a.replace(viejo, nuevo);
fs.writeFileSync(ruta, a, 'utf8');
console.log('cara de mesa simplificada');
