// Vistas: Productos, Ventas, Reportes, Configuración
import { $, el, money, esc, toast, modal, confirmDialog, num, readImageCompressed, captureVideoFrame, pad } from './ui.js';
import { requestNotifyPermission, subscribePush } from './notify.js';
import { registerCam, dropCam, stopAllCams } from './camera.js';
import { enrollBiometric, verifyBiometric, biometricSupported } from './biometric.js';
import { sbConfig, setSbConfig, testConnection, syncNow, sbReady, isDirty } from './sync.js';
import { openReturnModal, openAdjustmentModal, openTransferModal } from './views-inventory.js';
import {
  state, emit, sectionsForMode, sizesFor, stockOf, totalStock, upsertProduct, deleteProduct,
  cancelSale, sectionOf, resetDemo, fmtSize, upsertCustomer, ROLES, PERMS, can, currentUser,
  layawayPayment, cancelLayaway, upsertCoupon, registerSummary, upsertExpense, payExpense,
  personalSummary, fixedMonthlyTotal, expenseMonthly, setSavingGoal, recordImport, undoImport, undoRecentProducts, resetToBlank, exportBackup,
  switchCompany, createCompany, MODES, timeAction, dayStats, weekStats, payFor, hhmm, TIME_TYPES, payroll,
  addUserDoc, removeUserDoc, setUserCredential, setGoal, goalFor, goalProgress, sellerStats, commissionOf,
  returnSale, registerAdjustment, transferStock, productById,
} from './store.js';
import { ticketHTML } from './views-pos.js';
import { exportSales, exportProducts, exportPayroll, exportExpenses } from './exports.js';
import { openImportModal, downloadTemplate } from './importer.js';
import { printTicket, connectUsbPrinter, connectBluetoothPrinter, printerStatus, connectWifiPrinter, paperWidth, setPaperWidth, paperMm, ticketText } from './printer.js';

/* ================= PRODUCTOS ================= */
export function productsView(ctx) {
  let q = '';
  const root = el(`
    <div>
      <div class="panel">
        <div class="panel-head">
          <h2>Productos</h2>
          <span style="font-size:12.5px;color:var(--muted)">${state.products.length} artículos</span>
          <div class="sp"></div>
          <div class="search" style="max-width:300px"><span>🔍</span>
            <input id="pq" placeholder="Artículo o código…"><span class="k">F3</span></div>
          <button class="btn ghost sm" id="imp">⬆ Importar</button>
          <button class="btn ghost sm" id="undo-imp">↩ Deshacer importación</button>
          <button class="btn ghost sm" id="adj">↺ Merma</button>
          <button class="btn ghost sm" id="trf">⇄ Traspaso</button>
          <button class="btn ghost sm" id="exp">⬇ Excel</button>
          <button class="btn sm" id="new">+ Producto</button>
        </div>
        <div class="bulkbar" id="bulk" style="display:none">
          <b id="bulk-n">0</b> seleccionados
          <div class="sp"></div>
          <button class="btn sm" id="bulk-up">🛍 Subir al catálogo</button>
          <button class="btn ghost sm" id="bulk-down">Quitar del catálogo</button>
          <button class="btn ghost sm" id="bulk-del" style="color:var(--danger)">🗑 Eliminar</button>
          <button class="btn ghost sm" id="bulk-clear">Cancelar</button>
        </div>
        <div style="overflow:auto">
          <table>
            <thead><tr>
              <th style="width:38px"><input type="checkbox" id="sel-all" title="Seleccionar todo"></th>
              <th>Producto</th><th>Sección</th><th>Tallas</th><th>Stock</th><th>Precio</th><th>Catálogo</th><th style="width:120px"></th>
            </tr></thead>
            <tbody id="rows"></tbody>
          </table>
        </div>
      </div>
    </div>`);

  const rows = $('#rows', root);
  const pq = $('#pq', root);
  const sel = new Set();
  pq.addEventListener('input', () => { q = pq.value.toLowerCase(); render(); });
  $('#new', root).onclick = () => editProduct(null);

  function paintBulk() {
    const bar = $('#bulk', root);
    const n = $('#bulk-n', root);
    if (!bar) return;
    bar.style.display = sel.size ? 'flex' : 'none';
    if (n) n.textContent = sel.size;
  }

  $('#bulk-clear', root).onclick = () => { sel.clear(); render(); };
  $('#bulk-up', root).onclick = () => {
    if (!sel.size) return;
    state.products.forEach((p) => { if (sel.has(p.id)) p.catalog = true; });
    emit();
    toast(sel.size + ' productos en el catálogo online');
    sel.clear(); render();
  };
  $('#bulk-down', root).onclick = () => {
    if (!sel.size) return;
    state.products.forEach((p) => { if (sel.has(p.id)) p.catalog = false; });
    emit();
    toast(sel.size + ' productos fuera del catálogo');
    sel.clear(); render();
  };
  $('#bulk-del', root).onclick = async () => {
    if (!sel.size) return;
    const ok = await confirmDialog({
      title: 'Eliminar productos',
      message: `Se eliminarán ${sel.size} producto(s) del inventario. Esta acción no se puede deshacer.`,
      okText: 'Eliminar ' + sel.size, danger: true,
    });
    if (!ok) return;
    const ids = new Set(sel);
    state.products = state.products.filter((p) => !ids.has(p.id));
    emit();
    toast(ids.size + ' eliminados');
    sel.clear(); render();
  };
  $('#sel-all', root).onchange = (e) => {
    const items = state.products.filter((p) => !q || (p.name + ' ' + p.code).toLowerCase().includes(q));
    if (e.target.checked) items.forEach((p) => sel.add(p.id)); else sel.clear();
    render();
  };

  function render() {
    const items = state.products.filter((p) => !q || (p.name + ' ' + p.code).toLowerCase().includes(q));
    rows.innerHTML = items.map((p) => {
      const sizes = sizesFor(p.section);
      const withStock = sizes.filter((s) => stockOf(p, s) > 0).length;
      return `<tr class="${sel.has(p.id) ? 'seled' : ''}">
        <td><input type="checkbox" data-sel="${p.id}" ${sel.has(p.id) ? 'checked' : ''}></td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            ${p.image
              ? `<img src="${p.image}" style="width:34px;height:34px;border-radius:9px;object-fit:cover">`
              : `<div style="width:34px;height:34px;border-radius:9px;background:${p.color};display:grid;place-items:center;color:#fff;font-weight:800;font-size:11px">${esc(sectionOf(p).label.slice(0, 2).toUpperCase())}</div>`}
            <div><div class="t-strong">${esc(p.name)}</div>
            <div style="font-size:11.5px;color:var(--muted)">${esc(p.code)}</div></div>
          </div>
        </td>
        <td>${esc(sectionOf(p).label)}</td>
        <td>${withStock}/${sizes.length}</td>
        <td class="mono">${totalStock(p)}</td>
        <td class="mono t-strong">${money(p.price)}</td>
        <td>${p.catalog ? '<span class="badge ok">Sí</span>' : '<span class="badge grey">No</span>'}</td>
        <td style="text-align:right">
          <button class="btn ghost sm" data-edit="${p.id}" style="height:30px">Editar</button>
          <button class="btn ghost sm" data-del="${p.id}" style="height:30px;color:var(--danger)">✕</button>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="8"><div class="cart-empty">Sin productos.</div></td></tr>`;

    rows.querySelectorAll('[data-sel]').forEach((c) => c.onchange = () => {
      if (c.checked) sel.add(c.dataset.sel); else sel.delete(c.dataset.sel);
      const tr = c.closest('tr'); if (tr) tr.classList.toggle('seled', c.checked);
      paintBulk();
    });
    paintBulk();
    rows.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => editProduct(b.dataset.edit));
    rows.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      const ok = await confirmDialog({ title: 'Eliminar producto', message: 'Esta acción no se puede deshacer.', okText: 'Eliminar', danger: true });
      if (ok) { deleteProduct(b.dataset.del); render(); }
    });
  }

  function editProduct(id) {
    const p = id ? state.products.find((x) => x.id === id) : null;
    const secs = sectionsForMode();
    const section = p?.section || secs[0][0];
    const sizes = sizesFor(section);

    const m = modal({
      wide: true,
      title: p ? 'Editar producto' : 'Nuevo producto',
      body: `
        <div class="row2">
          <div class="field"><label>Nombre</label><input id="f-name" value="${esc(p?.name || '')}" placeholder="Ej. Nike Air Zoom"></div>
          <div class="field"><label>Código / SKU</label><input id="f-code" value="${esc(p?.code || '')}" placeholder="AIR-100"></div>
          <div class="field"><label>Color / Variante</label><input id="f-color" value="${esc(p?.color || '')}" placeholder="Negro, Rojo…"></div>
          <div class="field"><label>Sección</label>
            <select id="f-sec">${secs.map(([k, s]) => `<option value="${k}" ${k === section ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Precio de venta</label><input id="f-price" type="number" step="0.01" value="${p?.price ?? ''}" placeholder="0.00"></div>
          <div class="field"><label>Costo</label><input id="f-cost" type="number" step="0.01" value="${p?.cost ?? ''}" placeholder="0.00"></div>
          <div class="field"><label>Visible en catálogo</label>
            <select id="f-cat"><option value="1" ${p?.catalog !== false ? 'selected' : ''}>Sí</option><option value="0" ${p?.catalog === false ? 'selected' : ''}>No</option></select></div>
        </div>
        <div class="field"><label>Foto del producto</label>
          <input id="f-img" type="file" accept="image/*">
          <div id="f-img-prev" style="margin-top:8px">${p?.image ? `<img src="${p.image}" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">` : ''}</div>
          <div class="hint">Se comprime automáticamente al subir (máx 1200px).</div>
        </div>
        <div class="field" style="margin-bottom:6px"><label>Inventario por talla</label></div>
        <div class="size-grid" id="f-sizes">
          ${sizes.map((s) => `<div style="text-align:center">
            <div style="font-size:11px;font-weight:800;color:var(--text-2);margin-bottom:3px">${fmtSize(s)}</div>
            <input class="sz-in" data-size="${fmtSize(s)}" type="number" min="0" step="1"
              value="${p ? stockOf(p, s) : 0}" style="width:100%;height:36px;text-align:center;border:1px solid var(--line);border-radius:8px;font-weight:700">
          </div>`).join('')}
        </div>`,
      foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="save">Guardar</button>`,
    });

    m.root.querySelector('#f-sec').onchange = (e) => {
      const sizes = sizesFor(e.target.value);
      m.root.querySelector('#f-sizes').innerHTML = sizes.map((s) => `<div style="text-align:center">
        <div style="font-size:11px;font-weight:800;color:var(--text-2);margin-bottom:3px">${fmtSize(s)}</div>
        <input class="sz-in" data-size="${fmtSize(s)}" type="number" min="0" step="1" value="0"
          style="width:100%;height:36px;text-align:center;border:1px solid var(--line);border-radius:8px;font-weight:700"></div>`).join('');
    };

    let pendingImage = p?.image || null;
    m.root.querySelector('#f-img').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const r = await readImageCompressed(f);
        pendingImage = r.dataUrl;
        m.root.querySelector('#f-img-prev').innerHTML = `<img src="${r.dataUrl}" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">`;
        toast('Imagen lista · ' + Math.round(r.bytes / 1024) + ' KB');
      } catch (err) { toast(err.message); }
    };

    m.root.querySelector('#save').onclick = () => {
      const name = m.root.querySelector('#f-name').value.trim();
      const price = Number(m.root.querySelector('#f-price').value) || 0;
      if (!name) { toast('Falta el nombre'); return; }
      if (price <= 0) { toast('Falta el precio'); return; }
      const stock = {};
      m.root.querySelectorAll('.sz-in').forEach((i) => { stock[i.dataset.size] = Math.max(0, Number(i.value) || 0); });
      const branchStock = { ...(p?.branchStock || {}) };
      branchStock[state.currentBranch] = stock;
      upsertProduct({
        id: p?.id, name, price, image: pendingImage,
        code: m.root.querySelector('#f-code').value.trim() || name.slice(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100),
        color: m.root.querySelector('#f-color').value.trim() || p?.color,
        section: m.root.querySelector('#f-sec').value,
        cost: Number(m.root.querySelector('#f-cost').value) || Math.round(price * 0.55),
        catalog: m.root.querySelector('#f-cat').value === '1',
        branchStock,
      });
      m.close(); render(); ctx.refreshShell?.();
    };
  }

  root.querySelector('#hard-reset')?.addEventListener('click', async () => {
    toast('Reiniciando app…');
    try {
      const rs = await navigator.serviceWorker.getRegistrations();
      for (const r of rs) await r.unregister();
      const ks = await caches.keys();
      for (const k of ks) await caches.delete(k);
      localStorage.removeItem('zoco.version.seen');
    } catch {}
    setTimeout(() => location.reload(), 400);
  });
  root.querySelector('#adj')?.addEventListener('click', () => openAdjustmentModal(render));
  root.querySelector('#trf')?.addEventListener('click', () => openTransferModal(render));

  // Deshacer la última importación (como en ZoCo 2.13)
  const undoBtn = root.querySelector('#undo-imp');
  if (undoBtn) undoBtn.onclick = async () => {
    const batches = state.imports || [];
    if (!batches.length) {
      const n = (state.products || []).filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= Date.now() - 30 * 60000).length;
      if (!n) { toast('No hay importaciones recientes para deshacer'); return; }
      const ok = await confirmDialog({
        title: 'Deshacer productos recientes',
        message: `No hay registro del lote, pero puedo borrar los ${n} productos creados en los últimos 30 minutos.`,
        okText: 'Borrar ' + n, danger: true,
      });
      if (ok) { const del = undoRecentProducts(30); toast(del + ' productos eliminados'); emit(); render(); }
      return;
    }
    const b = batches[0];
    const ok = await confirmDialog({
      title: 'Deshacer importación',
      message: `Se eliminarán los ${b.count} productos de "${b.fileName}" (${new Date(b.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}). El inventario vuelve a como estaba antes de subir el archivo.`,
      okText: 'Sí, deshacer', danger: true,
    });
    if (!ok) return;
    const del = undoImport(b.id);
    emit(); render();
    toast(del + ' productos eliminados · inventario restaurado');
  };
  const expBtn = root.querySelector('#exp');
  if (expBtn) expBtn.onclick = () => { const n = exportProducts(); toast(n + ' productos exportados a Excel'); };
  const impBtn = root.querySelector('#imp');
  if (impBtn) impBtn.onclick = () => openImportModal(() => { emit(); render(); });

  render();
  return { root, refresh: render, openCreate: () => editProduct(null) };
}

