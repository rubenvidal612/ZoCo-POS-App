// Flujo de venta ZoCo: Vender → Carrito → Pago → Efectivo → Éxito
import { $, el, money, esc, toast, modal, confirmDialog } from './ui.js';
import {
  state, sectionsForMode, sizesFor, stockOf, totalStock, productById,
  cartTotals, addLine, commitSale, sectionOf, fmtSize, can, createLayaway, applyCoupon,
} from './store.js';
import { printTicket, ticketText } from './printer.js';

const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

export function posView(ctx) {
  const { cart } = ctx;
  let screen = 'sell';           // sell | cart | pay | cash | success
  let filter = '';
  let section = 'all';
  let method = 'cash';
  let received = 0;
  let fiscalMode = 'interno';
  let lastSale = null;

  const root = el(`<div class="posv" id="posv"></div>`);
  const box = root;

  ctx.posApi = {
    addByCode(code) {
      const q = String(code).trim().toLowerCase();
      const p = state.products.find((x) => (x.code || '').toLowerCase() === q || (x.name || '').toLowerCase() === q);
      if (!p) { toast('Código no encontrado: ' + code); return false; }
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
    $('#btn-scan', box).onclick = () => { q.focus(); toast('Escáner listo — dispara el código'); };
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
      const avail = sizesFor(p.section).filter((s) => stockOf(p, s) > 0);
      const inCart = cart.lines.filter((l) => l.productId === p.id).reduce((a, l) => a + l.qty, 0);
      return `<button class="sq-card" data-id="${p.id}" ${avail.length ? '' : 'disabled'}>
        <div class="sq-ph" style="background:linear-gradient(150deg,${p.color},${p.color}bb)">
          ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">` : `<span>${esc(sectionOf(p).label.slice(0, 3).toUpperCase())}</span>`}
          ${inCart ? `<b class="sq-badge">${inCart}</b>` : ''}
        </div>
        <div class="sq-price">${money(p.price)}</div>
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
            const q = stockOf(product, s);
            return `<div class="size-cell ${q > 0 ? 'has' : 'zero'}" data-s="${fmtSize(s)}">
              <div class="s">${fmtSize(s)}</div><div class="q">${q > 0 ? 'Stock: ' + q : '—'}</div></div>`;
          }).join('')}
        </div>`,
      foot: `<button class="btn ghost sm" data-close>Cerrar</button>`,
    });
    m.root.querySelectorAll('.size-cell').forEach((c) => c.onclick = () => {
      const s = c.dataset.s;
      if (stockOf(product, s) <= 0) { toast('Talla ' + s + ' sin stock'); return; }
      add(product, s); m.close();
    });
  }

  function add(product, size) {
    const r = addLine(cart, product, size);
    if (!r.ok) { toast(r.msg); return; }
    render();
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
                <span class="chip"># × ${l.qty}</span>
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
    if (d > 0 && l.productId) {
      const p = productById(l.productId);
      if (p && stockOf(p, l.size) <= l.qty) { toast('Sin más stock de la talla ' + l.size); return; }
    }
    l.qty += d;
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
      if (m === 'cash') { received = t.total; screen = 'cash'; render(); }
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
          <div class="field"><label>Valor recibido</label>
            <input id="recv" inputmode="decimal" value="${received.toFixed(2)}"></div>
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
    recv.addEventListener('focus', () => recv.select());
    const chg = $('#chg', box);
    const upd = () => {
      received = Number(String(recv.value).replace(',', '.')) || 0;
      const diff = received - t.total;
      chg.querySelector('b').textContent = money(Math.abs(diff));
      chg.querySelector('span').textContent = diff >= 0 ? 'Cambio' : 'Falta';
      chg.classList.toggle('bad', diff < 0);
    };
    recv.addEventListener('input', upd); upd();
    box.querySelectorAll('.key').forEach((b) => b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'C') recv.value = '';
      else if (k === '.') { if (!recv.value.includes('.')) recv.value += '.'; }
      else recv.value = (recv.value === '0' ? '' : recv.value) + k;
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
    const m = modal({
      title: 'Vender producto no registrado',
      body: `<div class="qs-amount"><span>$</span><input id="qv" type="number" min="0" step="0.01" placeholder="0" autofocus></div>
             <div class="field" style="margin-top:14px"><label>Descripción</label>
               <textarea id="qd" rows="3" placeholder="Ej. 545 rojo 5" style="width:100%;border:1px solid var(--line);border-radius:12px;padding:10px;font:inherit;resize:vertical"></textarea></div>`,
      foot: `<button class="btn ghost sm" data-close>Cancelar</button><button class="btn sm" id="ok">Aceptar</button>`,
    });
    setTimeout(() => m.root.querySelector('#qv')?.focus(), 60);
    m.root.querySelector('#ok').onclick = () => {
      const v = Number(m.root.querySelector('#qv').value) || 0;
      const d = m.root.querySelector('#qd').value.trim() || 'Venta Rápida';
      if (v <= 0) { toast('Escribe un valor mayor a 0'); return; }
      cart.lines.push({ key: 'free_' + Date.now(), productId: null, name: d, size: 'Único', price: v, qty: 1, color: '#64748B' });
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