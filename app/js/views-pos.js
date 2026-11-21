// Flujo de venta ZoCo: Vender → Carrito → Pago → Efectivo → Éxito
import { $, el, money, esc, toast, modal, confirmDialog, readImageCompressed } from './ui.js';
import {
  state, sectionsForMode, sizesFor, stockOf, totalStock, productById,
  cartTotals, addLine, commitSale, sectionOf, fmtSize, can, createLayaway, applyCoupon,
  unitOf, isFractional, fmtQty, unitStep, round3, UNITS, variantsOf, variantKey, findByBarcode, upsertProduct,
} from './store.js';
import { printTicket, ticketText } from './printer.js';
import { lookupBarcode, LOOKUP_CREDIT } from './lookup.js';

const isMobile = () => window.matchMedia('(max-width: 900px)').matches;


// Convierte "Negro", "Rosa", "#0EA5E9"… en un degradado válido
const COLOR_MAP = {
  negro: '#1F2937', blanco: '#E5E7EB', rojo: '#DC2626', rosa: '#EC4899', azul: '#2563EB',
  verde: '#059669', amarillo: '#F59E0B', naranja: '#EA580C', cafe: '#92400E', 'café': '#92400E',
  marron: '#92400E', 'marrón': '#92400E', beige: '#D6C7B0', gris: '#6B7280', miel: '#B45309',
  morado: '#7C3AED', vino: '#7F1D1D', coral: '#FB7185', plateado: '#94A3B8', dorado: '#CA8A04',
  crema: '#F3E8D6', camel: '#B98A5A', hueso: '#EFE6D8', chocolate: '#5B3A1E', tabaco: '#8A5A2B',
};
function colorGradient(color) {
  const raw = String(color || '').trim();
  let base = '#64748B';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) base = raw;
  else if (/^rgb/i.test(raw)) base = raw;
  else if (COLOR_MAP[raw.toLowerCase()]) base = COLOR_MAP[raw.toLowerCase()];
  else if (raw) {
    // color por nombre desconocido → tono estable derivado del texto
    let h = 0;
    for (const ch of raw) h = (h * 31 + ch.charCodeAt(0)) % 360;
    base = `hsl(${h} 45% 45%)`;
  }
  return `linear-gradient(150deg, ${base}, ${base}cc)`;
}
export function posView(ctx) {
  const { cart } = ctx;
  let screen = 'sell';           // sell | cart | pay | cash | success
  let filter = '';
  let section = 'all';
  let method = 'cash';
  let received = 0;
  let cashInput = '';
  let cashAmountSuggested = false;
  let fiscalMode = 'interno';
  let lastSale = null;

  const root = el(`<div class="posv" id="posv"></div>`);
  const box = root;

  ctx.posApi = {
    addByCode(code) {
      const q = String(code).trim().toLowerCase();
      // 1) Código de la variante (talla / talla+color): cae exacto en el ticket
      const hit = findByBarcode(code);
      if (hit?.vkey) {
        const { product, vkey } = hit;
        const parts = String(vkey).split('|');
        const size = parts[0];
        const color = parts[1] || '';
        if (stockOf(product, vkey, state.currentBranch) <= 0
            && Number(product?.branchStock?.[state.currentBranch]?.[vkey] || 0) <= 0) {
          toast('Sin stock en ' + vkey);
          return false;
        }
        add(product, size, color);
        return true;
      }
      // 2) Código o nombre del producto
      const p = hit?.product || state.products.find((x) => (x.code || '').toLowerCase() === q || (x.name || '').toLowerCase() === q);
      if (!p) {
        // No está en el catálogo: se busca en las bases abiertas y se ofrece crearlo
        openQuickCreate(code);
        return false;
      }
      const sizes = sizesFor(p.section);
      if (sizes.length === 1) { add(p, sizes[0]); }
      else {
        const avail = sizes.find((s) => stockOf(p, s) > 0);
        if (!avail && avail !== 0) { toast('Sin stock'); return false; }
        add(p, avail);
      }
      return true;
    },
  };

  /* ---------------- Registrar producto escaneando ---------------- */
  const canAddInventory = () => can('products.edit') && can('stock.manage');
  const openQuickCreate = (code) => {
    if (!canAddInventory()) { toast('Producto no registrado'); return; }
    const secs = sectionsForMode();
    const m = modal({
      title: 'Registrar producto',
      wide: true,
      body: `<div id="qc-body"><div class="hint" style="padding:8px 0">Buscando <b>${esc(code)}</b>…</div></div>`,
      foot: `<button class="btn ghost" data-close>Cancelar</button>
             <button class="btn" id="qc-save" disabled>Guardar y agregar</button>`,
    });
    const body = m.root.querySelector('#qc-body');
    const saveBtn = m.root.querySelector('#qc-save');
    let foto = '';
    let buscado = null;

    const paint = (info) => {
      const hay = info?.found;
      const nombre = (info?.name || '').replace(/"/g, '&quot;');
      body.innerHTML = `
        <div class="qc-found">
          <div class="qc-thumb">${info?.image
            ? `<img src="${esc(info.image)}" alt="">`
            : `<span>${hay ? '?' : '!'}</span>`}</div>
          <div style="flex:1;min-width:0">
            <span class="qc-tag ${hay ? (info.image ? 'ok' : 'warn') : 'no'}">
              ${hay ? (info.image ? 'Encontrado' : 'Sin foto') : 'No encontrado'}
            </span>
            <div class="qc-name">${hay ? esc(info.name) : 'Captúralo tú'}</div>
            <div class="qc-sub">${hay
              ? esc([info.brand, info.category].filter(Boolean).join(' · ') || 'Sin marca')
              : 'Código nuevo para este negocio'}</div>
            ${hay ? `<div class="qc-credit">${esc(LOOKUP_CREDIT)}</div>` : ''}
          </div>
        </div>
        ${hay && !info.image ? `<div class="qc-noimg"><b>Este producto no trae fotografía</b>
          <span>Tómale una ahora y queda en tu catálogo</span></div>` : ''}
        <div class="field" style="margin-top:12px"><label>Nombre</label>
          <input id="qc-name" value="${nombre}" placeholder="Ej. Zapato escolar negro"></div>
        <div class="row2">
          <div class="field"><label>Sección</label>
            <select id="qc-sec">${secs.map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Se vende por</label>
            <select id="qc-unit">${Object.entries(UNITS).map(([k, u]) => `<option value="${k}">${esc(u.label)}</option>`).join('')}</select></div>
        </div>
        <div class="row2">
          <div class="field"><label>Costo</label><input id="qc-cost" type="number" step="0.01" placeholder="0.00"></div>
          <div class="field"><label>Precio</label><input id="qc-price" type="number" step="0.01" placeholder="0.00"></div>
        </div>
        <div class="row2">
          <div class="field"><label>Existencia</label><input id="qc-qty" type="number" step="1" value="1"></div>
          <div class="field"><label>Foto (opcional)</label><input id="qc-img" type="file" accept="image/*"></div>
        </div>
        <div id="qc-prev" style="margin-top:8px"></div>`;

      body.querySelector('#qc-img').onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const r = await readImageCompressed(f);
          foto = r.dataUrl;
          body.querySelector('#qc-prev').innerHTML =
            `<img src="${r.dataUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:12px;border:1px solid var(--line)">
             <div class="hint">${Math.round(r.bytes / 1024)} KB · ${r.width}×${r.height}</div>`;
        } catch (err) { toast(err.message); }
      };
      saveBtn.disabled = false;
      const nom = body.querySelector('#qc-name');
      nom.focus();
      nom.select();
    };

    lookupBarcode(code).then((info) => { buscado = info; paint(info); })
      .catch(() => { buscado = { found: false }; paint(buscado); });

    saveBtn.onclick = () => {
      if (!canAddInventory()) return;
      const name = (body.querySelector('#qc-name').value || '').trim();
      const price = Number(body.querySelector('#qc-price').value) || 0;
      const cost = Number(body.querySelector('#qc-cost').value) || 0;
      const qty = Math.max(0, Number(body.querySelector('#qc-qty').value) || 0);
      const section = body.querySelector('#qc-sec').value;
      if (!name) { toast('Escribe el nombre del producto'); return; }
      if (price <= 0) { toast('Falta el precio'); return; }
      // Anti-duplicado: si el código ya existe, no se crea otro
      const ya = findByBarcode(code);
      if (ya?.product) {
        toast('Ese código ya existe: ' + ya.product.name);
        m.close();
        return;
      }
      const sizes = sizesFor(section);
      const talla = fmtSize(sizes[0]);
      const stock = {};
      if (qty > 0) stock[talla] = qty;
      const branchStock = { [state.currentBranch]: stock };
      upsertProduct({
        name, code: String(code).trim(), price, cost, section,
        sellBy: body.querySelector('#qc-unit').value || 'pza',
        colors: [], branchStock,
        image: foto || (buscado?.image || ''),
        catalog: true,
      });
      const nuevo = state.products.find((x) => String(x.code) === String(code).trim());
      m.close();
      if (nuevo) { add(nuevo, sizes[0]); toast('Producto agregado: ' + name); }
      render();
    };
  };

  /* ---------------- SELL ---------------- */
  function renderSell() {
    const t = cartTotals(cart);
    box.className = 'posv';
    box.innerHTML = `
      <div class="sell-wrap">
        <div class="sell-tools">
          <div class="search"><span>🔍</span>
            <input id="pos-q" placeholder="Buscar producto…" autocomplete="off">
            <span class="k">F2</span></div>
          <button class="icon-btn" id="btn-scan" title="Escáner (F4)">⌗</button>
          <button class="qr-btn" id="btn-quick"><span>⚡</span> VENTA RÁPIDA</button>
          <button class="icon-btn" id="btn-new" title="Nuevo producto">＋</button>
        </div>
        <div class="cats" id="cats"></div>
        <div class="grid-wrap"><div class="pgrid sq" id="pgrid"></div></div>
        ${cart.lines.length ? `
          <div class="cart-bar" id="cart-bar">
            <div class="cb-left"><span class="cb-count">${t.count}</span>
              <div><div class="cb-lbl">TOTAL</div><div class="cb-total">${money(t.total)}</div></div></div>
            <button class="cb-btn" id="go-cart">VER CARRITO</button>
          </div>` : ''}
      </div>`;

    const q = $('#pos-q', box);
    q.value = filter;
    q.addEventListener('input', () => { filter = q.value.trim().toLowerCase(); renderGrid(); });
    $('#btn-quick', box).onclick = openQuickSale;
    $('#btn-scan', box).onclick = async () => {
      // En celular abre la cámara; en PC deja lista la pistola
      if (window.innerWidth <= 900) {
        const { scanWithCameraSoft } = await import('./scanner.js');
        const code = await scanWithCameraSoft();
        if (code) { ctx.posApi?.addByCode(code); toast('Código: ' + code); }
        return;
      }
      q.focus();
      toast('Escáner listo — dispara el código');
    };
    $('#btn-new', box).onclick = () => ctx.go('productos', { create: true });
    $('#go-cart', box)?.addEventListener('click', () => { screen = 'cart'; render(); });

    renderCats(); renderGrid();
    if (isMobile()) return;
    setTimeout(() => q.focus(), 40);
  }

  function renderCats() {
    const cats = $('#cats', box);
    if (!cats) return;
    const list = sectionsForMode();
    cats.innerHTML = `<button class="cat ${section === 'all' ? 'on' : ''}" data-s="all">TODOS</button>` +
      list.map(([id, s]) => `<button class="cat ${section === id ? 'on' : ''}" data-s="${id}">${esc(s.label)}</button>`).join('');
    cats.querySelectorAll('.cat').forEach((b) => b.onclick = () => { section = b.dataset.s; renderCats(); renderGrid(); });
  }

  function renderGrid() {
    const grid = $('#pgrid', box);
    if (!grid) return;
    const items = state.products.filter((p) => {
      if (section !== 'all' && p.section !== section) return false;
      if (!filter) return true;
      const hay = (p.name + ' ' + p.code + ' ' + sectionOf(p).label).toLowerCase();
      return hay.includes(filter) || Object.keys(p.stock || {}).some((s) => s === filter && Number(p.stock[s]) > 0);
    });

    if (!items.length) {
      grid.innerHTML = `<div class="pcard-add" id="add-tile"><div class="plus">＋</div><div class="lbl">Agregar</div></div>`;
      $('#add-tile', grid).onclick = () => ctx.go('productos', { create: true });
      return;
    }
    grid.innerHTML = items.map((p) => {
      // con colores, la disponibilidad se calcula por variante (talla|color)
      const hasColors = (p.colors || []).length > 0;
      const avail = hasColors
        ? variantsOf(p).filter((v) => stockOf(p, v.key) > 0)
        : sizesFor(p.section).filter((s) => stockOf(p, s) > 0);
      const inCart = cart.lines.filter((l) => l.productId === p.id).reduce((a, l) => a + l.qty, 0);
      return `<button class="sq-card" data-id="${p.id}" ${avail.length ? '' : 'disabled'}>
        <div class="sq-ph" style="background:${colorGradient(p.color)}">
          ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : `<span>${esc(sectionOf(p).label.slice(0, 3).toUpperCase())}</span>`}
          ${inCart ? `<b class="sq-badge">${inCart}</b>` : ''}
        </div>
        <div class="sq-price">${p.discount?.on && Number(p.discount.value) > 0
          ? '<s style="opacity:.55;font-size:11px">' + money(p.price) + '</s> ' + money(Math.max(0, p.discount.type === 'amount' ? p.price - p.discount.value : p.price - (p.price * p.discount.value) / 100))
            + ' <span style="background:#DC2626;color:#fff;font-size:9px;font-weight:900;padding:1px 5px;border-radius:999px">' + (p.discount.type === 'amount' ? ('-' + '$' + p.discount.value) : (p.discount.value + '%')) + '</span>'
          : money(p.price)}</div>
        <div class="sq-name">${esc(p.name)}</div>
        ${avail.length ? '' : '<div class="sq-out">AGOTADO</div>'}
      </button>`;
    }).join('');
    grid.querySelectorAll('.sq-card').forEach((c) => c.onclick = () => pickSize(productById(c.dataset.id)));
  }

  /* ---------------- TALLA ---------------- */
  function pickSize(product) {
    if (!product) return;
    const sizes = sizesFor(product.section);
    if (sizes.length === 1) { add(product, sizes[0]); return; }
    const m = modal({
      title: 'Selecciona la talla',
      body: `
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">${esc(product.name)} · ${money(product.price)}</div>
        <div class="size-grid">
          ${sizes.map((s) => {
            const colors = (product.colors || []).filter(Boolean);
            const q = colors.length
              ? colors.reduce((a, c) => a + (Number(stockOf(product, variantKey(s, c))) || 0), 0)
              : Number(stockOf(product, s)) || 0;
            return `<div class="size-cell ${q > 0 ? 'has' : 'zero'}" data-s="${fmtSize(s)}">
              <div class="s">${fmtSize(s)}</div><div class="q">${q > 0 ? 'Stock: ' + fmtQty(q, unitOf(product)) : '—'}</div></div>`;
          }).join('')}
        </div>`,
      foot: `<button class="btn ghost sm" data-close>Cerrar</button>`,
    });
    m.root.querySelectorAll('.size-cell').forEach((c) => c.onclick = () => {
      const s = c.dataset.s;
      const colores = (product.colors || []).filter(Boolean);
      const disp = colores.length
        ? colores.reduce((a, cc) => a + (Number(stockOf(product, variantKey(s, cc))) || 0), 0)
        : Number(stockOf(product, s)) || 0;
      if (disp <= 0) { toast('Talla ' + s + ' sin stock'); return; }
      m.close();
      if (!colores.length) { add(product, s); return; }
      pickColor(product, s);
    });
  }

  /** Elige color cuando el producto maneja variantes por color */
  function pickColor(product, size) {
    const colors = (product.colors || []).filter(Boolean);
    const m = modal({
      title: product.name + ' · Talla ' + size,
      body: `<div class="hint" style="margin-bottom:10px">Elige el color</div>
        <div class="size-grid">
          ${colors.map((c) => {
            const n = stockOf(product, variantKey(size, c));
            return `<div class="size-cell ${n > 0 ? 'has' : 'zero'}" data-c="${esc(c)}">
              <div class="s">${esc(c)}</div><div class="q">${n > 0 ? 'Stock: ' + fmtQty(n, unitOf(product)) : '—'}</div></div>`;
          }).join('')}
        </div>`,
      foot: `<button class="btn ghost sm" data-close>Cerrar</button>`,
    });
    m.root.querySelectorAll('.size-cell').forEach((el) => el.onclick = () => {
      const c = el.dataset.c;
      if (stockOf(product, variantKey(size, c)) <= 0) { toast('Color ' + c + ' sin stock'); return; }
      m.close();
      add(product, size, c);
    });
  }

  function add(product, size, color = '') {
    if (isFractional(product)) { askQty(product, size, color); return; }
    const r = addLine(cart, product, size, 1, color);
    if (!r.ok) { toast(r.msg); return; }
    render();
  }

  /** Pide cantidad cuando el producto se vende por kg / L / ml / m */
  function askQty(product, size, color = '') {
    const unit = unitOf(product);
    const u = UNITS[unit] || UNITS.kg;
    const disponible = stockOf(product, size);
    const m = modal({
      title: product.name,
      body: `
        <div class="hint" style="margin-bottom:10px">
          Se vende por <b>${esc(u.label.toLowerCase())}</b> · precio ${money(product.price)} / ${esc(u.short)}
          ${disponible > 0 ? ` · disponible ${fmtQty(disponible, unit)}` : ''}
        </div>
        <div class="field"><label>Cantidad (${esc(u.short)})</label>
          <input id="q-amt" type="number" min="0" step="${u.step}" value="1"
            style="font-size:22px;font-weight:800;text-align:center;height:52px">
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">
          ${[0.25, 0.5, 1, 2, 5].map((v) => `<button class="btn ghost sm" data-q="${v}">${v} ${esc(u.short)}</button>`).join('')}
        </div>
        <div class="mx-out" style="margin-top:12px;text-align:center">
          <span style="font-size:12px;color:var(--muted)">Total</span>
          <div style="font-size:24px;font-weight:800" id="q-total">${money(product.price)}</div>
        </div>`,
      foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="q-add">Agregar</button>`,
    });
    const inp = m.root.querySelector('#q-amt');
    const total = m.root.querySelector('#q-total');
    const paint = () => { total.textContent = money((Number(inp.value) || 0) * product.price); };
    inp.oninput = paint;
    m.root.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { inp.value = b.dataset.q; paint(); });
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    m.root.querySelector('#q-add').onclick = () => {
      const qty = Number(inp.value) || 0;
      const r = addLine(cart, product, size, qty, color);
      if (!r.ok) { toast(r.msg); return; }
      m.close(); render();
    };
  }

  /* ---------------- CART ---------------- */
  function renderCart() {
    const t = cartTotals(cart);
    box.className = 'posv';
    box.innerHTML = `
      <div class="cart-screen">
        <header class="scr-head">
          <button class="back" id="back">←</button>
          <h2>Carrito (${t.count})</h2>
          <button class="dots" id="clear">⋯</button>
        </header>
        <div class="cart-body">
          ${cart.lines.length ? cart.lines.map((l) => `
            <div class="c-item">
              <div class="ci-top">
                <div class="ci-name">${esc(l.name)}${l.size !== 'Único' ? ` <span>(Talla ${esc(l.size)})</span>` : ''}</div>
                <div class="ci-price mono">${money(l.price * l.qty)}</div>
                <button class="ci-x" data-rm="${l.key}">✕</button>
              </div>
              <div class="ci-chips">
                <span class="chip">🏷 ${money(l.price)}</span>
                <span class="chip">${l.unit && l.unit !== 'pza' ? fmtQty(l.qty, l.unit) + ' × ' + money(l.price) : '# × ' + l.qty}</span>
                <span class="chip link" data-minus="${l.key}">−</span>
                <span class="chip link" data-plus="${l.key}">+</span>
                <span class="chip link" data-disc="${l.key}">Descuento</span>
              </div>
            </div>`).join('')
            : `<div class="cart-empty"><div class="big">🛒</div>Tu carrito está vacío.</div>`}
        </div>
        <footer class="cart-foot2">
          ${t.discount ? `<div class="row-kv"><span>Descuento</span><span class="mono">−${money(t.discount)}</span></div>` : ''}
          <div class="row-kv big"><span>Total:</span><span class="mono">${money(t.total)}</span></div>
          <div class="row-kv"><span></span><button class="link-disc" id="coupon">🎟 Aplicar cupón</button></div>
          <button class="btn orange" id="cobrar" ${cart.lines.length ? '' : 'disabled'}>Cobrar</button>
          <button class="btn ghost" id="apartar" ${cart.lines.length ? '' : 'disabled'}>Apartar</button>
        </footer>
      </div>`;

    $('#back', box).onclick = () => { screen = 'sell'; render(); };
    $('#clear', box).onclick = async () => {
      const ok = await confirmDialog({ title: 'Vaciar carrito', message: 'Se quitarán todos los artículos.', okText: 'Vaciar', danger: true });
      if (ok) { cart.lines = []; cart.discount = 0; render(); }
    };
    box.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => {
      cart.lines = cart.lines.filter((l) => l.key !== b.dataset.rm); render();
    });
    box.querySelectorAll('[data-plus]').forEach((b) => b.onclick = () => changeQty(b.dataset.plus, +1));
    box.querySelectorAll('[data-minus]').forEach((b) => b.onclick = () => changeQty(b.dataset.minus, -1));
    box.querySelectorAll('[data-disc]').forEach((b) => b.onclick = () => {
      if (!can('sales.discount')) { toast('No tienes permiso para descuentos'); return; }
      openDiscount();
    });
    $('#cobrar', box).onclick = () => { screen = 'pay'; render(); };
    $('#coupon', box).onclick = openCoupon;
    $('#apartar', box).onclick = openLayaway;
  }

  function changeQty(key, d) {
    const l = cart.lines.find((x) => x.key === key);
    if (!l) return;
    const p = l.productId ? productById(l.productId) : null;
    const step = p ? unitStep(p) : 1;
    const delta = d > 0 ? step : -step;
    if (d > 0 && p) {
      const avail = stockOf(p, l.size);
      if (round3(l.qty + delta) > round3(avail) + 1e-9) {
        toast('Sin más stock (' + fmtQty(avail, unitOf(p)) + ')');
        return;
      }
    }
    l.qty = round3(l.qty + delta);
    if (l.qty <= 0) cart.lines = cart.lines.filter((x) => x.key !== key);
    render();
  }

  function openDiscount() {
    const t = cartTotals(cart);
    const m = modal({
      title: 'Descuento',
      body: `<div class="field"><label>Monto</label><input id="d" type="number" min="0" step="0.01" value="${cart.discount || ''}" placeholder="0.00"></div>
             <div style="font-size:12px;color:var(--muted)">Subtotal ${money(t.subtotal)}</div>`,
      foot: `<button class="btn ghost sm" id="clear">Quitar</button><button class="btn sm" id="ok">Aplicar</button>`,
    });
    m.root.querySelector('#ok').onclick = () => {
      cart.discount = Math.max(0, Math.min(Number(m.root.querySelector('#d').value) || 0, t.subtotal));
      m.close(); render();
    };
    m.root.querySelector('#clear').onclick = () => { cart.discount = 0; m.close(); render(); };
  }

  function openCoupon() {
    const t = cartTotals(cart);
    const m = modal({
      title: 'Aplicar cupón',
      body: '<div class="field"><label>Código</label><input id="cp" placeholder="VERANO10"></div>',
      foot: '<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Aplicar</button>',
    });
    m.root.querySelector('#ok').onclick = () => {
      const r = applyCoupon(m.root.querySelector('#cp').value, t.subtotal);
      if (!r.ok) { toast(r.msg); return; }
      cart.discount = (cart.discount || 0) + r.value;
      m.close(); render(); toast('Cupón aplicado: ' + money(r.value));
    };
  }

  function openLayaway() {
    const m = modal({
      title: 'Apartar venta',
      body: '<div class="field"><label>Cliente</label><input id="lc" placeholder="Nombre del cliente"></div>'
        + '<div style="font-size:12px;color:var(--muted)">Se aparta ' + money(cartTotals(cart).total) + ' y se descuenta el stock de cada talla.</div>',
      foot: '<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Apartar</button>',
    });
    m.root.querySelector('#ok').onclick = () => {
      const name = m.root.querySelector('#lc').value.trim() || 'Público';
      const lay = createLayaway({ cart, customerName: name });
      cart.lines = []; cart.discount = 0;
      m.close();
      toast('Apartado ' + lay.code + ' creado');
      screen = 'sell'; render();
    };
  }

  /* ---------------- PAY ---------------- */
  function renderPay() {
    const t = cartTotals(cart);
    box.className = 'posv pay-bg';
    box.innerHTML = `
      <div class="pay-screen">
        <header class="scr-head on-dark">
          <button class="back" id="back">←</button>
          <h2>Método de Pago</h2>
        </header>
        <div class="pay-body">
          <div class="pay-total-card">
            <div class="ptc-lbl">TOTAL A PAGAR</div>
            <div class="ptc-val">${money(t.total)}</div>
          </div>
          <div class="pay-grid">
            <button class="pay-tile green" data-m="cash"><span>💵</span>Efectivo</button>
            <button class="pay-tile blue" data-m="debit"><span>💳</span>Débito</button>
            <button class="pay-tile pink" data-m="credit"><span>💳</span>Crédito</button>
            <button class="pay-tile purple" data-m="split"><span>◕</span>Pago Dividido</button>
            <button class="pay-tile grey" data-m="other"><span>•••</span>Otros</button>
          </div>
        </div>
      </div>`;
    $('#back', box).onclick = () => { screen = 'cart'; render(); };
    box.querySelectorAll('.pay-tile').forEach((b) => b.onclick = () => {
      const m = b.dataset.m;
      if (m === 'split') { screen = 'split'; render(); return; }
      method = m;
      if (m === 'cash') {
        received = t.total;
        cashInput = received.toFixed(2);
        cashAmountSuggested = true;
        screen = 'cash';
        render();
      }
      else finishSale(m, t.total, t.total);
    });
  }

  /* ---------------- CASH ---------------- */
  function renderCash() {
    const t = cartTotals(cart);
    box.className = 'posv';
    box.innerHTML = `
      <div class="cash-screen">
        <header class="scr-head">
          <button class="back" id="back">←</button>
          <h2>Efectivo</h2>
        </header>
        <div class="cash-body">
          <div class="cash-total"><span>TOTAL</span><b>${money(t.total)}</b></div>
          <div class="field"><label for="recv">Valor recibido</label>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px">
              <input id="recv" inputmode="decimal" value="${esc(cashInput)}">
              <button type="button" class="btn ghost" id="recv-delete" aria-label="Borrar último dígito" title="Borrar último dígito">⌫</button>
            </div>
          </div>
          <div class="keypad" id="kp">
            ${['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map((k) => `<button class="key" data-k="${k}">${k}</button>`).join('')}
          </div>
          <div class="change-big" id="chg"><span>Cambio</span><b>${money(Math.max(0, received - t.total))}</b></div>
        </div>
        <footer class="cart-foot2">
          <button class="btn orange" id="ok">Cobrar</button>
        </footer>
      </div>`;

    const recv = $('#recv', box);
    recv.addEventListener('focus', () => { if (cashAmountSuggested) recv.select(); });
    const chg = $('#chg', box);
    const upd = () => {
      cashInput = recv.value;
      const amount = Number(cashInput.replace(',', '.'));
      received = Number.isFinite(amount) ? amount : 0;
      const diff = received - t.total;
      chg.querySelector('b').textContent = money(Math.abs(diff));
      chg.querySelector('span').textContent = diff >= 0 ? 'Cambio' : 'Falta';
      chg.classList.toggle('bad', diff < 0);
    };
    recv.addEventListener('beforeinput', (event) => {
      if (cashAmountSuggested && event.inputType.startsWith('insert')) recv.select();
    });
    recv.addEventListener('input', () => { cashAmountSuggested = false; upd(); });
    upd();
    $('#recv-delete', box).onclick = () => {
      cashAmountSuggested = false;
      recv.value = recv.value.slice(0, -1);
      upd();
    };
    box.querySelectorAll('#kp .key').forEach((button) => button.onclick = () => {
      const key = button.dataset.k;
      if (cashAmountSuggested || key === 'C') recv.value = '';
      cashAmountSuggested = false;
      if (key === '.') {
        if (!/[.,]/.test(recv.value)) recv.value = (recv.value || '0') + '.';
      } else if (key !== 'C') {
        recv.value = (recv.value === '0' ? '' : recv.value) + key;
      }
      upd();
    });
    $('#back', box).onclick = () => { screen = 'pay'; render(); };
    $('#ok', box).onclick = () => {
      if (received < t.total) { toast('El efectivo es menor al total'); return; }
      finishSale('cash', received, t.total);
    };
  }

  function finishSale(m, recv, total) {
    const sale = commitSale({ cart, method: m, received: recv, customerName: ctx.customer, note: '', fiscalMode });
    if (state.settings.saleNotifications && ['owner', 'admin'].includes(state.user.role)) notifySale(sale);
    lastSale = sale;
    cart.lines = []; cart.discount = 0;
    screen = 'success';
    render();
  }

  /* ---------------- SUCCESS ---------------- */
  function renderSuccess() {
    const s = lastSale;
    box.className = 'posv ok-bg';
    box.innerHTML = `
      <div class="ok-full">
        <div class="ok-check-big">✓</div>
        <h1>¡Venta Exitosa!</h1>
        <p>La transacción se ha registrado correctamente</p>
        <div class="ok-amount-card">
          <span>MONTO TOTAL</span>
          <b>${money(s.total)}</b>
          ${s.method === 'cash' && s.change > 0 ? `<i>Cambio: ${money(s.change)}</i>` : ''}
        </div>
        <button class="ok-btn-primary" id="again"><span class="oi">🧾</span> Nueva Venta <span class="oa">→</span></button>
        <button class="ok-btn-secondary" id="receipt"><span class="oi">🧾</span> Ver Recibo / Opciones</button>
      </div>`;

    $('#again', box).onclick = () => { screen = 'sell'; render(); };
    $('#receipt', box).onclick = () => { screen = 'receipt'; render(); };
  }

  /* ---------------- RECIBO ---------------- */
  function renderReceipt() {
    const s = lastSale;
    const mName = { cash: 'EFECTIVO', debit: 'DÉBITO', credit: 'CRÉDITO', other: 'OTROS', credit_sale: 'CRÉDITO', split: 'PAGO DIVIDIDO' }[s.method] || s.method;
    const d = new Date(s.date);
    box.className = 'posv';
    box.innerHTML = `
      <div class="receipt-screen">
        <header class="rc-head">
          <button class="rc-x" id="rc-close">✕</button>
          <h2>ZoCo POS</h2>
        </header>
        <div class="rc-body">
          <div class="rc-count">${s.items.reduce((a, i) => a + i.qty, 0)} ítem (Ctd.: ${s.items.reduce((a, i) => a + i.qty, 0)})</div>
          ${s.items.map((i) => `<div class="rc-row"><span>${i.qty}x ${esc(i.name)}</span><b>${money(i.price * i.qty)}</b></div>`).join('')}
          <div class="rc-sep"></div>
          <div class="rc-total"><span>Total</span><b>${money(s.total)}</b></div>
          <div class="rc-method">${mName}</div>
          <div class="rc-sep"></div>
          <div class="rc-thanks">Muchas gracias por su compra.</div>
          <div class="rc-date">${d.toLocaleDateString('es-MX')} ${d.toLocaleTimeString('es-MX')}</div>
          <div class="rc-grid">
            <button class="rc-tile pink" id="rc-pdf"><span>📄</span>PDF</button>
            <button class="rc-tile blue" id="rc-mail"><span>✉️</span>Correo</button>
            <button class="rc-tile cream" id="rc-print"><span>🖨</span>Imprimir</button>
            <button class="rc-tile lav" id="rc-share"><span>🔗</span>Compartir</button>
            <button class="rc-tile green" id="rc-wa"><span>💬</span>WhatsApp</button>
          </div>
        </div>
      </div>`;

    $('#rc-close', box).onclick = () => { screen = 'sell'; render(); };
    $('#rc-print', box).onclick = async () => { const r = await printTicket(s); toast(r.message); };
    $('#rc-pdf', box).onclick = () => {
      const w = window.open('', '_blank', 'width=420,height=700');
      if (!w) return;
      w.document.write(ticketHTML(s));
      w.document.close();
      setTimeout(() => w.print(), 300);
    };
    $('#rc-mail', box).onclick = () => {
      const body = encodeURIComponent(ticketText(s));
      location.href = 'mailto:?subject=' + encodeURIComponent('Ticket ' + s.code) + '&body=' + body;
    };
    $('#rc-share', box).onclick = async () => {
      const text = 'Ticket ' + s.code + ' · ' + money(s.total);
      if (navigator.share) { try { await navigator.share({ title: 'Ticket ' + s.code, text }); } catch {} }
      else { await navigator.clipboard.writeText(text); toast('Ticket copiado'); }
    };
    $('#rc-wa', box).onclick = () => {
      const text = `${state.company.name}\nTicket ${s.code}\nTotal: ${money(s.total)}\n${s.items.map((i) => `${i.qty}x ${i.name}`).join('\n')}\n¡Gracias por su compra!`;
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    };
  }

  /* ---------------- QUICK SALE ---------------- */
  function openQuickSale() {
    const shoeSections = state.company.mode === 'shoe'
      ? sectionsForMode().filter(([, section]) => section.scale !== 'none') : [];
    const m = modal({
      title: 'Vender producto no registrado',
      body: `<div class="qs-amount"><span>$</span><input id="qv" type="number" min="0" step="0.01" placeholder="0"></div>
             <div class="field" style="margin-top:14px"><label>Descripción</label>
               <textarea id="qd" rows="3" placeholder="Ej. 545 rojo 5" style="width:100%;border:1px solid var(--line);border-radius:12px;padding:10px;font:inherit;resize:vertical"></textarea></div>
             ${shoeSections.length ? `<details style="margin-top:12px">
               <summary>Modelo, color y número (opcional)</summary>
               <div class="field" style="margin-top:12px"><label for="qs-model">Modelo</label><input id="qs-model" placeholder="Ej. 545"></div>
               <div class="field"><label for="qs-color">Color</label><input id="qs-color" placeholder="Ej. Rojo"></div>
               <div class="row2">
                 <div class="field"><label for="qs-section">Sección</label><select id="qs-section">${shoeSections.map(([id, section]) => `<option value="${esc(id)}">${esc(section.label)}</option>`).join('')}</select></div>
                 <div class="field"><label for="qs-size">Número</label><select id="qs-size"></select></div>
               </div>
               <output id="qs-stock" class="hint" aria-live="polite" style="display:block;margin:8px 0"></output>
             </details>` : ''}
             ${canAddInventory() ? '<button type="button" class="btn ghost sm qs-inventory" id="qs-inventory">＋ Agregar producto al inventario</button>' : ''}`,
      foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Aceptar</button>`,
    });
    m.root.classList.add('quick-sale-overlay');
    const priceInput = m.root.querySelector('#qv');
    const descriptionInput = m.root.querySelector('#qd');
    const shoeSection = m.root.querySelector('#qs-section');
    const shoeSize = m.root.querySelector('#qs-size');
    if (shoeSection) {
      const paintSizes = () => {
        const adult = ['dama', 'caballero'].includes(shoeSection.value);
        shoeSize.innerHTML = '<option value="">Sin número</option>' + sizesFor(shoeSection.value).map((size) =>
          `<option value="${fmtSize(size)}">${adult ? `MX ${size - 20} (${size} cm)` : fmtSize(size)}</option>`).join('');
      };
      shoeSection.addEventListener('change', paintSizes);
      paintSizes();
    }
    const shoeDetails = () => ({
      model: m.root.querySelector('#qs-model')?.value.trim() || '',
      color: m.root.querySelector('#qs-color')?.value.trim().replaceAll(',', ' ') || '',
      size: shoeSize?.value || '',
      section: shoeSection?.value || '',
    });
    const stockOutput = m.root.querySelector('#qs-stock');
    if (stockOutput) {
      const normalize = (value) => String(value ?? '').trim().toLowerCase();
      const showStock = () => {
        const { model, color, size } = shoeDetails();
        const product = model && state.products.find((item) => item.active !== false && normalize(item.code) === normalize(model));
        if (!product) {
          stockOutput.textContent = model ? 'Modelo no encontrado en inventario.' : 'Escribe el modelo para consultar existencias.';
          return;
        }
        const variants = variantsOf(product);
        const matching = variants.filter((variant) => (!size || variant.size === size)
          && (!color || normalize(variant.color || product.color) === normalize(color)));
        const qty = matching.reduce((total, variant) => total + stockOf(product, variant.key), 0);
        stockOutput.textContent = `${product.name} · Existencia en esta sucursal: ${qty}`;
      };
      m.root.querySelector('#qs-model').addEventListener('input', showStock);
      m.root.querySelector('#qs-color').addEventListener('input', showStock);
      shoeSection.addEventListener('change', showStock);
      shoeSize.addEventListener('change', showStock);
      showStock();
    }
    if (!isMobile()) setTimeout(() => priceInput.focus(), 60);
    m.root.querySelector('#qs-inventory')?.addEventListener('click', () => {
      if (!canAddInventory()) return;
      const price = priceInput.valueAsNumber;
      const { model, color, size, section } = shoeDetails();
      ctx.go('productos', {
        create: true,
        productDraft: {
          name: descriptionInput.value.trim() || model,
          code: model, color, size,
          section: size ? section : '',
          price: Number.isFinite(price) && price >= 0 ? price : '',
        },
      });
      m.close();
    });
    m.root.querySelector('#ok').onclick = () => {
      const v = Number(m.root.querySelector('#qv').value) || 0;
      const { model, color, size } = shoeDetails();
      const d = [...new Set([descriptionInput.value.trim(), model, color].filter(Boolean))].join(' · ') || 'Venta Rápida';
      if (v <= 0) { toast('Escribe un valor mayor a 0'); return; }
      cart.lines.push({ key: 'free_' + Date.now(), productId: null, name: d, size: size || 'Único', price: v, qty: 1, color: '#64748B' });
      m.close(); screen = 'cart'; render();
    };
  }

  /* ---------------- SPLIT ---------------- */
  function renderSplit() {
    const t = cartTotals(cart);
    const mNames = { cash: 'Efectivo', debit: 'Débito', credit: 'Crédito', other: 'Otros', credit_sale: 'A crédito' };
    box.className = 'posv';
    box.innerHTML = `
      <div class="cash-screen">
        <header class="scr-head">
          <button class="back" id="back">←</button>
          <h2>Pago dividido</h2>
        </header>
        <div class="cash-body">
          <div class="cash-total"><span>TOTAL</span><b>${money(t.total)}</b></div>
          <div class="field"><label>Monto del primer método</label>
            <input id="sp1" type="number" min="0" step="0.01" value="${(t.total / 2).toFixed(2)}"></div>
          <div class="field"><label>Primer método</label>
            <select id="sm1">${Object.entries(mNames).map(([k, v]) => `<option value="${k}" ${k === 'cash' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="change-big" id="sp-rest"><span>Segundo método (restante)</span><b class="mono">${money(t.total / 2)}</b></div>
          <div class="field" style="margin-top:8px"><label>Segundo método</label>
            <select id="sm2">${Object.entries(mNames).map(([k, v]) => `<option value="${k}" ${k === 'debit' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        </div>
        <footer class="cart-foot2">
          <button class="btn orange" id="ok">Cobrar</button>
        </footer>
      </div>`;

    const sp1 = $('#sp1', box);
    const upd = () => {
      const a = Number(sp1.value) || 0;
      const rest = Math.max(0, t.total - a);
      $('#sp-rest b', box).textContent = money(rest);
    };
    sp1.addEventListener('input', upd); upd();

    $('#back', box).onclick = () => { screen = 'pay'; render(); };
    $('#ok', box).onclick = () => {
      const a = Number(sp1.value) || 0;
      if (a <= 0 || a > t.total) { toast('Monto inválido'); return; }
      const rest = t.total - a;
      const payments = [
        { method: $('#sm1', box).value, amount: a },
        { method: $('#sm2', box).value, amount: rest },
      ];
      const sale = commitSale({ cart, method: 'split', received: t.total, payments, customerName: ctx.customer, note: '', fiscalMode });
      if (state.settings.saleNotifications && ['owner', 'admin'].includes(state.user.role)) notifySale(sale);
      lastSale = sale;
      cart.lines = []; cart.discount = 0;
      screen = 'success'; render();
    };
  }

  function render() {
    if (screen === 'sell') renderSell();
    else if (screen === 'cart') renderCart();
    else if (screen === 'pay') renderPay();
    else if (screen === 'cash') renderCash();
    else if (screen === 'split') renderSplit();
    else if (screen === 'receipt') renderReceipt();
    else renderSuccess();
  }

  render();
  return {
    root,
    refresh() { if (screen !== 'success') render(); },
    setScreen(s) { screen = s; render(); },
    scanCode(code) { screen = 'sell'; render(); return ctx.posApi?.addByCode(code); },
  };
}

/* Ticket HTML (usado por Ventas y por el respaldo de impresión) */
export function ticketHTML(sale) {
  const d = new Date(sale.date);
  const dd = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const hh = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const mName = { cash: 'Efectivo', debit: 'Débito', credit: 'Crédito', other: 'Otros', credit_sale: 'Crédito', split: 'Pago dividido' }[sale.method] || sale.method;
  return `
  <div class="ticket">
    <div class="c"><h4>${esc(state.company.name.toUpperCase())}</h4><div>${esc(sale.branchName)}</div>
      <div>RFC: ${esc(state.company.legalId || '—')}</div></div>
    <div class="sep"></div>
    <div class="r"><span>RECIBO</span><b>#${esc(sale.code)}</b></div>
    <div class="r"><span>${dd}</span><span>${hh}</span></div>
    <div class="r"><span>Cliente:</span><span>${esc(sale.customer || '-')}</span></div>
    <div class="sep"></div>
    ${sale.items.map((l) => `<div class="r"><span>${l.qty}x ${esc(l.name)} T.${esc(l.size)}</span><span>${money(l.price * l.qty)}</span></div>`).join('')}
    <div class="sep"></div>
    <div class="r"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
    ${sale.discount ? `<div class="r"><span>Descuento</span><span>−${money(sale.discount)}</span></div>` : ''}
    <div class="r tot"><span>TOTAL</span><span>${money(sale.total)}</span></div>
    <div class="r"><span>${mName}</span><span>${money(sale.received)}</span></div>
    ${sale.payments ? sale.payments.map((p) => `<div class="r"><span>· ${esc(mName[p.method] || p.method)}</span><span>${money(p.amount)}</span></div>`).join('') : ''}
    ${sale.method === 'cash' ? `<div class="r"><span>Cambio</span><span>${money(sale.change)}</span></div>` : ''}
    <div class="sep"></div>
    <div class="notes">Gracias por su compra. Cambios dentro de 8 días presentando este ticket.</div>
    <div class="c" style="margin-top:8px">${esc(sale.user)} · ZoCo POS</div>
  </div>`;
}