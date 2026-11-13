// Importador inteligente de inventario (Excel/CSV pegado o archivo)
import { state, emit, fmtSize, sizesFor, recordImport } from './store.js';
import { $, el, money, esc, toast, modal } from './ui.js';
import { downloadExcel } from './exports.js';

/* ---------- Alias de columnas (español/inglés y variantes) ---------- */
const ALIASES = {
  name: ['nombre', 'producto', 'articulo', 'artículo', 'descripcion', 'descripción', 'name', 'item', 'modelo', 'detalle'],
  price: ['precio', 'precio venta', 'precio_venta', 'precio publico', 'precio_publico', 'pvp', 'price', 'venta'],
  cost: ['costo', 'costo compra', 'costo_compra', 'cost', 'compra', 'precio costo'],
  sku: ['sku', 'codigo', 'código', 'clave', 'codigo barras', 'código de barras', 'barcode', 'upc', 'ean', 'referencia'],
  qty: ['cantidad', 'existencia', 'existencias', 'stock', 'inventario', 'qty', 'piezas', 'pares', 'unidades'],
  category: ['categoria', 'categoría', 'familia', 'linea', 'línea', 'departamento', 'category', 'seccion', 'sección', 'tipo'],
  color: ['color', 'colour', 'tono'],
  size: ['talla', 'talla/medida', 'medida', 'numero', 'número', 'size', 'talle'],
  brand: ['marca', 'brand', 'fabricante'],
  image: ['foto', 'imagen', 'image', 'url foto', 'foto url'],
};

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/* ---------- Parseo de tablas (CSV / TSV / pegado de Excel) ---------- */
export function parseTable(text) {
  const clean = String(text || '').replace(/^\ufeff/, '').replace(/^sep=.\r?\n/i, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const counts = {
    '\t': (lines[0].match(/\t/g) || []).length,
    ';': (lines[0].match(/;/g) || []).length,
    ',': (lines[0].match(/,/g) || []).length,
  };
  const sep = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || ',';

  const split = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === sep && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  };

  const headers = split(lines[0]);
  const rows = lines.slice(1).map(split);
  return { headers, rows, sep };
}

/* ---------- Detección de columnas ---------- */
export function detectMapping(headers) {
  const mapping = {};
  const used = new Set();
  headers.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    // columnas que son tallas (22, 23.5, S, M…)
    if (/^\d{1,2}([.,]5)?$/.test(n) || /^(xs|s|m|l|xl|xxl)$/.test(n)) {
      mapping['size:' + h] = i;
      used.add(i);
      return;
    }
    for (const [field, list] of Object.entries(ALIASES)) {
      if (mapping[field] != null) continue;
      if (list.some((a) => n === a || n.includes(a))) { mapping[field] = i; used.add(i); break; }
    }
  });
  return mapping;
}