/* ================= VENTAS ================= */
export function salesView() {
  const root = el(`
    <div class="panel">
      <div class="panel-head"><h2>Transacciones</h2>
        <span style="font-size:12.5px;color:var(--muted)" id="cnt"></span>
        <div class="sp"></div>
        <button class="btn ghost sm" id="exp-sales">⬇ Excel</button></div>
      <div style="overflow:auto">
        <table>
          <thead><tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Items</th><th>Total</th><th>Pago</th><th>Modo</th><th>Estado</th><th></th></tr></thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
    </div>`);

  function render() {
    const rows = $('#rows', root);
    $('#cnt', root).textContent = state.sales.length + ' ventas';
    if (!state.sales.length) {
      rows.innerHTML = `<tr><td colspan="9"><div class="cart-empty"><div class="big">🧾</div>Aún no hay ventas registradas.</div></td></tr>`;
      return;
    }
    const mName = { cash: 'Efectivo', debit: 'Débito', credit: 'Crédito', other: 'Otros', credit_sale: 'Crédito' };
    rows.innerHTML = state.sales.map((s) => `
      <tr>
        <td class="t-strong mono">#${esc(s.code)}</td>
        <td>${new Date(s.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
        <td>${esc(s.customer)}</td>
        <td>${esc(s.user)}</td>
        <td>${s.items.reduce((a, i) => a + i.qty, 0)}</td>
        <td class="mono t-strong">${money(s.total)}</td>
        <td>${esc(mName[s.method] || s.method)}</td>
        <td>${(s.method === 'debit' || s.method === 'credit' || (s.method === 'split' && (s.payments || []).some((p) => p.method === 'debit' || p.method === 'credit')))
          ? '<span class="badge info">🧾 Fiscal</span>'
          : '<span class="badge grey">🏢 Interno</span>'}</td>
        <td>${s.status === 'cancelled'
          ? `<span class="badge danger">Cancelada</span>`
          : s.status === 'returned'
            ? `<span class="badge warn">Devuelta</span>`
            : (s.refunded > 0
              ? `<span class="badge warn">Dev. parcial</span>`
              : `<span class="badge ok">Concluido</span>`)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn ghost sm" data-see="${s.id}" style="height:30px">Ver</button>
          ${s.status === 'done' || s.status === 'returned' ? `<button class="btn ghost sm" data-ret="${s.id}" style="height:30px">Devolver</button>` : ''}
          ${s.status === 'done' ? `<button class="btn ghost sm" data-fac="${s.id}" style="height:30px">Factura</button>` : ''}
          ${s.status !== 'cancelled' ? `<button class="btn ghost sm" data-can="${s.id}" style="height:30px;color:var(--danger)">Cancelar</button>` : ''}
        </td>
      </tr>`).join('');

    rows.querySelectorAll('[data-see]').forEach((b) => b.onclick = () => {
      const s = state.sales.find((x) => x.id === b.dataset.see);
      modal({
        title: 'Venta #' + s.code,
        body: `<div id="ticket-holder">${ticketHTML(s)}</div>
               ${s.status === 'cancelled' ? `<div class="badge danger" style="margin:12px auto;display:flex;width:fit-content">Cancelada · ${esc(s.cancelReason)}</div>` : ''}`,
        foot: `<button class="btn ghost sm" data-close>Cerrar</button><button class="btn sm" onclick="window.print()">Imprimir</button>`,
      });
    });

    rows.querySelectorAll('[data-fac]').forEach((b) => b.onclick = () => {
      const s = state.sales.find((x) => x.id === b.dataset.fac);
      modal({
        title: 'Factura',
        body: `<div style="font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:1.5;border:1px solid var(--line);border-radius:12px;padding:18px">
          <div style="text-align:center;font-weight:800;font-size:14px">${esc(state.company.name)}</div>
          <div style="text-align:center;color:var(--muted)">RFC: ${esc(state.company.legalId || 'Pendiente de RFC')}</div>
          <div style="height:1px;background:var(--line);margin:10px 0"></div>
          <div>FOLIO: ${esc(s.code)}</div><div>Fecha: ${new Date(s.date).toLocaleString('es-MX')}</div>
          <div>Cliente: ${esc(s.customer || 'Público general')}</div>
          <div style="height:1px;background:var(--line);margin:10px 0"></div>
          ${s.items.map((l) => `<div style="display:flex;justify-content:space-between"><span>${l.qty}× ${esc(l.name)} T.${esc(l.size)}</span><span>${money(l.price * l.qty)}</span></div>`).join('')}
          <div style="height:1px;background:var(--line);margin:10px 0"></div>
          <div style="display:flex;justify-content:space-between;font-weight:800;font-size:14px"><span>TOTAL</span><span>${money(s.total)}</span></div>
          <div style="margin-top:12px;color:var(--muted);font-size:11px">Documento preliminar. Para factura fiscal (CFDI) se requiere tu certificado PAC.</div>
        </div>`,
        foot: `<button class="btn ghost sm" data-close>Cerrar</button><button class="btn sm" onclick="window.print()">Imprimir</button>`,
      });
    });

    rows.querySelectorAll('[data-ret]').forEach((b) => b.onclick = () => {
      openReturnModal(b.dataset.ret, render);
    });

    rows.querySelectorAll('[data-can]').forEach((b) => b.onclick = async () => {
      const reason = await confirmDialog({
        title: 'Cancelar venta',
        message: 'Se repondrá el inventario de cada talla y la venta quedará marcada como cancelada.',
        okText: 'Sí, cancelar', danger: true, requireReason: true,
      });
      if (reason) { cancelSale(b.dataset.can, reason); render(); toast('Venta cancelada'); }
    });

    const expBtn = root.querySelector('#exp-sales');
    if (expBtn) expBtn.onclick = () => {
      const n = exportSales();
      toast(n + ' ventas exportadas a Excel');
    };
  }

  render();
  return { root, refresh: render };
}

/* ================= REPORTES ================= */
export function reportsView() {
  const root = el(`<div id="rep"></div>`);
  function render() {
    const today = new Date().toDateString();
    const done = state.sales.filter((s) => s.status === 'done');
    const todays = done.filter((s) => new Date(s.date).toDateString() === today);
    const sum = (arr) => arr.reduce((a, s) => a + s.total, 0);
    const items = done.flatMap((s) => s.items);
    const top = {};
    items.forEach((i) => { top[i.name] = (top[i.name] || 0) + i.price * i.qty; });
    const topList = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);

    root.innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="l">Facturación hoy</div><div class="v">${money(sum(todays))}</div><div class="s">${todays.length} ventas</div></div>
        <div class="kpi"><div class="l">Ticket medio</div><div class="v">${money(todays.length ? sum(todays) / todays.length : 0)}</div><div class="s">hoy</div></div>
        <div class="kpi"><div class="l">Ventas totales</div><div class="v">${done.length}</div><div class="s">${money(sum(done))} facturado</div></div>
        <div class="kpi"><div class="l">Piezas vendidas</div><div class="v">${items.reduce((a, i) => a + i.qty, 0)}</div><div class="s">histórico</div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Metas</h2>
          <div class="sp"></div>
          <select id="goal-scope" style="height:32px;border:1px solid var(--line);border-radius:8px;font-size:12px;padding:0 8px">
            <option value="business">Del negocio</option>
            ${state.users.filter((u) => u.role !== 'owner').map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}
          </select>
          <select id="goal-period" style="height:32px;border:1px solid var(--line);border-radius:8px;font-size:12px;padding:0 8px;margin-left:6px">
            <option value="day">Hoy</option><option value="week">Semana</option><option value="month" selected>Mes</option><option value="year">Año</option>
          </select>
        </div>
        <div style="padding:16px 18px" id="goal-body"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Más vendidos por valor</h2></div>
        <table><thead><tr><th>#</th><th>Producto</th><th>Importe</th></tr></thead>
        <tbody>${topList.length ? topList.map(([n, v], i) => `<tr><td>${i + 1}</td><td class="t-strong">${esc(n)}</td><td class="mono">${money(v)}</td></tr>`).join('')
          : `<tr><td colspan="3"><div class="cart-empty">Haz una venta para ver datos aquí.</div></td></tr>`}</tbody></table>
      </div>`;

    const gs = root.querySelector('#goal-scope');
    const gp = root.querySelector('#goal-period');
    const paintGoal = () => {
      const scopeVal = gs.value;
      const isBiz = scopeVal === 'business';
      const g = goalFor(isBiz ? 'business' : 'seller', isBiz ? null : scopeVal, gp.value);
      const prog = g ? goalProgress(g) : { done: 0, target: 0, pct: 0, tickets: 0 };
      const name = isBiz ? 'del negocio' : 'de ' + (state.users.find((u) => u.id === scopeVal)?.name || '');
      root.querySelector('#goal-body').innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
          <div style="flex:1;min-width:160px">
            <div style="font-size:11px;color:var(--muted);font-weight:800;margin-bottom:4px">META ${gp.value === 'day' ? 'DEL DÍA' : gp.value === 'week' ? 'DE LA SEMANA' : gp.value === 'year' ? 'DEL AÑO' : 'DEL MES'} ${name.toUpperCase()}</div>
            <input id="goal-val" type="number" min="0" step="100" value="${g?.target || 0}"
              style="width:100%;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font-size:14px">
          </div>
          <button class="btn sm" id="goal-save">Guardar meta</button>
        </div>
        ${g && g.target > 0 ? `
          <div style="margin-top:14px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
              <b>${money(prog.done)}</b><span style="color:var(--muted)">de ${money(g.target)} · ${prog.pct}%</span>
            </div>
            <div style="height:10px;background:var(--line);border-radius:99px;overflow:hidden">
              <i style="display:block;height:100%;width:${prog.pct}%;background:linear-gradient(90deg,#F97316,#EA580C)"></i>
            </div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:6px">${prog.pct >= 100 ? '🎉 ¡Meta cumplida!' : 'Faltan ' + money(g.target - prog.done)} · ${prog.tickets} tickets</div>
          </div>` : '<div style="font-size:12px;color:var(--muted);margin-top:10px">Sin meta fijada. Escribe un monto y guarda.</div>'}`;
      root.querySelector('#goal-save').onclick = () => {
        setGoal({
          scope: isBiz ? 'business' : 'seller',
          userId: isBiz ? null : scopeVal,
          period: gp.value,
          target: Number(root.querySelector('#goal-val').value) || 0,
        });
        paintGoal();
        toast('Meta guardada');
      };
    };
    gs.onchange = paintGoal; gp.onchange = paintGoal; paintGoal();
  }
  render();
  return { root, refresh: render };
}

