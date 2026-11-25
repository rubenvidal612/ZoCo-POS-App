// Compara mi matriz QR contra una referencia externa módulo por módulo.
import { PNG } from 'pngjs';

const { qrMatrix } = await import('file:///C:/ZOCOPOS%202.0/app/js/qr.js');

const texto = 'HOLA'; // corto: versión 1, fácil de comparar

// 1) referencia externa
const url = 'https://api.qrserver.com/v1/create-qr-code/?size=290x290&margin=0&ecc=M&data=' + encodeURIComponent(texto);
const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
const png = PNG.sync.read(buf);

// 2) a matriz de módulos: detectar tamaño (v1 = 21)
const px = png.width;
const escala = px / 21;
console.log('imagen', px, 'px · escala', escala);
const ref = [];
for (let r = 0; r < 21; r++) {
  const fila = [];
  for (let c = 0; c < 21; c++) {
    const x = Math.floor((c + 0.5) * escala);
    const y = Math.floor((r + 0.5) * escala);
    const i = (y * px + x) * 4;
    fila.push(png.data[i] < 128);
  }
  ref.push(fila);
}

// 3) leer formato de la referencia -> nivel EC y máscara
// bits de formato en (8,0..5),(8,7),(8,8),(7,8),(5..0,8)
function leerFormato(m) {
  const bits = [];
  for (let i = 0; i <= 5; i++) bits.push(m[8][i]);
  bits.push(m[8][7]);
  bits.push(m[8][8]);
  bits.push(m[7][8]);
  for (let i = 9; i <= 14; i++) bits.push(m[14 - i][8]);
  let v = 0;
  for (const b of bits) v = (v << 1) | (b ? 1 : 0);
  v ^= 0x5412;
  const data = v >>> 10;
  const ecBits = data >>> 3;
  const mask = data & 7;
  const ec = ecBits === 1 ? 'L' : ecBits === 0 ? 'M' : ecBits === 3 ? 'Q' : 'H';
  return { ec, mask, raw: v };
}
const fmt = leerFormato(ref);
console.log('referencia:', fmt);

// 4) mi matriz con la misma máscara
const mio = qrMatrix(texto, { ec: fmt.ec, mask: fmt.mask });
console.log('mi version', mio.version, 'ec', mio.ec, 'mask', mio.mask);

// 5) diferencias
let dif = 0;
const zonas = new Map();
for (let r = 0; r < 21; r++) {
  for (let c = 0; c < 21; c++) {
    if (ref[r][c] !== mio.modules[r][c]) {
      dif++;
      const zona = r < 9 && c < 9 ? 'sup-izq' : r < 9 && c > 12 ? 'sup-der' : r > 12 && c < 9 ? 'inf-izq' : 'cuerpo';
      zonas.set(zona, (zonas.get(zona) || 0) + 1);
    }
  }
}
console.log('módulos distintos:', dif, 'de', 21 * 21);
console.log('por zona:', [...zonas.entries()]);

// 6) imprimir primeras diferencias
let n = 0;
for (let r = 0; r < 21 && n < 12; r++) {
  for (let c = 0; c < 21 && n < 12; c++) {
    if (ref[r][c] !== mio.modules[r][c]) {
      console.log(`  dif (${r},${c}) ref=${ref[r][c] ? '■' : '·'} mio=${mio.modules[r][c] ? '■' : '·'}`);
      n++;
    }
  }
}
