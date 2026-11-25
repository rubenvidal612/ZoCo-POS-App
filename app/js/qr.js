// Generador de códigos QR propio, sin dependencias ni internet.
// Soporta modo byte (UTF-8), niveles de corrección L y M, versiones 1 a 10.
// Uso:
//   import { qrMatrix, qrSvg } from './qr.js';
//   document.body.innerHTML = qrSvg('https://...', { size: 200 });

const EC_TABLE = {
  L: {
    1: [7, 1, 19, 0, 0], 2: [10, 1, 34, 0, 0], 3: [15, 1, 55, 0, 0], 4: [20, 1, 80, 0, 0],
    5: [26, 1, 108, 0, 0], 6: [18, 2, 68, 0, 0], 7: [20, 2, 78, 0, 0], 8: [24, 2, 97, 0, 0],
    9: [30, 2, 116, 0, 0], 10: [18, 2, 68, 2, 69],
  },
  M: {
    1: [10, 1, 16, 0, 0], 2: [16, 1, 28, 0, 0], 3: [26, 1, 44, 0, 0], 4: [18, 2, 32, 0, 0],
    5: [24, 2, 43, 0, 0], 6: [16, 4, 27, 0, 0], 7: [18, 4, 31, 0, 0], 8: [22, 2, 38, 2, 39],
    9: [22, 3, 36, 2, 37], 10: [26, 4, 43, 1, 44],
  },
};

const TOTAL_CODEWORDS = { 1: 26, 2: 44, 3: 70, 4: 100, 5: 134, 6: 172, 7: 196, 8: 242, 9: 292, 10: 346 };

const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

const EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };

// ---------- utilidades de bits ----------
class BitBuffer {
  constructor() { this.bits = []; }
  put(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() { return this.bits.length; }
  toCodewords() {
    const out = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) byte = (byte << 1) | (this.bits[i + j] || 0);
      out.push(byte);
    }
    return out;
  }
}

const utf8 = (text) => Array.from(new TextEncoder().encode(String(text)));

// ---------- Reed-Solomon sobre GF(256) ----------
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data, degree) {
  const gen = rsGenerator(degree);
  const res = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < degree; i++) res[i] ^= gfMul(gen[i + 1], factor);
  }
  return res;
}

// ---------- construcción de datos ----------
function buildCodewords(bytes, version, ec) {
  const [ecPerBlock, blocks1, data1, blocks2, data2] = EC_TABLE[ec][version];
  const totalData = blocks1 * data1 + blocks2 * data2;
  const buffer = new BitBuffer();
  buffer.put(4, 4); // modo byte
  buffer.put(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) buffer.put(b, 8);

  const capacityBits = totalData * 8;
  if (buffer.length > capacityBits) throw new Error('El texto es demasiado largo para el QR');

  // terminador + relleno hasta byte
  const remaining = capacityBits - buffer.length;
  buffer.put(0, Math.min(4, remaining));
  while (buffer.length % 8 !== 0) buffer.bits.push(0);

  const dataCodewords = buffer.toCodewords();
  const padBytes = [0xec, 0x11];
  let p = 0;
  while (dataCodewords.length < totalData) dataCodewords.push(padBytes[p++ % 2]);

  // bloques + ECC
  const blocks = [];
  let offset = 0;
  for (let i = 0; i < blocks1; i++) {
    const d = dataCodewords.slice(offset, offset + data1);
    offset += data1;
    blocks.push({ data: d, ec: rsRemainder(d, ecPerBlock) });
  }
  for (let i = 0; i < blocks2; i++) {
    const d = dataCodewords.slice(offset, offset + data2);
    offset += data2;
    blocks.push({ data: d, ec: rsRemainder(d, ecPerBlock) });
  }

  // intercalado
  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const b of blocks) out.push(b.ec[i]);
  }
  return out;
}

function pickVersion(byteLength, ec) {
  for (let v = 1; v <= 10; v++) {
    const [ecPerBlock, b1, d1, b2, d2] = EC_TABLE[ec][v];
    const totalData = b1 * d1 + b2 * d2;
    const needed = 4 + (v <= 9 ? 8 : 16) + byteLength * 8;
    if (needed <= totalData * 8) return v;
  }
  return 0;
}

// ---------- matriz ----------
function buildMatrix(version, codewords, ec) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const set = (r, c, dark) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    modules[r][c] = dark;
    reserved[r][c] = true;
  };

  // patrones localizadores + separadores
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const dark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        set(rr, cc, dark);
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  // temporización
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  // alineación
  const pos = ALIGN[version];
  for (const r of pos) {
    for (const c of pos) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          set(r + dr, c + dc, dark);
        }
      }
    }
  }

  // módulo oscuro
  set(size - 8, 8, true);

  // reservar formato
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) set(8, i, false);
    if (!reserved[i][8]) set(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    set(8, size - 1 - i, false);
    set(size - 1 - i, 8, false);
  }

  // reservar información de versión
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        set(size - 11 + j, i, false);
        set(i, size - 11 + j, false);
      }
    }
  }

  // datos en zigzag
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // saltar columna de temporización
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (reserved[row][c]) continue;
        let dark = false;
        if (bitIndex < totalBits) {
          const byte = codewords[bitIndex >> 3];
          dark = ((byte >>> (7 - (bitIndex & 7))) & 1) === 1;
          bitIndex++;
        }
        modules[row][c] = dark;
      }
    }
    upward = !upward;
  }

  return { size, modules, reserved };
}

