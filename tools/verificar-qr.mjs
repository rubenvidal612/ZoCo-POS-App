// Verifica el generador QR propio contra jsQR (decodificador independiente).
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

const { qrMatrix } = await import('file:///C:/ZOCOPOS%202.0/app/js/qr.js');

const pruebas = [
  'https://zoco-pos.vercel.app/orden?c=co-7782b4b1&f=LAV-0001&k=4821',
  'https://zoco-pos.vercel.app/orden?c=co-7782b4b1&f=LAV-9999&k=1234',
  'Hola',
  'LAV-0001',
  'https://zoco-pos.vercel.app/orden?c=empresa-con-nombre-largo&f=LAV-0042&k=9876&sucursal=centro',
  'Acentuación: José Ramírez — tintorería',
];

function aPng(modulos, margen = 4, escala = 8) {
  const n = modulos.length;
  const total = n + margen * 2;
  const px = total * escala;
  const png = new PNG({ width: px, height: px });
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const r = Math.floor(y / escala) - margen;
      const c = Math.floor(x / escala) - margen;
      const oscuro = r >= 0 && c >= 0 && r < n && c < n && modulos[r][c];
      const v = oscuro ? 0 : 255;
      const i = (y * px + x) * 4;
      png.data[i] = v;
      png.data[i + 1] = v;
      png.data[i + 2] = v;
      png.data[i + 3] = 255;
    }
  }
  return { png, px };
}

let ok = 0;
let fallos = 0;

for (const [i, texto] of pruebas.entries()) {
  for (const ec of ['M', 'L']) {
    let r;
    try {
      r = qrMatrix(texto, { ec });
    } catch (e) {
      console.log(`✗ [${i}] ec=${ec} error: ${e.message}`);
      fallos++;
      continue;
    }
    const { png, px } = aPng(r.modules);
    const buf = PNG.sync.write(png);
    const leido = jsQR(new Uint8ClampedArray(png.data), px, px);
    const coincide = leido && leido.data === texto;
    if (coincide) {
      ok++;
      console.log(`✓ [${i}] v${r.version}/${r.ec}/mask${r.mask} ${px}px -> "${texto.slice(0, 46)}"`);
    } else {
      fallos++;
      console.log(`✗ [${i}] ec=${ec} v${r.version} mask${r.mask} -> decodificado: ${leido ? JSON.stringify(leido.data) : 'NULL'}`);
    }
    fs.writeFileSync(path.join(process.env.TEMP, `qr-${i}-${r.ec}.png`), buf);
  }
}

// Prueba de tamaño máximo soportado
try {
  const largo = 'https://zoco-pos.vercel.app/orden?c=' + 'x'.repeat(150) + '&f=LAV-0001';
  const r = qrMatrix(largo);
  console.log(`info: texto largo (${largo.length} bytes) -> v${r.version}/${r.ec}`);
} catch (e) {
  console.log('info: texto largo ->', e.message);
}

console.log(`\nRESULTADO: ${ok} correctos · ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