/* ================= CONFIGURACIÓN ================= */
export function settingsView(ctx) {
  const THEMES = [
    ['classic', 'ZoCo Classic', ['#0F172A', '#F97316', '#FBBF24']],
    ['cobalto', 'Cobalto', ['#0F172A', '#2F5BFF', '#22D3EE']],
    ['esmeralda', 'Esmeralda', ['#0B3B33', '#10B981', '#F59E0B']],
    ['coral', 'Coral', ['#1C1F26', '#FF6B4A', '#FFD166']],
    ['vino', 'Vino', ['#2A0F1B', '#B4235A', '#F4A261']],
    ['oceano', 'Océano', ['#0B2545', '#0EA5E9', '#34D399']],
    ['arena', 'Arena', ['#3A3226', '#C08A3E', '#7C9A6D']],
  ];

  const root = el(`
    <div class="settings-page" id="settings-root">
      <div class="settings-nav" id="settings-nav"></div>
      <div class="settings-grid">
      <div class="panel" data-sec="Apariencia">
        <div class="panel-head"><h2>Apariencia</h2></div>
        <div style="padding:16px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Tema de la empresa. Se aplica al instante en todas las cajas.</div>
          <div class="theme-grid" id="themes"></div>
          <div style="margin-top:16px;display:flex;gap:10px;align-items:center">
            <label style="font-size:13px;font-weight:600">Modo oscuro</label>
            <input type="checkbox" id="dark" ${document.documentElement.dataset.mode === 'dark' ? 'checked' : ''}>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Negocio</h2></div>
        <div style="padding:16px">
          <div class="field"><label>Nombre comercial</label><input id="c-name" value="${esc(state.company.name)}"></div>
          <div class="field"><label>RFC / Identificación</label><input id="c-rfc" value="${esc(state.company.legalId || '')}" placeholder="Opcional"></div>
          <div class="field"><label>Giro del negocio</label>
            <select id="c-mode">
              ${Object.entries(MODES).map(([k, m]) => `<option value="${k}" ${state.company.mode === k ? 'selected' : ''}>${m.label}</option>`).join('')}
            </select>
            <div class="hint">Cambia las secciones y las rampas de tallas del inventario. Cada empresa elige el suyo.</div>
          </div>
          <button class="btn sm" id="save-co">Guardar</button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Agente IA</h2><span class="badge info" style="margin-left:auto">Beta</span></div>
        <div style="padding:16px">
          <div class="field"><label>Proveedor</label>
            <select id="ai-p">
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="anthropic">Anthropic</option>
              <option value="custom">Compatible OpenAI (URL propia)</option>
            </select></div>
          <div class="field"><label>API key</label>
            <div style="display:flex;gap:6px">
              <input id="ai-k" type="password" autocomplete="off" placeholder="sk-…" value="${esc(state.settings.aiKey || '')}" style="flex:1">
              <button class="btn ghost sm" type="button" id="ai-k-show" style="height:38px">👁</button>
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">Se guarda en este negocio. Nadie más la ve.</div>
            </div>
          <button class="btn sm" id="save-ai">Guardar llave</button>
        </div>
      </div>

      <div class="panel" data-sec="Ticket">
        <div class="panel-head"><h2>Ticket</h2></div>
        <div style="padding:16px">
          <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">
            Así sale impreso tu ticket. Cambia el nombre, agrega datos y personaliza el pie.
          </div>
          <div class="field"><label>Nombre en el ticket</label>
            <input id="tk-name" value="${esc(state.settings?.ticket?.name || state.company.name || '')}" placeholder="Mi zapatería"></div>
          <div class="field"><label>Línea extra (dirección o slogan)</label>
            <input id="tk-line1" value="${esc(state.settings?.ticket?.line1 || '')}" placeholder="Av. Juárez 123, Centro"></div>
          <div class="row2">
            <div class="field"><label>Teléfono</label>
              <input id="tk-phone" value="${esc(state.settings?.ticket?.phone || '')}" placeholder="993 123 4567"></div>
            <div class="field"><label>RFC (opcional)</label>
              <input id="tk-tax" value="${esc(state.settings?.ticket?.taxId || '')}" placeholder="XAXX010101000"></div>
          </div>
          <div class="field"><label>Pie de página</label>
            <input id="tk-footer" value="${esc(state.settings?.ticket?.footer || '¡Gracias por su compra!')}" placeholder="¡Gracias por su compra!"></div>
          <div class="field"><label>Texto al final (cambios, garantía, redes…)</label>
            <textarea id="tk-end" rows="2" placeholder="Cambios dentro de 15 días con ticket. WhatsApp 993 123 4567">${esc(state.settings?.ticket?.footerEnd || '')}</textarea></div>
          <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;margin:6px 0 14px">
            <input type="checkbox" id="tk-brand" ${state.settings?.ticket?.showBrand !== false ? 'checked' : ''}>
            Mostrar "ZoCo POS" al final del ticket
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm" id="tk-save">Guardar ticket</button>
            <button class="btn ghost sm" id="tk-preview">👁 Ver cómo queda</button>
            <button class="btn ghost sm" id="tk-paper">Papel: ${(() => { try { return (localStorage.getItem('zoco.printer.paper') === '80' ? '80' : '58') + ' mm'; } catch { return '58 mm'; } })()}</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Impresora y escáner</h2></div>
        <div style="padding:16px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:10px">
            Ticket ESC/POS por USB o Bluetooth. Si no hay impresora conectada, se abre el diálogo del navegador.
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm" id="pr-usb">Conectar USB</button>
            <button class="btn sm ghost" id="pr-bt">Conectar Bluetooth</button>
            <button class="btn sm ghost" id="pr-test">Probar ticket</button>
            <button class="btn sm ghost" id="pr-view">👁 Ver ticket</button>
          </div>
          <div style="margin-top:12px">
            <div style="font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:6px">Ancho de papel</div>
            <select id="pr-paper" style="height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font-size:13px">
              <option value="58">58 mm (32 caracteres) — POS58D</option>
              <option value="80">80 mm (48 caracteres)</option>
            </select>
          </div>
          <div style="margin-top:12px">
            <div style="font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:6px">Impresora WiFi (TCP 9100)</div>
            <div style="display:flex;gap:8px">
              <input id="pr-host" placeholder="192.168.1.50" style="flex:1;height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font-size:13px">
              <input id="pr-port" placeholder="9100" style="width:80px;height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font-size:13px">
              <button class="btn sm" id="pr-wifi">Guardar</button>
            </div>
          </div>
          <div class="hint" style="margin-top:10px" id="pr-state"></div>
          <div style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">
            <div style="font-size:11.5px;font-weight:800;color:var(--muted);margin-bottom:8px">LECTOR DE CÓDIGOS</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <input id="sc-test" placeholder="Dispara un código aquí…" style="flex:1;min-width:180px;height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font-size:13px">
              <button class="btn sm ghost" id="sc-cam">Probar cámara</button>
            </div>
            <div class="hint" style="margin-top:8px">La pistola funciona en cualquier pantalla (teclea el código + Enter). La cámara se abre desde ⌗ en Vender.</div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Notificaciones y checador</h2></div>
        <div style="padding:16px;display:grid;gap:12px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <button class="btn sm" id="notif-enable">🔔 Activar notificaciones</button>
            <button class="btn ghost sm" id="notif-test">Enviar prueba</button>
            <button class="btn ghost sm" id="hard-reset" title="Borra caché y recarga con la última versión">⟳ Reiniciar app</button>
            <span style="font-size:11.5px;color:var(--muted)" id="notif-state"></span>
          </div>
          <label class="sw-row"><input type="checkbox" id="set-salenotif" ${state.settings.saleNotifications ? 'checked' : ''}>
            <span>Avisarme en el dispositivo cada venta <small>(solo dueño/administrador)</small></span></label>
          <label class="sw-row"><input type="checkbox" id="set-dailynotice" ${state.settings.dailyBudgetNotice ? 'checked' : ''}>
            <span>Mostrarme mi presupuesto diario al abrir la app</span></label>
          <label class="sw-row"><input type="checkbox" id="set-checkphoto" ${state.settings.checkPhotoRequired !== false ? 'checked' : ''}>
            <span>Pedir foto en cada checada del reloj</span></label>
          <div class="field" style="margin:0">
            <label>Reloj checador externo (marca, modelo o URL)</label>
            <input id="set-extclock" value="${esc(state.settings.externalClock || '')}" placeholder="Ej. ZKTeco K40 · http://192.168.1.50">
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Nube (Supabase)</h2></div>
        <div style="padding:16px">
          <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">
            Opcional. Con esto tus datos se respaldan y se ven en otros dispositivos.
            La app sigue funcionando sin internet y sincroniza cuando vuelve la red.
          </div>
          <div class="field"><label>URL del proyecto</label>
            <input id="sb-url" placeholder="https://xxxx.supabase.co" value="${esc(sbConfig().url || '')}"></div>
          <div class="field"><label>Anon key (pública)</label>
            <input id="sb-key" placeholder="eyJhbGciOi..." value="${esc(sbConfig().key || '')}"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm" id="sb-save">Guardar</button>
            <button class="btn ghost sm" id="sb-test">Probar conexión</button>
            <button class="btn ghost sm" id="sb-sync">Sincronizar ahora</button>
          </div>
          <div class="hint" id="sb-state" style="margin-top:8px"></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Inventario desde Excel</h2></div>
        <div style="padding:16px">
          <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">
            Sube el inventario de tu cliente en su propio formato (CSV de Excel) o usa una plantilla.
            Detectamos las columnas solas y rellenamos lo que falte.
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm" id="cfg-import">⬆ Importar inventario</button>
            <button class="btn ghost sm" id="cfg-tpl-shoe">Plantilla zapatería</button>
            <button class="btn ghost sm" id="cfg-tpl-boutique">Plantilla boutique</button>
            <button class="btn ghost sm" id="cfg-tpl-general">Plantilla general</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h2>Empresas (multiempresa)</h2></div>
        <div style="padding:16px">
          <div id="co-list" style="margin-bottom:12px"></div>
          <div style="display:flex;gap:8px">
            <input id="co-new" placeholder="Nombre del nuevo negocio" style="flex:1;height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font-size:13px">
            <button class="btn sm" id="co-create">Crear</button>
          </div>
          <div class="hint" style="margin-top:8px">Cada empresa guarda sus datos por separado en el servidor.</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Datos de prueba</h2></div>
        <div style="padding:16px">
          <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">
            ¿Ya vas a usar tu negocio de verdad? Empieza de cero: borra el catálogo y las ventas de ejemplo.
            Se conservan tu empresa, sucursales, usuarios y configuración.
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn sm" id="blank">🧹 Empezar de cero</button>
            <button class="btn ghost sm" id="backup">⬇ Descargar respaldo</button>
            <button class="btn ghost sm" id="reset" style="color:var(--danger)">Restablecer demo</button>
          </div>
          <div class="hint" style="margin-top:8px">El respaldo guarda TODO en un archivo JSON por si quieres volver atrás.</div>
        </div>
      </div>
      </div>
    </div>`);

  /* ===== Configuración en móvil: menú de tarjetas en vez de un chorizo largo ===== */
  (function buildSettingsNav() {
    const page = root.classList?.contains('settings-page') ? root : root.querySelector('.settings-page');
    const gridEl = root.querySelector('.settings-grid');
    const nav = root.querySelector('#settings-nav');
    if (!page || !gridEl || !nav) return;
    const panels = [...gridEl.querySelectorAll(':scope > .panel')];
    const iconFor = (t) => {
      const k = t.toLowerCase();
      if (k.includes('apariencia')) return '🎨';
      if (k.includes('negocio')) return '🏪';
      if (k.includes('agente') || k.includes(' ia')) return '✦';
      if (k.includes('impresora')) return '🖨';
      if (k.includes('notificacion')) return '🔔';
      if (k.includes('nube') || k.includes('supabase')) return '☁';
      if (k.includes('empresa')) return '🏢';
      if (k.includes('excel') || k.includes('inventario')) return '📗';
      if (k.includes('prueba')) return '🧪';
      return '⚙';
    };
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'set-back';
    back.innerHTML = '← Volver';
    back.onclick = () => {
      page.classList.remove('in-sec');
      panels.forEach((x) => x.classList.remove('open'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    page.prepend(back);

    panels.forEach((p, i) => {
      const t = (p.querySelector('h2')?.textContent || 'Sección').trim();
      p.dataset.sec = t;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'set-tile';
      b.dataset.target = String(i);
      const ico = document.createElement('span');
      ico.className = 'st-ico';
      ico.textContent = iconFor(t);
      const tx = document.createElement('span');
      tx.className = 'st-txt';
      tx.textContent = t;
      const ch = document.createElement('span');
      ch.className = 'st-arrow';
      ch.textContent = '›';
      b.append(ico, tx, ch);
      b.onclick = () => {
        panels.forEach((x, k) => x.classList.toggle('open', k === i));
        page.classList.add('in-sec');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      nav.appendChild(b);
    });
  })();

  const grid = $('#themes', root);
  grid.innerHTML = THEMES.map(([id, name, sw]) => `
    <div class="theme-card ${state.company.theme === id ? 'on' : ''}" data-t="${id}">
      <div style="font-size:12.5px;font-weight:700">${name}</div>
      <div class="swatches">${sw.map((c) => `<i style="background:${c}"></i>`).join('')}</div>
    </div>`).join('');
  grid.querySelectorAll('[data-t]').forEach((c) => c.onclick = () => {
    state.company.theme = c.dataset.t;
    document.documentElement.dataset.theme = c.dataset.t === 'cobalto' ? '' : c.dataset.t;
    grid.querySelectorAll('.theme-card').forEach((x) => x.classList.toggle('on', x === c));
    ctx.persist();
  });

  $('#dark', root).onchange = (e) => {
    document.documentElement.dataset.mode = e.target.checked ? 'dark' : '';
    ctx.persist();
  };

  $('#save-co', root).onclick = () => {
    state.company.name = $('#c-name', root).value.trim() || 'ZoCo';
    state.company.legalId = $('#c-rfc', root).value.trim();
    const mode = $('#c-mode', root).value;
    if (mode !== state.company.mode) {
      state.company.mode = mode;
      const valid = sectionsForMode().map(([k]) => k);
      state.products.forEach((p) => { if (!valid.includes(p.section)) p.section = valid[0]; });
    }
    toast('Datos guardados'); ctx.persist(); ctx.refreshShell?.();
  };

  $('#save-ai', root).onclick = () => {
    state.settings.aiProvider = $('#ai-p', root).value;
    root.querySelector('#ai-k-show')?.addEventListener('click', () => {
      const i = root.querySelector('#ai-k');
      i.type = i.type === 'password' ? 'text' : 'password';
    });
    state.settings.aiKey = $('#ai-k', root).value.trim();
    toast('Llave guardada (demo local)'); ctx.persist();
  };

  $('#reset', root).onclick = async () => {
    const ok = await confirmDialog({ title: 'Restablecer demo', message: 'Se borrarán productos y ventas de prueba.', okText: 'Sí, borrar', danger: true });
    if (ok) resetDemo();
  };

  // Impresora
  // ===== Ticket editable =====
  const tkSave = $('#tk-save', root);
  if (tkSave) {
    tkSave.onclick = () => {
      state.settings = state.settings || {};
      state.settings.ticket = {
        name: $('#tk-name', root).value.trim() || state.company.name,
        line1: $('#tk-line1', root).value.trim(),
        phone: $('#tk-phone', root).value.trim(),
        taxId: $('#tk-tax', root).value.trim(),
        footer: $('#tk-footer', root).value.trim(),
        footerEnd: $('#tk-end', root).value.trim(),
        showBrand: $('#tk-brand', root).checked,
      };
      emit();
      toast('Ticket guardado ✓');
    };
    $('#tk-preview', root).onclick = async () => {
      const { ticketText } = await import('./printer.js');
      const fake = {
        code: 1024, date: new Date().toISOString(),
        branchName: state.branches[0]?.name || 'Centro',
        user: state.user?.name || 'Ramber', customer: 'Cliente',
        items: [{ name: 'Zapato Escolar Negro', size: '24', qty: 1, price: 450 }],
        subtotal: 450, discount: 0, total: 450, method: 'cash', received: 500, change: 50,
      };
      // usa lo que está en pantalla, sin guardar
      const prev = state.settings.ticket;
      state.settings.ticket = {
        name: $('#tk-name', root).value.trim() || state.company.name,
        line1: $('#tk-line1', root).value.trim(),
        phone: $('#tk-phone', root).value.trim(),
        taxId: $('#tk-tax', root).value.trim(),
        footer: $('#tk-footer', root).value.trim(),
        footerEnd: $('#tk-end', root).value.trim(),
        showBrand: $('#tk-brand', root).checked,
      };
      const txt = ticketText(fake);
      state.settings.ticket = prev;
      modal({
        title: 'Vista previa del ticket',
        body: `<pre class="ticket-preview">${esc(txt)}</pre>`,
        foot: `<button class="btn ghost sm" data-close>Cerrar</button>`,
      });
    };
    $('#tk-paper', root).onclick = () => {
      const cur = localStorage.getItem('zoco.printer.paper') === '80' ? '80' : '58';
      const next = cur === '80' ? '58' : '80';
      localStorage.setItem('zoco.printer.paper', next);
      $('#tk-paper', root).textContent = 'Papel: ' + next + ' mm';
      toast('Papel: ' + next + ' mm');
    };
  }
  // Ancho de papel y vista previa del ticket
  const paperSel = $('#pr-paper', root);
  if (paperSel) {
    paperSel.value = String(paperMm());
    paperSel.onchange = () => { setPaperWidth(paperSel.value); toast('Papel: ' + paperSel.value + ' mm'); };
  }
  $('#pr-view', root)?.addEventListener('click', () => {
    const fake = {
      code: 1024, date: new Date().toISOString(), branchName: state.branches[0]?.name || 'Centro',
      user: state.user?.name || 'Ramber', customer: 'Cliente',
      items: [
        { name: 'Zapato Escolar Negro', size: '24', qty: 1, price: 450 },
        { name: 'Sandalia Rosa', size: '23.5', qty: 2, price: 380 },
      ],
      subtotal: 1210, discount: 0, total: 1210, method: 'cash', received: 1500, change: 290,
    };
    modal({
      title: 'Vista previa del ticket (' + paperMm() + ' mm)',
      body: `<pre class="ticket-preview">${esc(ticketText(fake))}</pre>`,
      foot: `<button class="btn ghost sm" data-close>Cerrar</button><button class="btn sm" id="pv-print">Imprimir</button>`,
    });
    setTimeout(() => {
      const b = document.querySelector('#pv-print');
      if (b) b.onclick = async () => { const r = await printTicket(fake); toast(r.message); };
    }, 30);
  });
  const st = printerStatus();
  const stEl = $('#pr-state', root);
  if (stEl) stEl.textContent = 'USB: ' + st.usb + ' · Bluetooth: ' + st.bt + ' · WiFi: ' + st.wifi;
  $('#pr-usb', root)?.addEventListener('click', async () => {
    try { await connectUsbPrinter(); toast('Impresora USB conectada'); ctx.refreshShell?.(); }
    catch (e) { toast('No se pudo conectar: ' + e.message); }
  });
  $('#pr-bt', root)?.addEventListener('click', async () => {
    try { await connectBluetoothPrinter(); toast('Impresora Bluetooth guardada'); ctx.refreshShell?.(); }
    catch (e) { toast('No se pudo conectar: ' + e.message); }
  });
  $('#pr-wifi', root)?.addEventListener('click', () => {
    const host = $('#pr-host', root).value.trim();
    const port = Number($('#pr-port', root).value) || 9100;
    if (!host) { toast('Escribe la IP de la impresora'); return; }
    connectWifiPrinter(host, port);
    toast('Impresora WiFi guardada: ' + host + ':' + port);
    if (stEl) stEl.textContent = 'USB: ' + st.usb + ' · BT: ' + st.bt + ' · WiFi: ' + host + ':' + port;
  });
  $('#pr-test', root)?.addEventListener('click', async () => {
    const fake = { code: 'TEST', date: new Date().toISOString(), branchName: 'Prueba', customer: '-', items: [{ name: 'Artículo de prueba', size: '26', qty: 1, price: 100 }], subtotal: 100, discount: 0, total: 100, method: 'cash', received: 150, change: 50, user: 'Sistema' };
    const r = await printTicket(fake);
    toast(r.message);
  });
  $('#sc-test', root)?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = (e.target.value || '').trim();
      if (v) { toast('Código leído: ' + v); e.target.value = ''; }
    }
  });
  $('#sc-cam', root)?.addEventListener('click', async () => {
    const { scanWithCameraSoft, cameraScanSupported } = await import('./scanner.js');
    if (!cameraScanSupported()) {
      toast('Este navegador no lee códigos con cámara. Prueba en Chrome (Android) o usa la pistola.');
      return;
    }
    const code = await scanWithCameraSoft();
    if (code) {
      const inp = $('#sc-test', root);
      if (inp) inp.value = code;
      toast('Leído ✓ ' + code);
    }
  });

  // Supabase (nube)
  const sbState = $('#sb-state', root);
  const paintSb = () => {
    if (!sbState) return;
    sbState.textContent = !sbReady() ? 'Sin configurar (opcional)'
      : isDirty() ? 'Configurado · cambios pendientes de subir'
      : 'Configurado ✓';
  };
  paintSb();
  $('#sb-save', root)?.addEventListener('click', () => {
    setSbConfig($('#sb-url', root).value.trim(), $('#sb-key', root).value.trim());
    paintSb(); toast('Guardado');
  });
  $('#sb-test', root)?.addEventListener('click', async () => {
    setSbConfig($('#sb-url', root).value.trim(), $('#sb-key', root).value.trim());
    const r = await testConnection();
    toast(r.ok ? 'Conectado a Supabase ✓' : 'Error: ' + (r.error || 'revisa URL y key'));
  });
  $('#sb-sync', root)?.addEventListener('click', async () => {
    toast('Sincronizando…');
    const r = await syncNow();
    paintSb();
    toast(r.ok ? 'Sincronizado ✓' : 'Error: ' + (r.error || ''));
  });
  // Empezar de cero + respaldo
  $('#backup', root)?.addEventListener('click', () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'respaldo-zoco-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    toast('Respaldo descargado');
  });

  $('#blank', root)?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Empezar de cero',
      message: 'Se borran los datos del DEMO: productos, ventas, clientes, apartados, cupones, gastos, caja, checador y metas.\n\nNO se toca: tu empresa, sucursales, usuarios y sus roles, tema, configuración ni la llave de IA. Las pestañas siguen igual.\n\nDespués carga tu inventario con "Importar". ¿Continuar?',
      okText: 'Sí, empezar de cero', danger: true,
    });
    if (!ok) return;
    resetToBlank();
    ctx.refreshShell?.();
    toast('Listo: tu negocio está en blanco');
  });
  // Notificaciones y checador
  const notifBtn = $('#notif-enable', root);
  const notifState = $('#notif-state', root);
  const paintNotif = () => {
    if (!notifState) return;
    if (!('Notification' in window)) { notifState.textContent = 'Este navegador no soporta notificaciones'; return; }
    notifState.textContent = Notification.permission === 'granted' ? '✅ Activadas'
      : Notification.permission === 'denied' ? 'Bloqueadas: actívalas en el candado del navegador' : 'Sin activar';
  };
  paintNotif();
  notifBtn?.addEventListener('click', async () => {
    const r = await requestNotifyPermission();
    paintNotif();
    if (r !== 'granted') { toast('No se pudieron activar'); return; }
    const p = await subscribePush();
    toast(p.ok ? 'Notificaciones activadas (push incluido)' : 'Activadas en este dispositivo · ' + (p.error || ''));
  });
  $('#set-salenotif', root)?.addEventListener('change', (e) => { state.settings.saleNotifications = e.target.checked; emit(); toast(e.target.checked ? 'Te aviso de cada venta' : 'Avisos de venta desactivados'); });
  $('#set-dailynotice', root)?.addEventListener('change', (e) => { state.settings.dailyBudgetNotice = e.target.checked; emit(); toast(e.target.checked ? 'Verás tu presupuesto al abrir' : 'Aviso diario desactivado'); });
  $('#set-checkphoto', root)?.addEventListener('change', (e) => { state.settings.checkPhotoRequired = e.target.checked; emit(); });
  $('#set-extclock', root)?.addEventListener('change', (e) => { state.settings.externalClock = e.target.value.trim(); emit(); toast('Guardado'); });
  $('#notif-test', root)?.addEventListener('click', async () => {
    toast('Enviando…');
    try {
      const r = await fetch('/api/push/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: state.currentCompany || 'default', title: '🔔 Prueba ZoCo', body: 'Si ves esto, el push funciona' }),
      }).then((x) => x.json());
      toast(r.ok ? `Enviada a ${r.ok} dispositivo(s)` : 'No hay dispositivos suscritos');
    } catch (e) { toast('No se pudo enviar'); }
  });

  $('#cfg-import', root)?.addEventListener('click', () => openImportModal(() => { emit(); ctx.refreshShell?.(); }));
  $('#cfg-tpl-shoe', root)?.addEventListener('click', () => downloadTemplate('shoe'));
  $('#cfg-tpl-boutique', root)?.addEventListener('click', () => downloadTemplate('boutique'));
  $('#cfg-tpl-general', root)?.addEventListener('click', () => downloadTemplate('general'));
  // Empresas
  const coList = $('#co-list', root);
  const renderCos = () => {
    coList.innerHTML = state.companies.map((c) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--line-2)">
        <span style="font-weight:700">${esc(c.name)} ${c.id === state.currentCompany ? '<span class="badge info">Activa</span>' : ''}</span>
        ${c.id !== state.currentCompany ? `<button class="btn ghost sm" data-co="${c.id}" style="height:28px">Cambiar</button>` : ''}
      </div>`).join('');
    coList.querySelectorAll('[data-co]').forEach((b) => b.onclick = () => {
      switchCompany(b.dataset.co);
      ctx.refreshShell?.();
      location.reload();
    });
  };
  renderCos();
  $('#co-create', root)?.addEventListener('click', () => {
    const name = $('#co-new', root).value.trim();
    if (!name) { toast('Escribe el nombre'); return; }
    const id = createCompany(name);
    switchCompany(id);
    ctx.refreshShell?.();
    toast('Empresa creada: ' + name);
    setTimeout(() => location.reload(), 400);
  });

  return { root, refresh() {} };
}

/* ================= CLIENTES ================= */
export function customersView(ctx) {
  const root = el(`<div class="panel">
      <div class="panel-head"><h2>Clientes</h2>
        <span style="font-size:12.5px;color:var(--muted)" id="cnt"></span>
        <div class="sp"></div>
        <button class="btn sm" id="new">+ Cliente</button></div>
      <div style="overflow:auto"><table>
        <thead><tr><th>Cliente</th><th>Teléfono</th><th>Crédito</th><th>Saldo</th><th style="width:190px"></th></tr></thead>
        <tbody id="rows"></tbody></table></div>
    </div>`);

  function render() {
    const rows = $('#rows', root);
    $('#cnt', root).textContent = state.customers.length + ' clientes';
    if (!state.customers.length) {
      rows.innerHTML = `<tr><td colspan="5"><div class="cart-empty"><div class="big">👤</div>Aún no hay clientes.</div></td></tr>`;
      return;
    }
    rows.innerHTML = state.customers.map((c) => `
      <tr>
        <td><div class="t-strong">${esc(c.name)}</div><div style="font-size:11.5px;color:var(--muted)">${esc(c.email || '')}</div></td>
        <td>${esc(c.phone || '-')}</td>
        <td class="mono">${money(c.creditLimit || 0)}</td>
        <td class="mono t-strong" style="color:${(c.balance || 0) > 0 ? 'var(--danger)' : 'var(--text)'}">${money(c.balance || 0)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn ghost sm" data-pay="${c.id}" style="height:30px">Abonar</button>
          <button class="btn ghost sm" data-edit="${c.id}" style="height:30px">Editar</button>
        </td>
      </tr>`).join('');

    rows.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(b.dataset.edit));
    rows.querySelectorAll('[data-pay]').forEach((b) => b.onclick = () => pay(b.dataset.pay));
  }

  function edit(id) {
    const c = id ? state.customers.find((x) => x.id === id) : null;
    const m = modal({
      title: c ? 'Editar cliente' : 'Nuevo cliente',
      body: `
        <div class="field"><label>Nombre</label><input id="c-n" value="${esc(c?.name || '')}"></div>
        <div class="row2">
          <div class="field"><label>Teléfono</label><input id="c-p" value="${esc(c?.phone || '')}"></div>
          <div class="field"><label>Email</label><input id="c-e" value="${esc(c?.email || '')}"></div>
        </div>
        <div class="field"><label>Límite de crédito</label><input id="c-l" type="number" min="0" step="0.01" value="${c?.creditLimit || 0}"></div>`,
      foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Guardar</button>`,
    });
    m.root.querySelector('#ok').onclick = () => {
      const name = m.root.querySelector('#c-n').value.trim();
      if (!name) { toast('Falta el nombre'); return; }
      upsertCustomer({
        id: c?.id, name,
        phone: m.root.querySelector('#c-p').value.trim(),
        email: m.root.querySelector('#c-e').value.trim(),
        creditLimit: Number(m.root.querySelector('#c-l').value) || 0,
      });
      m.close(); render();
    };
  }

  function pay(id) {
    const c = state.customers.find((x) => x.id === id);
    const m = modal({
      title: 'Abonar a ' + c.name,
      body: `<div class="field"><label>Monto</label><input id="a" type="number" min="0" step="0.01" placeholder="0.00"></div>
             <div style="font-size:12px;color:var(--muted)">Saldo actual: ${money(c.balance || 0)}</div>`,
      foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Abonar</button>`,
    });
    m.root.querySelector('#ok').onclick = () => {
      const v = Number(m.root.querySelector('#a').value) || 0;
      if (v <= 0) { toast('Monto inválido'); return; }
      c.balance = Math.max(0, (c.balance || 0) - v);
      emit(); m.close(); render(); toast('Abono registrado');
    };
  }

  render();
  return { root, refresh: render };
}

/* ================= USUARIOS ================= */
export function usersView() {
  const root = el(`<div class="panel">
      <div class="panel-head"><h2>Usuarios y permisos</h2>
        <span style="font-size:12.5px;color:var(--muted)" id="cnt"></span>
        <div class="sp"></div>
        <button class="btn sm" id="new">+ Usuario</button></div>
      <div style="overflow:auto"><table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Puesto</th><th>Pago</th><th>Comisión</th><th>PIN</th><th>Estado</th><th style="width:170px"></th></tr></thead>
        <tbody id="rows"></tbody></table></div>
    </div>`);

  function render() {
    const rows = $('#rows', root);
    $('#cnt', root).textContent = state.users.length + ' usuarios';
    rows.innerHTML = state.users.map((u) => {
      const perms = ROLES[u.role]?.perms || [];
      const count = perms.includes('*') ? 'Todos' : perms.length + ' permisos';
      return `<tr>
        <td class="t-strong">${esc(u.name)}</td>
        <td>${esc(u.email)}</td>
        <td><span class="badge info">${esc(ROLES[u.role]?.label || u.role)}</span></td>
        <td>${esc(u.jobTitle || '—')}</td>
        <td class="mono">${u.payType === 'DAILY' ? money(u.payRate) + '/día' : money(u.payRate) + '/h'}</td>
        <td class="mono">${u.commissionPct ? u.commissionPct + '%' : '—'}</td>
        <td class="mono">${(u.commissionPct || 0) ? u.commissionPct + '%' : '—'}</td>
        <td class="mono">${esc(u.pin || '—')}</td>
        <td>${u.active ? '<span class="badge ok">Activo</span>' : '<span class="badge grey">Inactivo</span>'}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn ghost sm" data-edit="${u.id}" style="height:30px">Editar</button>
          <button class="btn ghost sm" data-tog="${u.id}" style="height:30px">${u.active ? 'Desactivar' : 'Activar'}</button>
        </td>
      </tr>`;
    }).join('');

    rows.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => edit(b.dataset.edit));
    rows.querySelectorAll('[data-tog]').forEach((b) => b.onclick = () => {
      const u = state.users.find((x) => x.id === b.dataset.tog);
      if (u.role === 'OWNER') { toast('El propietario no se puede desactivar'); return; }
      u.active = !u.active; emit(); render();
    });
  }

  function edit(id) {
    const u = id ? state.users.find((x) => x.id === id) : null;
    const m = modal({
      title: u ? 'Editar usuario' : 'Nuevo usuario',
      body: `
        <div class="row2">
          <div class="field"><label>Nombre</label><input id="u-n" value="${esc(u?.name || '')}"></div>
          <div class="field"><label>Correo</label><input id="u-e" type="email" value="${esc(u?.email || '')}"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Contraseña</label><input id="u-p" value="${esc(u?.pass || '')}"></div>
          <div class="field"><label>PIN checador</label><input id="u-pin" value="${esc(u?.pin || '')}" placeholder="4 dígitos"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Puesto</label><input id="u-job" value="${esc(u?.jobTitle || '')}" placeholder="Vendedor"></div>
          <div class="field"><label>Foto del empleado</label>
            <input id="u-photo" type="file" accept="image/*">
            <div id="u-photo-prev" style="margin-top:6px">${u?.photoUrl ? `<img src="${u.photoUrl}" style="width:54px;height:54px;border-radius:12px;object-fit:cover">` : ''}</div>
          </div>
        </div>
          <div class="field"><label>Rol</label>
            <select id="u-r">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${u?.role === k ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
          </div>
        </div>
        <div class="row2">
          <div class="field"><label>Tipo de pago</label>
            <select id="u-pt"><option value="HOURLY" ${u?.payType !== 'DAILY' ? 'selected' : ''}>Por hora</option><option value="DAILY" ${u?.payType === 'DAILY' ? 'selected' : ''}>Por día</option></select>
          </div>
          <div class="field"><label>Tarifa (MXN)</label><input id="u-pr" type="number" min="0" step="0.01" value="${u?.payRate ?? 60}"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Comisión por venta (%)</label><input id="u-comm" type="number" min="0" max="100" step="0.5" value="${u?.commissionPct ?? 0}"></div>
          <div class="field"><label>Teléfono</label><input id="u-phone" value="${esc(u?.personalData?.phone || '')}"></div>
        </div>
        <div class="row2">
          <div class="field"><label>CURP / RFC</label><input id="u-curp" value="${esc(u?.personalData?.curp || '')}" placeholder="Opcional"></div>
          <div class="field"><label>Dirección</label><input id="u-addr" value="${esc(u?.personalData?.address || '')}" placeholder="Opcional"></div>
        </div>
        <div class="field"><label>Documentos (INE, contrato, comprobante…)</label>
          <input id="u-doc" type="file" accept="image/*,.pdf">
          <div id="u-docs" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
            ${(u?.docs || []).map((d) => `<span class="doc-chip" data-doc="${d.id}">${esc(d.name)} <b>✕</b></span>`).join('')}
          </div>
        </div>
        <div class="field"><label>Huella / Face ID del dispositivo</label>
          <button class="btn ghost sm" id="u-bio" type="button" style="width:100%">
            ${u?.webauthn ? '✅ Registrada · registrar de nuevo' : '🖐 Registrar huella en este dispositivo'}
          </button>
          <div style="font-size:11px;color:var(--muted);margin-top:5px">Se guarda solo en este dispositivo. Sirve para que entre al checador con su huella.</div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px" id="u-perms"></div>`,
      foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Guardar</button>`,
    });
    let pendingPhoto = u?.photoUrl || null;
    m.root.querySelector('#u-photo').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const r = await readImageCompressed(f, 260, 0.7);
        pendingPhoto = r.dataUrl;
        m.root.querySelector('#u-photo-prev').innerHTML = '<img src="' + r.dataUrl + '" style="width:54px;height:54px;border-radius:12px;object-fit:cover">';
        toast('Foto lista · ' + Math.round(r.bytes / 1024) + ' KB');
      } catch (err) { toast(err.message); }
    };

    // Documentos del empleado
    const docInput = m.root.querySelector('#u-doc');
    if (docInput) docInput.onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 3 * 1024 * 1024) { toast('El archivo debe pesar menos de 3 MB'); return; }
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      if (!u) { toast('Primero guarda el empleado'); return; }
      addUserDoc(u.id, { name: f.name, type: f.type, dataUrl });
      m.close();
      toast('Documento agregado');
    };
    m.root.querySelectorAll('[data-doc]').forEach((b) => b.onclick = () => {
      if (!u) return;
      removeUserDoc(u.id, b.dataset.doc);
      m.close();
      toast('Documento eliminado');
    });

    // Huella
    const bioBtn = m.root.querySelector('#u-bio');
    if (bioBtn) bioBtn.onclick = async () => {
      if (!u) { toast('Primero guarda el empleado, luego registra su huella'); return; }
      try {
        const cred = await enrollBiometric(u);
        setUserCredential(u.id, cred);
        bioBtn.textContent = '✅ Registrada · registrar de nuevo';
        toast('Huella registrada en este dispositivo');
      } catch (err) {
        toast(err.message || 'No se pudo registrar la huella');
      }
    };
    const sel = m.root.querySelector('#u-r');
    const showPerms = () => {
      const p = ROLES[sel.value].perms;
      m.root.querySelector('#u-perms').textContent = p.includes('*')
        ? 'Acceso total (propietario)'
        : 'Permisos: ' + p.map((k) => PERMS[k] || k).join(' · ');
    };
    sel.onchange = showPerms; showPerms();

    m.root.querySelector('#ok').onclick = () => {
      const name = m.root.querySelector('#u-n').value.trim();
      const email = m.root.querySelector('#u-e').value.trim();
      const pass = m.root.querySelector('#u-p').value.trim();
      if (!name || !email || !pass) { toast('Completa nombre, correo y contraseña'); return; }
      if (u) {
        Object.assign(u, {
          name, email, pass, role: sel.value,
          pin: m.root.querySelector('#u-pin').value.trim(),
          jobTitle: m.root.querySelector('#u-job').value.trim(),
          payType: m.root.querySelector('#u-pt').value,
          payRate: Number(m.root.querySelector('#u-pr').value) || 0,
          commissionPct: Number(m.root.querySelector('#u-comm').value) || 0,
          personalData: {
            phone: m.root.querySelector('#u-phone').value.trim(),
            curp: m.root.querySelector('#u-curp').value.trim(),
            address: m.root.querySelector('#u-addr').value.trim(),
          },
          photoUrl: pendingPhoto,
        });
      } else {
        state.users.push({
          id: 'u' + Date.now(), name, email, pass, role: sel.value, active: true,
          pin: m.root.querySelector('#u-pin').value.trim(),
          jobTitle: m.root.querySelector('#u-job').value.trim(),
          payType: m.root.querySelector('#u-pt').value,
          payRate: Number(m.root.querySelector('#u-pr').value) || 0,
          commissionPct: Number(m.root.querySelector('#u-comm').value) || 0,
          personalData: {
            phone: m.root.querySelector('#u-phone').value.trim(),
            curp: m.root.querySelector('#u-curp').value.trim(),
            address: m.root.querySelector('#u-addr').value.trim(),
          },
          photoUrl: pendingPhoto,
        });
      }
      emit(); m.close(); render();
    };
  }

  render();
  return { root, refresh: render };
}
/* ================= APARTADOS ================= */
export function layawaysView(ctx) {
  const root = el(`<div class="panel">
      <div class="panel-head"><h2>Apartados</h2><span style="font-size:12.5px;color:var(--muted)" id="cnt"></span></div>
      <div style="overflow:auto"><table>
        <thead><tr><th>Código</th><th>Cliente</th><th>Items</th><th>Total</th><th>Abonado</th><th>Restante</th><th>Estado</th><th></th></tr></thead>
        <tbody id="rows"></tbody></table></div>
    </div>`);

  function render() {
    const rows = $('#rows', root);
    $('#cnt', root).textContent = state.layaways.length + ' apartados';
    if (!state.layaways.length) {
      rows.innerHTML = `<tr><td colspan="8"><div class="cart-empty"><div class="big">⏱</div>Aún no hay apartados.</div></td></tr>`;
      return;
    }
    rows.innerHTML = state.layaways.map((l) => `
      <tr>
        <td class="t-strong mono">${esc(l.code)}</td>
        <td>${esc(l.customerName)}</td>
        <td>${l.items.reduce((a, i) => a + i.qty, 0)}</td>
        <td class="mono">${money(l.total)}</td>
        <td class="mono">${money(l.paid)}</td>
        <td class="mono t-strong" style="color:var(--danger)">${money(Math.max(0, l.total - l.paid))}</td>
        <td>${l.status === 'done' ? '<span class="badge ok">Liquidado</span>' : l.status === 'cancelled' ? '<span class="badge danger">Cancelado</span>' : '<span class="badge warn">Activo</span>'}</td>
        <td style="text-align:right;white-space:nowrap">
          ${l.status === 'active' ? `<button class="btn ghost sm" data-pay="${l.id}" style="height:30px">Abonar</button>
          <button class="btn ghost sm" data-can="${l.id}" style="height:30px;color:var(--danger)">Cancelar</button>` : ''}
        </td>
      </tr>`).join('');

    rows.querySelectorAll('[data-pay]').forEach((b) => b.onclick = () => {
      const l = state.layaways.find((x) => x.id === b.dataset.pay);
      const restante = Math.max(0, l.total - l.paid);
      const m = modal({
        title: 'Abonar ' + l.code,
        body: `<div class="field"><label>Monto</label><input id="a" type="number" min="0" step="0.01" value="${restante}"></div>
               <div style="font-size:12px;color:var(--muted)">Restante: ${money(restante)}</div>`,
        foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Abonar</button>`,
      });
      m.root.querySelector('#ok').onclick = () => {
        const v = Number(m.root.querySelector('#a').value) || 0;
        if (v <= 0) { toast('Monto inválido'); return; }
        layawayPayment(l.id, Math.min(v, restante));
        m.close(); render();
      };
    });
    rows.querySelectorAll('[data-can]').forEach((b) => b.onclick = async () => {
      const ok = await confirmDialog({ title: 'Cancelar apartado', message: 'Se repondrá el stock.', okText: 'Cancelar', danger: true });
      if (ok) { cancelLayaway(b.dataset.can); render(); }
    });
  }

  render();
  return { root, refresh: render };
}

