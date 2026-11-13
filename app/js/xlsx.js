// Lector de Excel (.xlsx) sin dependencias: ZIP + DecompressionStream + XML
// Devuelve una matriz de strings (primera hoja del libro).

function u16(d, o) { return d[o] | (d[o + 1] << 8); }
function u32(d, o) { return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24)) >>> 0; }

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no soporta descompresión');
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Lee un ZIP (solo lo necesario para xlsx) → { nombreArchivo: Uint8Array } */
async function unzip(buf) {
  const d = new Uint8Array(buf);
  // buscar End of Central Directory
  let eocd = -1;
  for (let i = d.length - 22; i >= 0 && i > d.length - 66000; i--) {
    if (d[i] === 0x50 && d[i + 1] === 0x4b && d[i + 2] === 0x05 && d[i + 3] === 0x06) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Archivo no es un .xlsx válido');

  const count = u16(d, eocd + 10);
  let off = u32(d, eocd + 16);
  const files = {};

  for (let n = 0; n < count; n++) {
    if (u32(d, off) !== 0x02014b50) break;
    const method = u16(d, off + 10);
    const compSize = u32(d, off + 20);
    const nameLen = u16(d, off + 28);
    const extraLen = u16(d, off + 30);
    const commentLen = u16(d, off + 32);
    const localOff = u32(d, off + 42);
    const name = new TextDecoder().decode(d.subarray(off + 46, off + 46 + nameLen));

    // datos en el encabezado local
    const lNameLen = u16(d, localOff + 26);
    const lExtraLen = u16(d, localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = d.subarray(dataStart, dataStart + compSize);

    if (method === 0) files[name] = raw;
    else if (method === 8) { try { files[name] = await inflate(raw); } catch { /* ignora */ } }

    off += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const txt = (bytes) => (bytes ? new TextDecoder('utf-8').decode(bytes) : '');

function colIndex(ref) {
  const m = String(ref).match(/^([A-Z]+)/);
  if (!m) return 0;
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function unescapeXml(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function textRuns(xml) {
  // <si> puede tener varios <t> (texto enriquecido)
  const parts = [...String(xml).matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1]));
  return parts.join('');
}

/** Convierte un ArrayBuffer de .xlsx en matriz de filas (strings). */
export async function readXlsx(buffer) {
  const files = await unzip(buffer);

  // shared strings
  let shared = [];
  const ssRaw = txt(files['xl/sharedStrings.xml']);
  if (ssRaw) {
    shared = [...ssRaw.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textRuns(m[1]));
  }

  // primera hoja (por orden de archivo)
  const sheetName = Object.keys(files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))[0];
  if (!sheetName) throw new Error('El archivo no tiene hojas');

  const xml = txt(files[sheetName]);
  const rows = [];

  const rowMatches = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
  for (const rm of rowMatches) {
    const cells = [];
    const cellMatches = [...rm[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)];
    for (const cm of cellMatches) {
      const attrs = cm[1];
      const body = cm[2];
      const ref = (attrs.match(/r="([A-Z]+\d+)"/) || [])[1] || '';
      const type = (attrs.match(/t="([^"]+)"/) || [])[1] || '';
      const idx = ref ? colIndex(ref) : cells.length;

      let val = '';
      if (type === 's') {
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        val = shared[Number(v)] ?? '';
      } else if (type === 'inlineStr') {
        val = textRuns(body);
      } else if (type === 'str') {
        val = unescapeXml((body.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '');
      } else {
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        val = v != null ? v : '';
      }
      while (cells.length < idx) cells.push('');
      cells[idx] = String(val).trim();
    }
    if (cells.some((c) => String(c).trim() !== '')) rows.push(cells);
  }

  // normaliza ancho de filas
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ''));
}

/** Matriz → tabla { headers, rows } (usa la primera fila como encabezado) */
export function matrixToTable(matrix) {
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = matrix[0].map((h, i) => String(h || ('col' + (i + 1))).trim());
  const rows = matrix.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
  return { headers, rows };
}