const num = (v) => {
  const s = String(v ?? '').replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/* ---------- Construcción de productos ---------- */
export function buildProducts(table, mapping, opts = {}) {
  const defaults = {
    section: opts.section || (state.company.mode === 'shoe' ? 'dama' : state.company.mode === 'boutique' ? 'ropa' : 'general'),
    margin: 45,
  };
  const products = [];
  const errors = [];
  const sizeCols = Object.entries(mapping).filter(([k]) => k.startsWith('size:')).map(([k, i]) => ({ size: k.slice(5), i }));

  table.rows.forEach((r, idx) => {
    const get = (f) => (mapping[f] != null ? String(r[mapping[f]] ?? '').trim() : '');
    const name = get('name');
    const price = num(get('price'));
    if (!name) { errors.push('Fila ' + (idx + 2) + ': sin nombre'); return; }
    if (!(price > 0)) { errors.push('Fila ' + (idx + 2) + ': sin precio (' + name + ')'); return; }

    let cost = num(get('cost'));
    if (!(cost > 0)) cost = Math.round(price * (1 - defaults.margin / 100));

    const stock = {};
    if (sizeCols.length) {
      sizeCols.forEach(({ size, i }) => {
        const q = num(r[i]);
        if (q > 0) stock[fmtSize(size)] = q;
      });
    }
    // columna "talla" con formato "26:2 27:3" o "26,27" con cantidad general
    const sizeCell = get('size');
    if (sizeCell && !sizeCols.length) {
      sizeCell.split(/[|,;/\s]+/).forEach((tok) => {
        const m = tok.match(/^([\w.]+)\s*[:x]\s*(\d+)$/i);
        if (m) stock[fmtSize(m[1])] = num(m[2]);
      });
    }
    const qty = num(get('qty'));
    if (!Object.keys(stock).length) {
      stock[sizesFor(defaults.section).length === 1 ? 'Único' : fmtSize(sizesFor(defaults.section)[0])] = qty;
    }

    const catGuess = norm(get('category'));
    const validSections = ['dama', 'infantil', 'caballero', 'escolar', 'bolsas', 'carteras', 'ropa', 'calzado', 'accesorios', 'general', 'abarrotes', 'electronica'];
    const section = validSections.find((s) => catGuess.includes(s))
      || (catGuess.includes('dama') || catGuess.includes('mujer') ? 'dama'
        : catGuess.includes('hombre') || catGuess.includes('caballero') ? 'caballero'
        : catGuess.includes('nino') || catGuess.includes('niño') || catGuess.includes('infantil') ? 'infantil'
        : defaults.section);

    products.push({
      id: 'imp' + Date.now() + idx,
      createdAt: new Date().toISOString(),
      name,
      price,
      cost,
      section,
      code: get('sku') || (name.slice(0, 3).toUpperCase().replace(/\s/g, '') + '-' + Math.floor(Math.random() * 900 + 100)),
      color: get('color'),
      active: true,
      catalog: true,
      branchStock: { [state.currentBranch]: stock },
    });
  });

  return { products, errors };
}

/* ---------- Plantillas ---------- */
export const TEMPLATES = {
  shoe: {
    label: 'Zapatería (tallas 22-30)',
    headers: ['nombre', 'precio', 'costo', 'sku', 'categoria', 'color', '22', '23', '24', '25', '26', '27'],
    sample: [
      ['Nike Air Zoom', 1290, 700, 'AIR-100', 'dama', 'Negro', 1, 2, 3, 2, 1, 0],
      ['Tenis Niño Sport', 520, 260, 'TEN-101', 'infantil', 'Azul', 0, 0, 2, 3, 2, 0],
    ],
  },
  boutique: {
    label: 'Boutique (tallas XS-XXL)',
    headers: ['nombre', 'precio', 'costo', 'sku', 'categoria', 'color', 'XS', 'S', 'M', 'L', 'XL'],
    sample: [
      ['Blusa Lino', 450, 220, 'BLU-001', 'ropa', 'Blanco', 2, 4, 5, 3, 1],
      ['Bolsa Piel', 1750, 900, 'BOL-002', 'accesorios', 'Café', 1, 1, 1, 0, 0],
    ],
  },
  general: {
    label: 'Productos generales (sin tallas)',
    headers: ['nombre', 'precio', 'costo', 'sku', 'categoria', 'color', 'cantidad'],
    sample: [
      ['Audífonos Bluetooth', 399, 180, 'AUD-001', 'electronica', 'Negro', 25],
      ['Cuaderno Profesional', 45, 22, 'CUA-002', 'general', 'Azul', 100],
    ],
  },
};

export function downloadTemplate(kind) {
  const t = TEMPLATES[kind] || TEMPLATES.general;
  downloadExcel('plantilla-zoco-' + kind, t.headers, t.sample);
}

/* ---------- Modal de importación ---------- */
export function openImportModal(onDone, seedText) {
  let table = { headers: [], rows: [] };
  let mapping = {};
  let opts = { section: state.company.mode === 'shoe' ? 'dama' : state.company.mode === 'boutique' ? 'ropa' : 'general' };

  const fields = [
    ['name', 'Nombre'], ['price', 'Precio'], ['cost', 'Costo'], ['sku', 'SKU'],
    ['qty', 'Cantidad'], ['category', 'Categoría'], ['color', 'Color'], ['size', 'Talla'],
  ];

  const m = modal({
    title: 'Importar inventario',
    size: 'lg',
    body: `
      <div class="imp">
        <div class="imp-top">
          <label class="imp-drop" id="imp-drop">
            <input type="file" id="imp-file" accept=".csv,.txt,.tsv" hidden>
            <b>📄 Arrastra tu archivo o haz clic para subirlo</b>
            <span>CSV exportado de Excel, o copia y pega las celdas abajo</span>
          </label>
          <div class="imp-tpl">
            <div style="font-size:11.5px;font-weight:800;color:var(--muted)">PLANTILLAS</div>
            ${Object.entries(TEMPLATES).map(([k, t]) => `<button class="btn ghost sm" data-tpl="${k}" style="width:100%;justify-content:flex-start;margin-top:6px">⬇ ${t.label}</button>`).join('')}
          </div>
        </div>

        <div class="field" style="margin-top:12px"><label>…o pega aquí las celdas</label>
          <textarea id="imp-paste" rows="4" placeholder="nombre,precio,cantidad&#10;Nike Air Zoom,1290,5" style="width:100%;border:1px solid var(--line);border-radius:12px;padding:10px;font:13px ui-monospace,monospace"></textarea>
          <button class="btn sm ghost" id="imp-parse" style="margin-top:6px">Analizar</button>
        </div>

        <div id="imp-map" style="margin-top:14px"></div>
        <div id="imp-preview" style="margin-top:12px"></div>
      </div>`,
    foot: `<button class="btn ghost sm" data-close>Cancelar</button>
           <button class="btn sm" id="imp-go" disabled>Importar</button>`,
  });

  const mapEl = m.root.querySelector('#imp-map');
  if (seedText) { try { m.root.querySelector('#imp-paste').value = seedText; } catch {} }
  const prevEl = m.root.querySelector('#imp-preview');
  const goBtn = m.root.querySelector('#imp-go');

  m.root.querySelectorAll('[data-tpl]').forEach((b) => b.onclick = () => downloadTemplate(b.dataset.tpl));
  if (seedText) setTimeout(() => analyze(seedText), 50);
  m.root.querySelector('#imp-drop').onclick = () => m.root.querySelector('#imp-file').click();
  m.root.querySelector('#imp-file').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { analyze(String(rd.result || '')); };
    rd.readAsText(f, 'utf-8');
  };
  m.root.querySelector('#imp-parse').onclick = () => analyze(m.root.querySelector('#imp-paste').value);

  m.root.querySelector('#imp-drop').addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('over'); });
  m.root.querySelector('#imp-drop').addEventListener('dragleave', (e) => e.currentTarget.classList.remove('over'));
  m.root.querySelector('#imp-drop').addEventListener('drop', (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('over');
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => analyze(String(rd.result || ''));
    rd.readAsText(f, 'utf-8');
  });

  function analyze(text) {
    table = parseTable(text);
    if (!table.headers.length) { toast('No pude leer el archivo'); return; }
    mapping = detectMapping(table.headers);
    renderMapping();
    renderPreview();
  }

  function renderMapping() {
    mapEl.innerHTML = `
      <div class="imp-map-h">Detecté <b>${table.rows.length}</b> filas y estas columnas. Corrige si algo no coincide:</div>
      <div class="imp-map">
        ${fields.map(([f, label]) => `
          <div class="imp-row">
            <span>${label}</span>
            <select data-f="${f}">
              <option value="">— no hay —</option>
              ${table.headers.map((h, i) => `<option value="${i}" ${mapping[f] === i ? 'selected' : ''}>${esc(h) || 'Col ' + (i + 1)}</option>`).join('')}
            </select>
          </div>`).join('')}
      </div>
      ${table.headers.filter((h) => /^\d{1,2}([.,]5)?$/.test(h.trim())).length
        ? `<div class="imp-sizes">Tallas detectadas: ${table.headers.filter((h) => /^\d{1,2}([.,]5)?$/.test(h.trim())).join(' · ')}</div>` : ''}`;

    mapEl.querySelectorAll('select').forEach((s) => s.onchange = () => {
      const f = s.dataset.f;
      if (s.value === '') delete mapping[f];
      else mapping[f] = Number(s.value);
      renderPreview();
    });
  }

  function renderPreview() {
    const { products, errors } = buildProducts(table, mapping, opts);
    goBtn.disabled = !products.length;
    goBtn.textContent = products.length ? `Importar ${products.length} productos` : 'Importar';
    prevEl.innerHTML = `
      <div class="imp-prev-h">
        <b>${products.length}</b> listos · <b style="color:${errors.length ? 'var(--danger)' : 'var(--ok)'}">${errors.length}</b> con problema
      </div>
      ${products.length ? `<div class="imp-table"><table>
        <thead><tr><th>Nombre</th><th>Precio</th><th>Costo</th><th>SKU</th><th>Categoría</th><th>Stock</th></tr></thead>
        <tbody>${products.slice(0, 8).map((p) => `<tr>
          <td>${esc(p.name)}</td><td class="mono">${money(p.price)}</td><td class="mono">${money(p.cost)}</td>
          <td>${esc(p.code)}</td><td>${esc(p.section)}</td>
          <td class="mono">${Object.entries(p.branchStock[state.currentBranch]).map(([k, v]) => k + ':' + v).join(' ')}</td>
        </tr>`).join('')}</tbody></table>
        ${products.length > 8 ? `<div style="font-size:11px;color:var(--muted);padding:6px">… y ${products.length - 8} más</div>` : ''}
      </div>` : ''}
      ${errors.length ? `<div class="imp-err">${errors.slice(0, 4).map((e) => esc(e)).join('<br>')}${errors.length > 4 ? `<br>… ${errors.length - 4} más` : ''}</div>` : ''}`;
  }

  goBtn.onclick = () => {
    const { products, errors } = buildProducts(table, mapping, opts);
    const batchId = 'imp' + Date.now();
    products.forEach((p) => { p.importBatch = batchId; });
    state.products.push(...products);
    recordImport({
      id: batchId,
      fileName: (m.root.querySelector('#imp-file')?.files?.[0]?.name) || 'archivo pegado',
      ids: products.map((p) => p.id),
      source: 'excel',
    });
    emit();
    m.close();
    toast(products.length + ' productos importados' + (errors.length ? ' · ' + errors.length + ' omitidos' : ''));
    onDone?.();
  };
}