/* ================= CUPONES ================= */
export function couponsView() {
  const root = el(`<div class="panel">
      <div class="panel-head"><h2>Cupones</h2><span style="font-size:12.5px;color:var(--muted)" id="cnt"></span>
        <div class="sp"></div><button class="btn sm" id="new">+ Cupón</button></div>
      <div style="overflow:auto"><table>
        <thead><tr><th>Código</th><th>Tipo</th><th>Valor</th><th>Vence</th><th>Estado</th><th></th></tr></thead>
        <tbody id="rows"></tbody></table></div>
    </div>`);

  function render() {
    const rows = $('#rows', root);
    $('#cnt', root).textContent = state.coupons.length + ' cupones';
    if (!state.coupons.length) {
      rows.innerHTML = `<tr><td colspan="6"><div class="cart-empty"><div class="big">🎟</div>Aún no hay cupones.</div></td></tr>`;
      return;
    }
    rows.innerHTML = state.coupons.map((c) => `
      <tr>
        <td class="t-strong mono">${esc(c.code)}</td>
        <td>${c.type === 'PERCENT' ? 'Porcentaje' : 'Monto fijo'}</td>
        <td class="mono">${c.type === 'PERCENT' ? c.value + '%' : money(c.value)}</td>
        <td>${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-MX') : '—'}</td>
        <td>${c.active ? '<span class="badge ok">Activo</span>' : '<span class="badge grey">Inactivo</span>'}</td>
        <td style="text-align:right">
          <button class="btn ghost sm" data-tog="${c.id}" style="height:30px">${c.active ? 'Desactivar' : 'Activar'}</button>
        </td>
      </tr>`).join('');

    rows.querySelectorAll('[data-tog]').forEach((b) => b.onclick = () => {
      const c = state.coupons.find((x) => x.id === b.dataset.tog);
      c.active = !c.active; emit(); render();
    });
  }

  $('#new', root).onclick = () => {
    const m = modal({
      title: 'Nuevo cupón',
      body: `
        <div class="row2">
          <div class="field"><label>Código</label><input id="c-code" placeholder="VERANO10"></div>
          <div class="field"><label>Tipo</label>
            <select id="c-type"><option value="PERCENT">% descuento</option><option value="FIXED">Monto fijo</option></select></div>
        </div>
        <div class="field"><label>Valor</label><input id="c-val" type="number" min="0" step="0.01"></div>`,
      foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Guardar</button>`,
    });
    m.root.querySelector('#ok').onclick = () => {
      const code = m.root.querySelector('#c-code').value.trim();
      const val = Number(m.root.querySelector('#c-val').value) || 0;
      if (!code || val <= 0) { toast('Falta código o valor'); return; }
      upsertCoupon({ code, type: m.root.querySelector('#c-type').value, value: val });
      m.close(); render();
    };
  };

  render();
  return { root, refresh: render };
}

/* ================= FINANZAS ================= */
export function financeView(ctx) {
  const root = el(`<div id="fin"></div>`);
  let range = 'month';

  function bounds() {
    const now = new Date();
    if (range === 'day') { const d = new Date(now); d.setHours(0, 0, 0, 0); return [d, now]; }
    if (range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return [d, now]; }
    if (range === 'year') { const d = new Date(now.getFullYear(), 0, 1); return [d, now]; }
    const d = new Date(now.getFullYear(), now.getMonth(), 1); return [d, now];
  }

  function saleProfit(s) {
    const unit = (s.items || []).reduce((a, i) => {
      const prod = i.productId ? state.products.find((p) => p.id === i.productId) : null;
      return a + (i.price - (prod?.cost || 0)) * i.qty;
    }, 0);
    return unit - (s.discount || 0);
  }

  function render() {
    const [from, to] = bounds();
    const inR = (d) => { const x = new Date(d); return x >= from && x <= to; };
    const sales = state.sales.filter((s) => s.status === 'done' && inR(s.date));
    const ventas = sales.reduce((a, s) => a + s.total, 0);
    const utilidad = sales.reduce((a, s) => a + saleProfit(s), 0);
    const dias = Math.max(1, Math.round((to - from) / 86400000) + (range === 'day' ? 1 : 0));
    const gastosFijosMes = fixedMonthlyTotal();
    const gastosDelPeriodo = gastosFijosMes * (dias / 30)
      + state.expenses.filter((e) => !e.recurring && e.paid && inR(e.date)).reduce((a, e) => a + e.amount, 0);
    const margen = ventas > 0 ? (utilidad / ventas) * 100 : 0;
    const resultado = utilidad - gastosDelPeriodo;

    // serie para tendencia
    const buckets = [];
    const n = range === 'day' ? 8 : range === 'week' ? 7 : range === 'year' ? 12 : 6;
    for (let i = n - 1; i >= 0; i--) {
      let a, b, label;
      if (range === 'day') {
        const h = new Date(to); h.setMinutes(0, 0, 0); h.setHours(h.getHours() - i);
        a = new Date(h); b = new Date(h.getTime() + 3599999);
        label = pad(h.getHours());
      } else if (range === 'week') {
        const d = new Date(to); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        a = d; b = new Date(d.getTime() + 86399999);
        label = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()];
      } else if (range === 'year') {
        a = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        b = new Date(a.getFullYear(), a.getMonth() + 1, 0, 23, 59, 59);
        label = a.toLocaleDateString('es-MX', { month: 'short' }).slice(0, 3);
      } else {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
        a = d; b = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        label = d.toLocaleDateString('es-MX', { month: 'short' }).slice(0, 3);
      }
      const total = state.sales.filter((s) => s.status === 'done' && new Date(s.date) >= a && new Date(s.date) <= b).reduce((x, s) => x + s.total, 0);
      buckets.push({ label, total });
    }
    const max = Math.max(1, ...buckets.map((x) => x.total));

    const fixed = state.expenses.filter((e) => e.recurring);
    const personalOn = !state.settings || state.settings.personalEnabled !== false;
    const personal = personalSummary(from.toISOString(), to.toISOString());

    root.innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="l">Ventas</div><div class="v">${money(ventas)}</div><div class="s">${sales.length} tickets</div></div>
        <div class="kpi"><div class="l">Utilidad</div><div class="v" style="color:var(--ok)">${money(utilidad)}</div><div class="s">precio − costo</div></div>
        <div class="kpi"><div class="l">Gastos</div><div class="v">${money(gastosDelPeriodo)}</div><div class="s">fijos prorrateados + pagados</div></div>
        <div class="kpi"><div class="l">Margen</div><div class="v">${margen.toFixed(1)}%</div><div class="s" style="color:${resultado >= 0 ? 'var(--ok)' : 'var(--danger)'}">Resultado: ${money(resultado)}</div></div>
      </div>

      <div class="panel" style="margin-top:14px">
        <div class="panel-head"><h2>Estadísticas</h2>
          <div class="seg" id="fin-range" style="margin:0 0 0 12px">
            <button class="${range === 'day' ? 'on' : ''}" data-r="day">Día</button>
            <button class="${range === 'week' ? 'on' : ''}" data-r="week">Semana</button>
            <button class="${range === 'month' ? 'on' : ''}" data-r="month">Mes</button>
            <button class="${range === 'year' ? 'on' : ''}" data-r="year">Año</button>
          </div>
          <div class="sp"></div>
          <button class="btn sm" id="ex-new">+ Gasto</button>
        </div>
        <div style="padding:16px 18px">
          <div class="fin-bars">
            ${buckets.map((b) => `<div class="fin-bar"><i style="height:${Math.max(3, (b.total / max) * 100)}%"></i><span>${b.label}</span></div>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;margin-top:14px">
        <div class="panel">
          <div class="panel-head"><h2>Gastos fijos</h2>
            <button class="btn ghost sm" id="fx-new" style="margin-left:auto">+ Fijo</button></div>
          <div style="padding:8px 18px 14px">
            ${fixed.length ? fixed.map((e) => `
              <div class="row-kv" style="padding:8px 0;border-bottom:1px solid var(--line-2)">
                <span>${esc(e.name)} <small style="color:var(--muted)">· ${e.freq || 'mensual'}</small></span>
                <b class="mono">${money(expenseMonthly(e))}/mes</b>
              </div>`).join('') : '<div style="color:var(--muted);font-size:13px">Sin gastos fijos.</div>'}
            <div class="row-kv" style="padding-top:10px"><span><b>Total mensual</b></span><b class="mono">${money(gastosFijosMes)}</b></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Finanzas personales</h2>
            <label style="margin-left:auto;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)">
              <input type="checkbox" id="pers-on" ${personalOn ? 'checked' : ''}> activas
            </label></div>
          <div style="padding:10px 18px 16px">
            ${personalOn ? `
              <div class="row-kv"><span>Ingresos</span><b class="mono" style="color:var(--ok)">${money(personal.ingresos)}</b></div>
              <div class="row-kv"><span>Gastos</span><b class="mono" style="color:var(--danger)">${money(personal.gastos)}</b></div>
              <div class="row-kv"><span><b>Balance</b></span><b class="mono">${money(personal.balance)}</b></div>
              <div class="row-kv"><span style="font-size:11.5px;color:var(--muted)">Efectivo ${money(personal.efectivo)} · Tarjeta ${money(personal.tarjeta)}</span><span></span></div>
              <div style="margin-top:10px">
                <div style="font-size:11px;letter-spacing:.6px;color:var(--muted);font-weight:800;margin-bottom:4px">META DE AHORRO AL MES <span style="font-weight:600;text-transform:none;letter-spacing:0">(opcional)</span></div>
                <div style="display:flex;gap:6px">
                  <input id="sg" type="number" min="0" step="50" value="${state.settings?.savingGoal || 0}"
                    style="flex:1;height:36px;border:1px solid var(--line);border-radius:9px;padding:0 10px;font-size:13px">
                  <button class="btn sm" id="sg-save">Guardar</button>
                </div>
                <div style="font-size:10.5px;color:var(--muted);margin-top:5px;line-height:1.4">
                  Si la dejas en 0 no se descuenta nada: solo se reparte tu ingreso entre los días.
                </div>
              </div>
              <button class="btn sm" id="pers-open" style="width:100%;margin-top:10px">📱 Abrir app de finanzas</button>
            ` : '<div style="color:var(--muted);font-size:13px">Desactivadas. Actívalas para verlas junto al negocio.</div>'}
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:14px">
        <div class="panel-head"><h2>Gastos del negocio</h2>
          <button class="btn ghost sm" id="ex-exp" style="margin-left:auto">⬇ Excel</button></div>
        <div style="overflow:auto"><table>
          <thead><tr><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Tipo</th><th>Estado</th><th></th></tr></thead>
          <tbody>${state.expenses.length ? state.expenses.map((e) => `
            <tr><td class="t-strong">${esc(e.name)}</td><td class="mono">${money(e.amount)}</td>
            <td>${new Date(e.date).toLocaleDateString('es-MX')}</td>
            <td>${e.recurring ? '<span class="badge info">Fijo</span>' : 'Variable'}</td>
            <td>${e.paid ? '<span class="badge ok">Pagado</span>' : '<span class="badge warn">Pendiente</span>'}</td>
            <td>${e.paid ? '' : `<button class="btn ghost sm" data-pay="${e.id}" style="height:28px">Pagar</button>`}</td></tr>`).join('')
            : `<tr><td colspan="6"><div class="cart-empty">Sin gastos.</div></td></tr>`}</tbody></table></div>
      </div>`;

    root.querySelectorAll('#fin-range button').forEach((b) => b.onclick = () => { range = b.dataset.r; render(); });
    root.querySelectorAll('[data-pay]').forEach((b) => b.onclick = () => { payExpense(b.dataset.pay); render(); });
    root.querySelector('#ex-exp').onclick = () => { const n = exportExpenses(); toast(n + ' gastos exportados'); };
    root.querySelector('#pers-on').onchange = (e) => { state.settings.personalEnabled = e.target.checked; emit(); render(); };
    root.querySelector('#pers-open')?.addEventListener('click', () => window.open('/finanzas.html', '_blank'));
    root.querySelector('#sg-save')?.addEventListener('click', () => {
      const v = setSavingGoal(root.querySelector('#sg').value);
      toast('Meta de ahorro: ' + money(v) + ' al mes');
      render();
    });

    root.querySelector('#ex-new').onclick = () => {
      const m = modal({
        title: 'Nuevo gasto',
        body: `<div class="field"><label>Concepto</label><input id="x-n" placeholder="Renta, luz, proveedor…"></div>
               <div class="field"><label>Monto</label><input id="x-a" type="number" min="0" step="0.01"></div>`,
        foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Guardar</button>`,
      });
      m.root.querySelector('#ok').onclick = () => {
        const name = m.root.querySelector('#x-n').value.trim();
        const amount = Number(m.root.querySelector('#x-a').value) || 0;
        if (!name || amount <= 0) { toast('Falta concepto o monto'); return; }
        upsertExpense({ name, amount });
        m.close(); render();
      };
    };

    root.querySelector('#fx-new').onclick = () => {
      const m = modal({
        title: 'Gasto fijo',
        body: `<div class="field"><label>Concepto</label><input id="fx-n" placeholder="Renta, internet, nómina…"></div>
               <div class="row2">
                 <div class="field"><label>Monto</label><input id="fx-a" type="number" min="0" step="0.01"></div>
                 <div class="field"><label>Frecuencia</label>
                   <select id="fx-f"><option value="mensual">Mensual</option><option value="semanal">Semanal</option><option value="anual">Anual</option></select></div>
               </div>`,
        foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Guardar</button>`,
      });
      m.root.querySelector('#ok').onclick = () => {
        const name = m.root.querySelector('#fx-n').value.trim();
        const amount = Number(m.root.querySelector('#fx-a').value) || 0;
        if (!name || amount <= 0) { toast('Falta concepto o monto'); return; }
        upsertExpense({ name, amount, recurring: true, freq: m.root.querySelector('#fx-f').value });
        m.close(); render();
      };
    };
  }

  render();
  return { root, refresh: render };
}
export function timeClockView(ctx) {
  const root = el(`<div id="tc"></div>`);
  let pin = '';
  let who = null;
  let stream = null;
  let camPending = null;

  const clock = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  async function startCam() {
    if (camPending) return camPending;
    const v = root.querySelector('#tc-video');
    if (!v) return false;
    if (stream) {
      // Re-engancha la cámara al video nuevo (tras un re-render)
      if (v.srcObject !== stream) { v.srcObject = stream; v.play().catch(() => {}); }
      root.querySelector('#tc-cam-empty')?.remove();
      root.querySelector('#tc-cam-btn')?.classList.add('on');
      return true;
    }
    camPending = (async () => {
    try {
      stream = registerCam(await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }));
      v.srcObject = stream;
      v.play();
      root.querySelector('#tc-cam-empty')?.remove();
      root.querySelector('#tc-cam-btn')?.classList.add('on');
      const st = root.querySelector('#tc-cam-state');
      if (st) st.textContent = 'Foto al checar';
      return true;
    } catch {
      stream = null;
      const badge = root.querySelector('#tc-cam-state');
      if (badge) badge.textContent = 'Cámara no disponible';
      return false;
    } finally { camPending = null; }
    })();
    return camPending;
  }
  function stopCam() {
    if (stream) { dropCam(stream); stream = null; }
    stopAllCams();
    const v = root.querySelector('#tc-video');
    if (v) v.srcObject = null;
    const box = root.querySelector('.tc-cam');
    if (box && !box.querySelector('#tc-cam-empty')) {
      const ph = document.createElement('div');
      ph.id = 'tc-cam-empty';
      ph.className = 'tc-cam-empty';
      ph.innerHTML = '📷<span>Cámara apagada</span>';
      box.insertBefore(ph, box.querySelector('#tc-cam-state'));
    }
    root.querySelector('#tc-cam-btn')?.classList.remove('on');
  }
  function toggleCam() { if (stream) stopCam(); else startCam(); }

  // Botón de cámara (delegado: sobrevive a los re-render)
  root.addEventListener('click', (e) => {
    if (e.target.closest?.('#tc-cam-btn')) toggleCam();
  });
  function render() {
    const rows = state.users.filter((u) => u.active).map((u) => ({ u, s: dayStats(u.id) }));

    root.innerHTML = `
      <div class="tc-wrap">
        <div class="tc-left">
          <div class="tc-clock">
            <div class="tc-time">${clock()}</div>
            <div class="tc-date">${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>

          <div class="tc-cam">
            <video id="tc-video" playsinline muted></video>
            <div id="tc-cam-empty" class="tc-cam-empty">📷<span>Cámara apagada</span></div>
            <div id="tc-cam-state" class="tc-cam-state">Foto al checar</div>
            <button id="tc-cam-btn" class="tc-cam-btn" title="Encender o apagar la cámara">⏻</button>
          </div>

          ${!who ? `
            <div class="tc-pin">
              <div class="tc-pin-lbl">INGRESA TU PIN</div>
              <div class="tc-pin-dots">${[0, 1, 2, 3].map((i) => `<span class="${pin.length > i ? 'on' : ''}"></span>`).join('')}</div>
              <div class="keypad" id="tckp">
                ${['1','2','3','4','5','6','7','8','9','C','0','✓'].map((k) => `<button class="key" data-k="${k}">${k}</button>`).join('')}
              </div>
            </div>` : `
            <div class="tc-emp">
              <div style="display:flex;align-items:center;gap:10px">
                ${who.photoUrl ? `<img src="${who.photoUrl}" class="tc-emp-photo">` : `<div class="tc-emp-photo ph">${esc(who.name.slice(0,1))}</div>`}
                <div>
                  <div class="tc-emp-name">${esc(who.name)}</div>
                  <div class="tc-emp-job">${esc(who.jobTitle || '')} · ${who.payType === 'DAILY' ? money(who.payRate) + '/día' : money(who.payRate) + '/hora'}</div>
                </div>
              </div>
              <div class="tc-actions">
                <button class="tc-act green" data-t="ENTRY">⏵ Entrada</button>
                <button class="tc-act orange" data-t="BREAK_START">☕ Descanso</button>
                <button class="tc-act blue" data-t="BREAK_END">⏵ Fin descanso</button>
                <button class="tc-act red" data-t="EXIT">⏹ Salida</button>
              </div>
              ${who.webauthn ? `<button class="btn sm" id="tc-bio" style="width:100%;margin-top:10px">🖐 Registrar entrada con huella</button>` : ''}
              ${state.settings.checkPhotoRequired !== false ? '<div style="font-size:11px;color:var(--muted);margin-top:8px;text-align:center">📷 La foto es obligatoria</div>' : ''}
              ${state.settings.externalClock ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;text-align:center">Reloj externo: ${esc(state.settings.externalClock)}</div>` : ''}
              <button class="btn ghost sm" id="tc-cancel" style="margin-top:12px">Cambiar empleado</button>
            </div>`}
        </div>

        <div class="tc-right">
          <div class="panel">
            <div class="panel-head"><h2>Hoy</h2></div>
            <div style="overflow:auto"><table>
              <thead><tr><th>Empleado</th><th>Entrada</th><th>Descanso</th><th>Salida</th><th>Horas</th><th>Pago</th></tr></thead>
              <tbody>${rows.map(({ u, s }) => `
                <tr>
                  <td><div style="display:flex;align-items:center;gap:8px">
                    ${u.photoUrl ? `<img src="${u.photoUrl}" class="tc-mini">` : `<div class="tc-mini ph">${esc(u.name.slice(0,1))}</div>`}
                    <div><b>${esc(u.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(u.jobTitle || '')}</div></div>
                  </div></td>
                  <td>${s.entry ? new Date(s.entry.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>${s.breakMin ? hhmm(s.breakMin) : '—'}</td>
                  <td>${s.exit ? new Date(s.exit.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : (s.working ? '<span class="badge ok">En turno</span>' : '—')}</td>
                  <td class="mono">${hhmm(s.minutes)}</td>
                  <td class="mono">${money(payFor(u, s.minutes))}</td>
                </tr>`).join('')}</tbody></table></div>
          </div>

          <div class="panel" style="margin-top:14px">
            <div class="panel-head"><h2>Últimos registros</h2></div>
            <div style="padding:8px 18px 14px;display:flex;gap:10px;flex-wrap:wrap">
              ${state.timeRecords.slice(-6).reverse().map((r) => `
                <div class="tc-rec">
                  ${r.photo ? `<img src="${r.photo}">` : '<div class="nofoto">—</div>'}
                  <div class="tc-rec-t"><b>${esc(r.userName)}</b><span>${TIME_TYPES[r.type]} · ${new Date(r.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span></div>
                </div>`).join('') || '<div style="color:var(--muted);font-size:13px">Sin registros aún.</div>'}
            </div>
          </div>
        </div>
      </div>`;

    startCam();

    root.querySelectorAll('#tckp .key').forEach((b) => b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'C') { pin = ''; render(); return; }
      if (k === '✓') { submit(); return; }
      if (pin.length < 4) pin += k;
      if (pin.length === 4) submit(); else render();
    });

    if (who) {
      root.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => {
        const v = root.querySelector('#tc-video');
        const photo = v && v.videoWidth ? captureVideoFrame(v, 320, 0.55) : null;
        if (state.settings.checkPhotoRequired !== false && !photo) {
          toast('Activa la cámara: la foto es obligatoria para checar');
          return;
        }
        timeAction(who.id, b.dataset.t, photo);
        toast(TIME_TYPES[b.dataset.t] + ' · ' + who.name + (photo ? ' (con foto)' : ''));
        render();
      });
      root.querySelector('#tc-cancel').onclick = () => { who = null; pin = ''; render(); };

      const bio = root.querySelector('#tc-bio');
      if (bio) bio.onclick = async () => {
        try {
          const ok = await verifyBiometric(who);
          if (!ok) return;
          const v = root.querySelector('#tc-video');
          const photo = v && v.videoWidth ? captureVideoFrame(v, 320, 0.55) : null;
          timeAction(who.id, 'ENTRY', photo);
          toast('Entrada registrada con huella · ' + who.name);
          render();
        } catch (e) {
          toast(e.message || 'No se pudo verificar la huella');
        }
      };
    }

    // Si la cámara sigue encendida, se re-engancha al video nuevo del re-render
    if (stream) startCam();
  }

  function submit() {
    const u = state.users.find((x) => String(x.pin) === pin && x.active);
    if (!u) { toast('PIN incorrecto'); pin = ''; render(); return; }
    who = u; pin = '';
    render();
  }

  render();
  const timer = setInterval(() => {
    const t = root.querySelector('.tc-time');
    if (t) t.textContent = clock();
  }, 1000);
  return { root, refresh: render, destroy: () => { clearInterval(timer); stopCam(); } };
}

/* ================= NÓMINA ================= */
export function payrollView() {
  const root = el(`<div id="payroll"></div>`);
  let range = 'week';

  function bounds() {
    const now = new Date();
    if (range === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return [d, now];
    }
    if (range === 'fortnight') {
      const d = new Date(now); d.setDate(d.getDate() - 14);
      return [d, now];
    }
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return [d, now];
  }

  function render() {
    const [from, to] = bounds();
    const data = payroll(from.toISOString(), to.toISOString());
    const totalPay = data.reduce((a, r) => a + r.pay, 0);
    const totalMin = data.reduce((a, r) => a + r.minutes, 0);

    root.innerHTML = `
      <div class="panel">
        <div class="panel-head"><h2>Nómina</h2>
          <div class="seg" id="pr-range" style="margin:0 0 0 14px">
            <button class="${range === 'week' ? 'on' : ''}" data-r="week">7 días</button>
            <button class="${range === 'fortnight' ? 'on' : ''}" data-r="fortnight">Quincena</button>
            <button class="${range === 'month' ? 'on' : ''}" data-r="month">Mes</button>
          </div>
          <div class="sp"></div>
          <button class="btn ghost sm" id="pr-excel">⬇ Excel</button>
          <button class="btn ghost sm" id="pr-print">Imprimir</button>
        </div>
        <div style="padding:10px 18px 0;color:var(--muted);font-size:12.5px" id="pr-range-lbl"></div>
        <div style="overflow:auto"><table>
          <thead><tr><th>Empleado</th><th>Días</th><th>Horas</th><th>Tarifa</th><th>Sueldo</th><th>Comisión</th><th>Total</th></tr></thead>
          <tbody>${data.map((r) => {
            const st = sellerStats(r.user.id, from.toISOString(), to.toISOString());
            return `
            <tr>
              <td><div style="display:flex;align-items:center;gap:8px">
                ${r.user.photoUrl ? `<img src="${r.user.photoUrl}" class="tc-mini">` : `<div class="tc-mini ph">${esc(r.user.name.slice(0,1))}</div>`}
                <div><b>${esc(r.user.name)}</b><div style="font-size:11px;color:var(--muted)">${esc(r.user.jobTitle || '')}${r.user.commissionPct ? ' · ' + r.user.commissionPct + '% comisión' : ''}</div></div>
              </div></td>
              <td>${r.days}</td>
              <td class="mono">${hhmm(r.minutes)}</td>
              <td class="mono">${r.user.payType === 'DAILY' ? money(r.user.payRate) + '/d' : money(r.user.payRate) + '/h'}</td>
              <td class="mono">${money(r.pay)}</td>
              <td class="mono" style="color:var(--brand-700)">${money(st.comision)}</td>
              <td class="mono t-strong">${money(r.pay + st.comision)}</td>
            </tr>`;
          }).join('')}
            <tr style="background:var(--surface-2)">
              <td colspan="2"><b>Total</b></td><td class="mono"><b>${hhmm(totalMin)}</b></td><td></td>
              <td class="mono"><b>${money(totalPay)}</b></td>
              <td class="mono"><b>${money(data.reduce((a, r) => a + sellerStats(r.user.id, from.toISOString(), to.toISOString()).comision, 0))}</b></td>
              <td class="mono"><b>${money(totalPay + data.reduce((a, r) => a + sellerStats(r.user.id, from.toISOString(), to.toISOString()).comision, 0))}</b></td>
            </tr>
          </tbody></table></div>
      </div>`;

    const fmt = (d) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    root.querySelector('#pr-range-lbl').textContent = fmt(from) + ' al ' + fmt(to);
    root.querySelectorAll('#pr-range button').forEach((b) => b.onclick = () => { range = b.dataset.r; render(); });
    root.querySelector('#pr-print').onclick = () => window.print();
    root.querySelector('#pr-excel').onclick = () => {
      const n = exportPayroll(data, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
      toast(n + ' empleados exportados a Excel');
    };
  }

  render();
  return { root, refresh: render };
}