// ---------- máscaras ----------
const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function penalty(modules) {
  const size = modules.length;
  let score = 0;

  // regla 1 y 3 por filas/columnas
  for (let i = 0; i < size; i++) {
    let runColor = null;
    let runLen = 0;
    for (let j = 0; j < size; j++) {
      const v = modules[i][j];
      if (v === runColor) runLen++;
      else {
        if (runLen >= 5) score += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5);
  }
  for (let j = 0; j < size; j++) {
    let runColor = null;
    let runLen = 0;
    for (let i = 0; i < size; i++) {
      const v = modules[i][j];
      if (v === runColor) runLen++;
      else {
        if (runLen >= 5) score += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5);
  }

  // regla 2: bloques 2x2
  for (let i = 0; i < size - 1; i++) {
    for (let j = 0; j < size - 1; j++) {
      const v = modules[i][j];
      if (v === modules[i][j + 1] && v === modules[i + 1][j] && v === modules[i + 1][j + 1]) score += 3;
    }
  }

  // regla 3: patrón 1011101 con 4 claros a un lado
  const pattern = [true, false, true, true, true, false, true];
  const matchAt = (get, start, len) => {
    for (let k = 0; k < 7; k++) if (get(start + k) !== pattern[k]) return false;
    return true;
  };
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= size - 7; j++) {
      const row = (k) => modules[i][k];
      if (matchAt(row, j, size)) {
        const before = j >= 4 && [1, 2, 3, 4].every((d) => modules[i][j - d] === false);
        const after = j + 11 <= size && [7, 8, 9, 10].every((d) => modules[i][j + d] === false);
        if (before || after) score += 40;
      }
      const col = (k) => modules[k][i];
      if (matchAt(col, j, size)) {
        const before = j >= 4 && [1, 2, 3, 4].every((d) => modules[j - d][i] === false);
        const after = j + 11 <= size && [7, 8, 9, 10].every((d) => modules[j + d][i] === false);
        if (before || after) score += 40;
      }
    }
  }

  // regla 4: proporción de oscuros
  let dark = 0;
  for (const row of modules) for (const v of row) if (v) dark++;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

function bchFormat(ec, mask) {
  const data = (EC_BITS[ec] << 3) | mask;
  let value = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((value >>> (i + 10)) & 1) value ^= 0x537 << i;
  }
  return ((data << 10) | value) ^ 0x5412;
}

function bchVersion(version) {
  let value = version << 12;
  for (let i = 5; i >= 0; i--) {
    if ((value >>> (i + 12)) & 1) value ^= 0x1f25 << i;
  }
  return (version << 12) | value;
}

function drawFormat(modules, ec, mask) {
  const size = modules.length;
  const bits = bchFormat(ec, mask);
  const bit = (i) => ((bits >>> i) & 1) === 1;

  // Colocación oficial: 15 bits, del menos significativo al más significativo.
  for (let i = 0; i < 15; i++) {
    const mod = bit(i);
    // copia vertical (columna 8)
    if (i < 6) modules[i][8] = mod;
    else if (i < 8) modules[i + 1][8] = mod;
    else modules[size - 15 + i][8] = mod;
    // copia horizontal (fila 8)
    if (i < 8) modules[8][size - i - 1] = mod;
    else if (i === 8) modules[8][7] = mod;
    else modules[8][15 - i - 1] = mod;
  }
  modules[size - 8][8] = true; // módulo oscuro
}

function drawVersion(modules, version) {
  if (version < 7) return;
  const size = modules.length;
  const bits = bchVersion(version);
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = Math.floor(i / 3);
    const b = i % 3;
    modules[size - 11 + b][a] = dark;
    modules[a][size - 11 + b] = dark;
  }
}

/** Devuelve { size, modules } con modules[r][c] = true/false */
export function qrMatrix(text, { ec = 'M', mask: forzarMascara = null } = {}) {
  const bytes = utf8(text);
  let nivel = ec;
  let version = pickVersion(bytes.length, nivel);
  if (!version && nivel === 'M') { nivel = 'L'; version = pickVersion(bytes.length, nivel); }
  if (!version) throw new Error('Texto demasiado largo para el QR');

  const codewords = buildCodewords(bytes, version, nivel);
  const { size, modules, reserved } = buildMatrix(version, codewords, nivel);

  // elegir máscara con menor penalización (o la forzada, para depurar)
  let best = null;
  const rango = forzarMascara === null ? [0,1,2,3,4,5,6,7] : [forzarMascara];
  for (const m of rango) {
    const test = modules.map((row) => row.slice());
    const fn = MASKS[m];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!reserved[r][c] && fn(r, c)) test[r][c] = !test[r][c];
      }
    }
    drawFormat(test, nivel, m);
    drawVersion(test, version);
    const score = penalty(test);
    if (!best || score < best.score) best = { score, modules: test, mask: m };
  }

  return { size, modules: best.modules, version, ec: nivel, mask: best.mask };
}

/** Devuelve un SVG del QR listo para incrustar */
export function qrSvg(text, { size = 220, margin = 4, dark = '#0F172A', light = '#FFFFFF', ec = 'M' } = {}) {
  const { size: n, modules } = qrMatrix(text, { ec });
  const total = n + margin * 2;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) path += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Código QR">
  <rect width="${total}" height="${total}" fill="${light}"/>
  <path d="${path}" fill="${dark}"/>
</svg>`;
}

/** Devuelve un data URL PNG (útil para imprimir o guardar) */
export function qrDataUrl(text, { size = 240, margin = 4, dark = '#0F172A', light = '#FFFFFF', ec = 'M' } = {}) {
  const { size: n, modules } = qrMatrix(text, { ec });
  const total = n + margin * 2;
  const scale = Math.max(1, Math.floor(size / total));
  const px = total * scale;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
    }
  }
  return canvas.toDataURL('image/png');
}
