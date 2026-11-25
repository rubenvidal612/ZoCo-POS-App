// Cambia el QR externo por el generador propio (offline) en la vista de lavandería.
import fs from 'node:fs';

const ruta = 'C:/ZOCOPOS 2.0/app/js/views-laundry.js';
let a = fs.readFileSync(ruta, 'utf8');
const must = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };

// 1) import
must(a.includes("import { el, esc, money, toast, modal, confirmDialog, readImageCompressed } from './ui.js';"), 'import ui');
a = a.replace(
  "import { el, esc, money, toast, modal, confirmDialog, readImageCompressed } from './ui.js';",
  "import { el, esc, money, toast, modal, confirmDialog, readImageCompressed } from './ui.js';\nimport { qrDataUrl } from './qr.js';",
);

// 2) bloque del QR: reemplaza la carga por imagen remota
const inicio = a.indexOf('    // --- QR (se guarda en la orden para reimprimir sin internet) ---');
const fin = a.indexOf("    m.root.querySelector('#ld-copy').onclick");
must(inicio > 0 && fin > inicio, 'bloque QR');

const nuevo = `    // --- QR generado localmente (funciona sin internet) ---
    const qrBox = m.root.querySelector('#ld-qr');
    let qrPng = o.qrData || '';
    try {
      qrPng = qrDataUrl(link, { size: 240, margin: 4, dark: '#0F172A', light: '#FFFFFF', ec: 'M' });
      o.qrData = qrPng;
      qrBox.innerHTML = \`<img src="\${qrPng}" alt="QR de seguimiento" width="150" height="150">\`;
    } catch (err) {
      qrBox.innerHTML = '<div class="hint">No se pudo dibujar el QR. Comparte el enlace de abajo.</div>';
    }

`;
a = a.slice(0, inicio) + nuevo + a.slice(fin);

// 3) el ticket usa el QR local
const viejoPrint = `      const fotos = (o.photos || []).map((f) => \`<img src="\${f.url}" style="width:100%;border-radius:6px;margin-top:6px">\`).join('');`;
const nuevoPrint = `      const fotos = (o.photos || []).map((f) => \`<img src="\${f.url}" style="width:100%;border-radius:6px;margin-top:6px">\`).join('');
      let qrTicket = o.qrData || '';
      try { qrTicket = qrDataUrl(link, { size: 300, margin: 3, ec: 'M' }); } catch {}`;
must(a.includes(viejoPrint), 'bloque de fotos del ticket');
a = a.replace(viejoPrint, nuevoPrint);

must(a.includes("o.qrData ? '<img src=\"' + o.qrData + '\" style=\"width:150px;height:150px\">' : ''"), 'qr en ticket');
a = a.replace(
  "o.qrData ? '<img src=\"' + o.qrData + '\" style=\"width:150px;height:150px\">' : ''",
  "qrTicket ? '<img src=\"' + qrTicket + '\" style=\"width:150px;height:150px\">' : ''",
);

fs.writeFileSync(ruta, a, 'utf8');
console.log('QR local integrado en la vista');
