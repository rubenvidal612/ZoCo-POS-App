// Exportación e importación de Excel/CSV (sin dependencias)
import { state, totalStock, productById } from './store.js';

/** Convierte filas a CSV que Excel abre bien (con acentos y separador detectado). */
export function toCSV(headers, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.map(esc).join(',')];
  rows.forEach((r) => lines.push(r.map(esc).join(',')));
  return '\ufeffsep=,\r\n' + lines.join('\r\n');
}

export function downloadExcel(filename, headers, rows) {
  const csv = toCSV(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- Exportadores ---------- */
export function exportSales() {
  const headers = ['Folio', 'Fecha', 'Hora', 'Sucursal', 'Cliente', 'Vendedor', 'Artículos', 'Método', 'Modo', 'Subtotal', 'Descuento', 'Total', 'Estado'];
  const rows = state.sales.map((s) => {
    const d = new Date(s.date);
    return [
      s.code, d.toLocaleDateString('es-MX'), d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      s.branchName, s.customer, s.user,
      s.items.map((i) => `${i.qty}x ${i.name} (${i.size})`).join(' | '),
      s.method, s.fiscalMode === 'fiscal' ? 'Fiscal' : 'Interno',
      s.subtotal, s.discount, s.total, s.status === 'cancelled' ? 'Cancelada' : 'Concluida',
    ];
  });
  downloadExcel('zoco-ventas-' + new Date().toISOString().slice(0, 10), headers, rows);
  return rows.length;
}

export function exportProducts() {
  const headers = ['Nombre', 'SKU', 'Categoría', 'Color', 'Costo', 'Precio', 'Margen %', 'Stock total', 'Stock por talla', 'Publicado'];
  const rows = state.products.map((p) => {
    const stock = Object.entries(p.branchStock?.[state.currentBranch] || {}).map(([k, v]) => `${k}:${v}`).join(' ');
    const margin = p.price > 0 ? Math.round(((p.price - (p.cost || 0)) / p.price) * 1000) / 10 : 0;
    return [p.name, p.code, p.section, p.color || '', p.cost || 0, p.price, margin, totalStock(p), stock, p.catalog ? 'Sí' : 'No'];
  });
  downloadExcel('zoco-inventario-' + new Date().toISOString().slice(0, 10), headers, rows);
  return rows.length;
}

export function exportPayroll(data, from, to) {
  const headers = ['Empleado', 'Puesto', 'Días', 'Horas', 'Tarifa', 'Tipo', 'Sueldo'];
  const rows = data.map((r) => [
    r.user.name, r.user.jobTitle || '', r.days,
    (Math.round(r.minutes / 6) / 10).toFixed(1),
    r.user.payRate, r.user.payType === 'DAILY' ? 'Por día' : 'Por hora', r.pay.toFixed(2),
  ]);
  downloadExcel(`zoco-nomina-${from}-${to}`, headers, rows);
  return rows.length;
}

export function exportExpenses() {
  const headers = ['Concepto', 'Monto', 'Fecha', 'Estado'];
  const rows = state.expenses.map((e) => [e.name, e.amount, new Date(e.date).toLocaleDateString('es-MX'), e.paid ? 'Pagado' : 'Pendiente']);
  downloadExcel('zoco-gastos-' + new Date().toISOString().slice(0, 10), headers, rows);
  return rows.length;
}

/* ---------- Importación de productos desde Excel (CSV) ---------- */
export function parseCSV(text) {
  const clean = text.replace(/^\ufeff/, '').replace(/^sep=.\r?\n/i, '');
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
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
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
    return obj;
  });
}

/** Importa productos: nombre, precio, costo, sku, categoria, color, cantidad. */
export function importProducts(text) {
  const rows = parseCSV(text);
  let ok = 0;
  const errors = [];
  rows.forEach((r, idx) => {
    const name = r.nombre || r.name || r.producto || '';
    const price = Number(String(r.precio || r.price || '').replace(/[^\d.]/g, ''));
    if (!name || !(price > 0)) { errors.push('Fila ' + (idx + 2) + ': falta nombre o precio'); return; }
    const qty = Number(String(r.cantidad || r.stock || r.qty || '0').replace(/[^\d.]/g, '')) || 0;
    const section = (r.categoria || r.category || '').toLowerCase();
    const valid = ['dama', 'infantil', 'caballero', 'escolar', 'bolsas', 'carteras', 'ropa', 'calzado', 'accesorios', 'general', 'abarrotes', 'electronica'];
    const sec = valid.includes(section) ? section : (state.company.mode === 'shoe' ? 'dama' : state.company.mode === 'boutique' ? 'ropa' : 'general');
    state.products.push({
      id: 'p' + Date.now() + idx,
      name,
      price,
      cost: Number(String(r.costo || r.cost || '').replace(/[^\d.]/g, '')) || Math.round(price * 0.55),
      section: sec,
      code: r.sku || r.codigo || (name.slice(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100)),
      color: r.color || '',
      active: true, catalog: true,
      branchStock: { [state.currentBranch]: { Único: qty } },
    });
    ok++;
  });
  return { ok, errors };
}
