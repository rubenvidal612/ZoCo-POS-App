// Compras: proveedores, órdenes de compra con recepción parcial y cuentas por pagar.
import { $, el, money, esc, toast, modal, confirmDialog, readImageCompressed } from './ui.js';
import {
  state, productById, sizesFor, fmtSize, variantsOf, totalStock,
  supplierById, upsertSupplier, deleteSupplier,
  createPurchase, receivePurchase, payPurchase, cancelPurchase, payables,
} from './store.js';

const ROLE_LABEL = { ordered: 'Pedida', partial: 'Recibida parcial', received: 'Recibida', cancelled: 'Cancelada' };
const STATUS_CLASS = { ordered: 'po-ordered', partial: 'po-partial', received: 'po-ok', cancelled: 'po-cancel' };

export function purchasesView(ctx) {
  const root = el(`<div class="purchv"></div>`);
  let tab = 'ordenes';

  const render = () => {
    root.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Compras</h1>
          <p class="muted">Proveedores, órdenes con recepción parcial y cuentas por pagar.</p>
        </div>
        <div class="page-actions">
          ${tab === 'ordenes' ? '<button class="btn" id="po-new">+ Nueva compra</button>' : ''}
          ${tab === 'proveedores' ? '<button class="btn" id="sp-new">+ Nuevo proveedor</button>' : ''}
          ${tab === 'pagar' ? '<button class="btn ghost" id="pay-refresh">Actualizar</button>' : ''}
        </div>
      </div>
      <div class="tabs" id="po-tabs">
        <button data-tab="ordenes" class="${tab === 'ordenes' ? 'on' : ''}">Órdenes</button>
        <button data-tab="proveedores" class="${tab === 'proveedores' ? 'on' : ''}">Proveedores</button>
        <button data-tab="pagar" class="${tab === 'pagar' ? 'on' : ''}">Por pagar</button>
      </div>
      <div id="po-body"></div>`;

    root.querySelectorAll('#po-tabs button').forEach((b) => {
      b.onclick = () => { tab = b.dataset.tab; render(); };
    });
    root.querySelector('#po-new') && (root.querySelector('#po-new').onclick = () => openPurchase(null));
    root.querySelector('#sp-new') && (root.querySelector('#sp-new').onclick = () => openSupplier(null));
    root.querySelector('#pay-refresh') && (root.querySelector('#pay-refresh').onclick = () => render());

    if (tab === 'ordenes') paintOrders();
    if (tab === 'proveedores') paintSuppliers();
    if (tab === 'pagar') paintPayables();
  };

  /* ---------------- Órdenes ---------------- */
  const paintOrders = () => {
    const body = root.querySelector('#po-body');
    const list = state.purchases || [];
    if (!list.length) {
      body.innerHTML = `<div class="empty"><div class="empty-ico">📦</div>
        <h3>Sin compras registradas</h3>
        <p>Crea una orden para pedir mercancía a un proveedor. Puedes recibirla por partes.</p></div>`;
      return;
    }
    body.innerHTML = `<div class="po-list">${list.map((po) => {
      const sp = supplierById(po.supplierId);
      const due = Number(po.total || 0) - Number(po.paid || 0);
      const pend = po.items.reduce((a, i) => a + (Number(i.qty) - Number(i.received || 0)), 0);
      return `<div class="po-row">
        <div class="po-main">
          <div class="po-folio">${esc(po.folio)} <span class="po-tag ${STATUS_CLASS[po.status] || ''}">${ROLE_LABEL[po.status] || po.status}</span></div>
          <div class="po-sub">${esc(sp?.name || 'Sin proveedor')} · ${new Date(po.date).toLocaleDateString('es-MX')} · ${po.items.length} artículo(s)</div>
          ${pend > 0 && po.status !== 'cancelled' ? `<div class="po-sub">Pendiente de recibir: <b>${pend}</b></div>` : ''}
        </div>
        <div class="po-money">
          <div><b>${money(po.total)}</b></div>
          <div class="po-sub">${due > 0.004 ? 'Debe ' + money(due) : 'Pagada'}</div>
        </div>
        <div class="po-actions">
          ${po.status === 'ordered' || po.status === 'partial' ? `<button class="btn sm" data-rec="${po.id}">Recibir</button>` : ''}
          ${due > 0.004 && po.status !== 'cancelled' ? `<button class="btn ghost sm" data-pay="${po.id}">Pagar</button>` : ''}
          <button class="btn ghost sm" data-view="${po.id}">Ver</button>
        </div>
      </div>`;
    }).join('')}</div>`;

    body.querySelectorAll('[data-rec]').forEach((b) => (b.onclick = () => openReceive(b.dataset.rec)));
    body.querySelectorAll('[data-pay]').forEach((b) => (b.onclick = () => openPay(b.dataset.pay)));
    body.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => openDetail(b.dataset.view)));
  };

  /* ---------------- Proveedores ---------------- */
  const paintSuppliers = () => {
    const body = root.querySelector('#po-body');
    const list = state.suppliers || [];
    if (!list.length) {
      body.innerHTML = `<div class="empty"><div class="empty-ico">🏭</div>
        <h3>Sin proveedores</h3><p>Agrega a quién le compras para llevar sus cuentas.</p></div>`;
      return;
    }
    body.innerHTML = `<div class="po-list">${list.map((s) => {
      const deuda = (state.purchases || [])
        .filter((po) => po.supplierId === s.id && po.status !== 'cancelled')
        .reduce((a, po) => a + Math.max(0, Number(po.total || 0) - Number(po.paid || 0)), 0);
      return `<div class="po-row">
        <div class="po-main">
          <div class="po-folio">${esc(s.name || '(sin nombre)')}</div>
          <div class="po-sub">${esc(s.phone || 'sin teléfono')}${s.rfc ? ' · RFC ' + esc(s.rfc) : ''}</div>
        </div>
        <div class="po-money">${deuda > 0.004 ? '<b style="color:var(--danger)">' + money(deuda) + '</b><div class="po-sub">por pagar</div>' : '<span class="po-sub">sin deuda</span>'}</div>
        <div class="po-actions">
          <button class="btn ghost sm" data-edit="${s.id}">Editar</button>
          <button class="btn ghost sm" data-del="${s.id}">Borrar</button>
        </div>
      </div>`;
    }).join('')}</div>`;
    body.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => openSupplier(b.dataset.edit)));
    body.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      const ok = await confirmDialog({ title: 'Borrar proveedor', message: 'Sus compras se conservan.', okText: 'Borrar', danger: true });
      if (ok) { deleteSupplier(b.dataset.del); render(); }
    }));
  };

  /* ---------------- Cuentas por pagar ---------------- */
  const paintPayables = () => {
    const body = root.querySelector('#po-body');
    const { rows, credits, bySupplier, total, totalFavor } = payables();
    if (!rows.length && !credits.length) {
      body.innerHTML = `<div class="empty"><div class="empty-ico">✅</div>
        <h3>Nada por pagar</h3><p>Todas tus compras están pagadas.</p></div>`;
      return;
    }
    body.innerHTML = `
      ${rows.length ? `<div class="pay-total">
        <div class="po-sub">Total por pagar</div>
        <div style="font-size:26px;font-weight:900;color:var(--danger)">${money(total)}</div>
      </div>` : ''}
      ${totalFavor > 0.004 ? `<div class="pay-total" style="margin-top:10px;border-color:#6EE7B7">
        <div class="po-sub">Saldo a favor (te deben)</div>
        <div style="font-size:20px;font-weight:900;color:#059669">${money(totalFavor)}</div>
      </div>` : ''}
      ${bySupplier.length ? `<div class="po-list" style="margin-top:14px">
        <div class="pay-head">Por proveedor</div>
        ${bySupplier.map((s) => `<div class="po-row">
          <div class="po-main"><div class="po-folio">${esc(s.name)}</div>
            <div class="po-sub">${s.count} compra(s) con saldo</div></div>
          <div class="po-money"><b>${money(s.due)}</b></div>
        </div>`).join('')}
      </div>` : ''}
      ${rows.length ? `<div class="po-list" style="margin-top:14px">
        <div class="pay-head">Detalle</div>
        ${rows.map((r) => `<div class="po-row">
          <div class="po-main"><div class="po-folio">${esc(r.po.folio)}</div>
            <div class="po-sub">${esc(r.supplier)} · ${new Date(r.po.date).toLocaleDateString('es-MX')}</div></div>
          <div class="po-money"><b>${money(r.due)}</b><div class="po-sub">de ${money(r.po.total)}</div></div>
          <div class="po-actions"><button class="btn sm" data-pay="${r.po.id}">Pagar</button></div>
        </div>`).join('')}
      </div>` : ''}
      ${credits.length ? `<div class="po-list" style="margin-top:14px">
        <div class="pay-head">Compras pagadas de más (saldo a favor)</div>
        ${credits.map((c) => `<div class="po-row">
          <div class="po-main"><div class="po-folio">${esc(c.po.folio)}</div>
            <div class="po-sub">${esc(c.supplier)} · pagado ${money(c.po.paid)} de ${money(c.po.total)}</div></div>
          <div class="po-money"><b style="color:#059669">+${money(c.favor)}</b><div class="po-sub">a favor</div></div>
        </div>`).join('')}
      </div>` : ''}`;
    body.querySelectorAll('[data-pay]').forEach((b) => (b.onclick = () => openPay(b.dataset.pay)));
  };

  /* ---------------- Modal: nueva compra ---------------- */
  const openPurchase = () => {
    const suppliers = state.suppliers || [];
    const products = (state.products || []).filter((p) => p.active !== false);
    const lines = [];

    const m = modal({
      title: 'Nueva compra',
      wide: true,
      body: `
        <div class="field"><label>Proveedor</label>
          <select id="po-sp"><option value="">— sin proveedor —</option>
          ${suppliers.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
          ${suppliers.length ? '' : '<div class="hint">Aún no tienes proveedores. Puedes guardarla sin proveedor.</div>'}</div>
        <div class="row2">
          <div class="field"><label>Producto</label><select id="po-prod">
            <option value="">— elegir —</option>
            ${products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Variante</label><select id="po-var"><option value="">—</option></select></div>
        </div>
        <div class="row2">
          <div class="field"><label>Cantidad</label><input id="po-qty" type="number" min="1" step="1" value="1"></div>
          <div class="field"><label>Costo unitario</label><input id="po-cost" type="number" min="0" step="0.01" placeholder="0.00"></div>
        </div>
        <button class="btn ghost sm" id="po-add" style="width:100%">+ Agregar a la orden</button>
        <div id="po-lines" style="margin-top:12px"></div>
        <div class="field" style="margin-top:12px"><label>Nota (opcional)</label><input id="po-note" placeholder="Ej. pedido por WhatsApp"></div>
        <div class="field" style="margin-top:12px"><label>Foto de la compra (opcional)</label>
          <input id="po-img" type="file" accept="image/*">
          <div id="po-img-prev" style="margin-top:8px"></div>
          <div class="hint">Se comprime automáticamente (máx 900px y ~90 KB).</div></div>`,
      foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="po-save">Guardar orden</button>`,
    });
    const r = m.root;
    const paintLines = () => {
      const box = r.querySelector('#po-lines');
      if (!lines.length) { box.innerHTML = '<div class="hint">Sin artículos todavía.</div>'; return; }
      const total = lines.reduce((a, l) => a + l.qty * l.cost, 0);
      box.innerHTML = lines.map((l, i) => {
        const p = productById(l.productId);
        return `<div class="po-line">
          <div style="flex:1"><b>${esc(p?.name || '—')}</b>${l.vkey ? ' · ' + esc(l.vkey) : ''}
            <div class="po-sub">${l.qty} × ${money(l.cost)}</div></div>
          <div><b>${money(l.qty * l.cost)}</b></div>
          <button class="btn ghost sm" data-rmline="${i}">✕</button>
        </div>`;
      }).join('') + `<div class="po-line"><div style="flex:1"><b>Total</b></div><div><b>${money(total)}</b></div><div></div></div>`;
      box.querySelectorAll('[data-rmline]').forEach((b) => (b.onclick = () => { lines.splice(Number(b.dataset.rmline), 1); paintLines(); }));
    };
    r.querySelector('#po-prod').onchange = () => {
      const p = productById(r.querySelector('#po-prod').value);
      const sel = r.querySelector('#po-var');
      if (!p) { sel.innerHTML = '<option value="">—</option>'; return; }
      const vars = variantsOf(p);
      const withStock = vars;
      sel.innerHTML = '<option value="">— todas —</option>' + withStock.map((v) => `<option value="${esc(v.key)}">${esc(v.key)}</option>`).join('');
      if (p.cost) r.querySelector('#po-cost').value = p.cost;
    };
    r.querySelector('#po-add').onclick = () => {
      const productId = r.querySelector('#po-prod').value;
      if (!productId) { toast('Elige un producto'); return; }
      const qty = Math.max(1, Math.round(Number(r.querySelector('#po-qty').value) || 1));
      const cost = Math.max(0, Number(r.querySelector('#po-cost').value) || 0);
      const vkey = r.querySelector('#po-var').value || '';
      lines.push({ productId, vkey, qty, cost });
      paintLines();
    };
    let poPhoto = null;
    r.querySelector('#po-img').onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const img = await readImageCompressed(f);
        poPhoto = img.dataUrl;
        r.querySelector('#po-img-prev').innerHTML =
          `<img src="${img.dataUrl}" style="width:96px;height:96px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">
           <div class="hint">${Math.round(img.bytes / 1024)} KB · ${img.width}×${img.height}</div>`;
      } catch (err) { toast(err.message); }
    };
    r.querySelector('#po-save').onclick = () => {
      if (!lines.length) { toast('Agrega al menos un artículo'); return; }
      const res = createPurchase({
        supplierId: r.querySelector('#po-sp').value || null,
        items: lines,
        note: r.querySelector('#po-note').value,
        photo: poPhoto,
      });
      if (!res.ok) { toast(res.msg || 'No se pudo crear'); return; }
      toast('Orden ' + res.purchase.folio + ' creada');
      m.close(); render();
    };
    paintLines();
  };

  /* ---------------- Modal: recibir ---------------- */
  const openReceive = (id) => {
    const po = (state.purchases || []).find((x) => x.id === id);
    if (!po) return;
    const m = modal({
      title: 'Recibir ' + po.folio,
      wide: true,
      body: `<div class="hint" style="margin-bottom:10px">Puedes recibir todo o solo una parte. Lo recibido entra al inventario de la sucursal actual.</div>
        <div id="rec-list"></div>`,
      foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="rec-save">Guardar recepción</button>`,
    });
    const r = m.root;
    r.querySelector('#rec-list').innerHTML = po.items.map((it, i) => {
      const p = productById(it.productId);
      const pend = Number(it.qty) - Number(it.received || 0);
      return `<div class="po-row" style="align-items:center">
        <div class="po-main"><div class="po-folio">${esc(p?.name || '—')}${it.vkey ? ' · ' + esc(it.vkey) : ''}</div>
          <div class="po-sub">Pedido ${it.qty} · recibido ${it.received || 0} · <b>pendiente ${pend}</b></div></div>
        <input data-recv="${i}" type="number" min="0" max="${pend}" step="1" value="${pend > 0 ? pend : 0}"
          style="width:90px;height:34px;text-align:center;border:1px solid var(--line);border-radius:8px;font-weight:700" ${pend <= 0 ? 'disabled' : ''}>
      </div>`;
    }).join('');
    r.querySelector('#rec-save').onclick = () => {
      const receipts = [];
      r.querySelectorAll('[data-recv]').forEach((inp) => {
        const it = po.items[Number(inp.dataset.recv)];
        const qty = Number(inp.value) || 0;
        if (qty > 0) receipts.push({ productId: it.productId, vkey: it.vkey, qty });
      });
      if (!receipts.length) { toast('No hay cantidades por recibir'); return; }
      const res = receivePurchase(po.id, receipts);
      if (!res.ok) { toast(res.msg || 'No se pudo recibir'); return; }
      toast(res.status === 'received' ? 'Compra recibida completa ✓' : 'Recepción parcial guardada');
      m.close(); render(); ctx.refreshShell?.();
    };
  };

  /* ---------------- Modal: pagar ---------------- */
  const openPay = (id) => {
    const po = (state.purchases || []).find((x) => x.id === id);
    if (!po) return;
    const due = Number(po.total || 0) - Number(po.paid || 0);
    const m = modal({
      title: 'Pagar ' + po.folio,
      body: `<div class="po-sub" style="margin-bottom:10px">Total ${money(po.total)} · pagado ${money(po.paid)} · <b>debe ${money(due)}</b></div>
        <div class="field"><label>Monto a pagar</label><input id="pay-amt" type="number" min="0" step="0.01" value="${due > 0 ? due.toFixed(2) : ''}"></div>
        <div class="field"><label>Nota (opcional)</label><input id="pay-note" placeholder="Ej. transferencia"></div>`,
      foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="pay-do">Registrar pago</button>`,
    });
    const r = m.root;
    r.querySelector('#pay-do').onclick = () => {
      const amt = Number(r.querySelector('#pay-amt').value) || 0;
      const res = payPurchase(po.id, amt, r.querySelector('#pay-note').value);
      if (!res.ok) { toast(res.msg || 'No se pudo pagar'); return; }
      toast(res.favor > 0 ? 'Pago registrado · saldo a favor ' + money(res.favor) : 'Pago registrado ✓');
      m.close(); render();
    };
  };

  /* ---------------- Modal: detalle ---------------- */
  const openDetail = (id) => {
    const po = (state.purchases || []).find((x) => x.id === id);
    if (!po) return;
    const sp = supplierById(po.supplierId);
    const m = modal({
      title: 'Orden ' + po.folio,
      wide: true,
      body: `<div class="po-sub" style="margin-bottom:10px">${esc(sp?.name || 'Sin proveedor')} · ${new Date(po.date).toLocaleDateString('es-MX')} · ${ROLE_LABEL[po.status] || po.status}</div>
        <div class="po-list">${po.items.map((it) => {
          const p = productById(it.productId);
          return `<div class="po-row"><div class="po-main">
            <div class="po-folio">${esc(p?.name || '—')}${it.vkey ? ' · ' + esc(it.vkey) : ''}</div>
            <div class="po-sub">Pedido ${it.qty} · recibido ${it.received || 0}</div></div>
            <div class="po-money">${money(Number(it.qty) * Number(it.cost))}<div class="po-sub">${money(it.cost)} c/u</div></div></div>`;
        }).join('')}</div>
        <div class="po-row" style="margin-top:10px"><div class="po-main"><b>Total</b></div><div class="po-money"><b>${money(po.total)}</b></div></div>
        <div class="po-row"><div class="po-main">Pagado</div><div class="po-money">${money(po.paid)}</div></div>
        <div class="po-row"><div class="po-main"><b>Saldo</b></div><div class="po-money"><b>${money(Number(po.total) - Number(po.paid))}</b></div></div>
        ${po.note ? `<div class="hint" style="margin-top:10px">Nota: ${esc(po.note)}</div>` : ''}
        ${po.photo ? `<div style="margin-top:12px">
          <div class="po-sub" style="margin-bottom:6px">Foto de la compra</div>
          <img src="${esc(po.photo)}" style="width:100%;max-width:320px;border-radius:12px;border:1px solid var(--line)">
        </div>` : ''}`,
      foot: `${po.status === 'ordered' || po.status === 'partial' ? '<button class="btn ghost" id="dt-cancel">Cancelar orden</button>' : ''}
        <button class="btn" data-close>Cerrar</button>`,
    });
    const c = m.root.querySelector('#dt-cancel');
    if (c) c.onclick = async () => {
      const ok = await confirmDialog({ title: 'Cancelar orden', message: 'Dejará de contar en cuentas por pagar.', okText: 'Cancelar orden', danger: true });
      if (!ok) return;
      const res = cancelPurchase(po.id);
      if (!res.ok) { toast(res.msg || 'No se pudo cancelar'); return; }
      toast('Orden cancelada'); m.close(); render();
    };
  };

  /* ---------------- Modal: proveedor ---------------- */
  const openSupplier = (id) => {
    const s = id ? supplierById(id) : null;
    const m = modal({
      title: s ? 'Editar proveedor' : 'Nuevo proveedor',
      body: `<div class="field"><label>Nombre</label><input id="sp-name" value="${esc(s?.name || '')}" placeholder="Ej. Distribuidora del Centro"></div>
        <div class="row2">
          <div class="field"><label>Teléfono</label><input id="sp-phone" value="${esc(s?.phone || '')}" placeholder="555 555 5555"></div>
          <div class="field"><label>RFC</label><input id="sp-rfc" value="${esc(s?.rfc || '')}" placeholder="Opcional"></div>
        </div>
        <div class="field"><label>Notas</label><input id="sp-notes" value="${esc(s?.notes || '')}" placeholder="Días de entrega, contacto…"></div>`,
      foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn" id="sp-save">Guardar</button>`,
    });
    const r = m.root;
    r.querySelector('#sp-save').onclick = () => {
      const name = r.querySelector('#sp-name').value.trim();
      if (!name) { toast('Falta el nombre'); return; }
      upsertSupplier({
        id: s?.id, name,
        phone: r.querySelector('#sp-phone').value.trim(),
        rfc: r.querySelector('#sp-rfc').value.trim(),
        notes: r.querySelector('#sp-notes').value.trim(),
      });
      toast('Proveedor guardado');
      m.close(); render();
    };
  };

  render();
  return { root, refresh: render };
}
