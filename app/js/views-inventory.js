// Modales de inventario: devolución parcial, merma/ajuste y traspaso entre sucursales
import { el, money, esc, toast, modal, confirmDialog } from './ui.js';
import {
  state, emit, sizesFor, stockOf, fmtSize, productById,
  returnSale, registerAdjustment, transferStock,
} from './store.js';

const money0 = (n) => money(Number(n) || 0);
const branchName = (id) => (state.branches.find((b) => b.id === id) || {}).name || id;

/** Tallas reales del producto (las que existen en el inventario de cualquier sucursal) */
function realSizes(p) {
  const set = new Set();
  Object.values(p?.branchStock || {}).forEach((b) => Object.keys(b || {}).forEach((s) => set.add(String(s))));
  if (!set.size) sizesFor(p?.section).forEach((s) => set.add(String(fmtSize(s))));
  return [...set].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
}

/* ================= Devolución parcial ================= */
export function openReturnModal(saleId, onDone) {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) return;

  const yaDevuelto = (l) => (sale.returns || [])
    .flatMap((r) => r.items)
    .filter((i) => i.productId === l.productId && String(i.size) === String(l.size))
    .reduce((a, i) => a + Number(i.qty || 0), 0);

  const items = (sale.items || []).map((l, i) => ({ ...l, idx: i, disp: Number(l.qty) - yaDevuelto(l) }));
  const pick = new Map();

  const m = modal({
    wide: true,
    title: 'Devolver venta #' + sale.code,
    body: `
      <div class="hint" style="margin-bottom:10px">
        Elige las piezas a devolver. El inventario vuelve a la sucursal <b>${esc(branchName(sale.branchId))}</b>.
      </div>
      <div class="ret-list">
        ${items.map((l) => `
          <div class="ret-row ${l.disp <= 0 ? 'off' : ''}">
            <div class="ret-info">
              <b>${esc(l.name)}</b>
              <span>Talla ${esc(fmtSize(l.size))} · ${money0(l.price)} · vendidas ${l.qty}${l.disp < l.qty ? ` · devueltas ${l.qty - l.disp}` : ''}</span>
            </div>
            ${l.disp > 0 ? `
              <div class="ret-qty">
                <button type="button" class="rt-b" data-m="${l.idx}">−</button>
                <input type="number" min="0" max="${l.disp}" value="0" data-q="${l.idx}" style="width:52px;text-align:center">
                <button type="button" class="rt-b" data-p="${l.idx}">+</button>
                <span class="rt-max">/ ${l.disp}</span>
              </div>` : '<span class="badge grey">Ya devuelta</span>'}
          </div>`).join('') || '<div class="cart-empty">Esta venta no tiene artículos.</div>'}
      </div>
      <div class="row2" style="margin-top:14px">
        <div class="field"><label>Motivo</label>
          <select id="ret-reason">
            <option>Cambio de talla</option>
            <option>No le quedó</option>
            <option>Producto defectuoso</option>
            <option>Se arrepintió</option>
            <option>Otro</option>
          </select></div>
        <div class="field"><label>Se devuelve en</label>
          <select id="ret-method">
            <option value="cash">Efectivo</option>
            <option value="debit">Tarjeta</option>
            <option value="credit_note">Nota de crédito / cambio</option>
          </select></div>
      </div>
      <div class="ret-total"><span>Total a devolver</span><b id="ret-total">$0.00</b></div>`,
    foot: `<button class="btn ghost sm" data-close>Cancelar</button>
           <button class="btn sm" id="ret-go">Confirmar devolución</button>`,
  });

  const root = m.root;
  const recalc = () => {
    let t = 0;
    root.querySelectorAll('[data-q]').forEach((inp) => {
      const i = Number(inp.dataset.q);
      const q = Math.max(0, Math.min(Number(inp.value) || 0, items[i].disp));
      if (String(q) !== inp.value) inp.value = q;
      pick.set(i, q);
      t += q * Number(items[i].price || 0);
    });
    root.querySelector('#ret-total').textContent = money0(t);
    return t;
  };
  recalc();

  root.querySelectorAll('[data-q]').forEach((inp) => inp.oninput = recalc);
  root.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.p);
    const inp = root.querySelector(`[data-q="${i}"]`);
    inp.value = Math.min(items[i].disp, (Number(inp.value) || 0) + 1);
    recalc();
  });
  root.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.m);
    const inp = root.querySelector(`[data-q="${i}"]`);
    inp.value = Math.max(0, (Number(inp.value) || 0) - 1);
    recalc();
  });

  root.querySelector('#ret-go').onclick = async () => {
    const lines = [...pick.entries()]
      .filter(([, q]) => q > 0)
      .map(([i, q]) => ({
        productId: items[i].productId, size: items[i].size, qty: q,
        price: items[i].price, name: items[i].name,
      }));
    if (!lines.length) { toast('Elige al menos una pieza'); return; }

    const total = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const ok = await confirmDialog({
      title: 'Confirmar devolución',
      message: `Se devolverán ${lines.length} artículo(s) por ${money0(total)} y el inventario se repondrá.`,
      okText: 'Sí, devolver',
    });
    if (!ok) return;

    const r = returnSale(
      sale.id, lines,
      root.querySelector('#ret-reason').value,
      root.querySelector('#ret-method').value,
    );
    if (!r.ok) { toast(r.msg); return; }
    m.close();
    toast('Devolución registrada · ' + money0(r.ret.total));
    onDone?.();
  };
}

/* ================= Merma / ajuste ================= */
export function openAdjustmentModal(onDone) {
  const prods = state.products.filter((p) => p.active !== false);
  if (!prods.length) { toast('No hay productos'); return; }

  const m = modal({
    title: 'Merma o ajuste de inventario',
    body: `
      <div class="field"><label>Tipo</label>
        <select id="aj-type">
          <option value="merma">Merma (roto, perdido, robado)</option>
          <option value="ajuste_negativo">Faltante (cuadrar inventario)</option>
          <option value="ajuste_positivo">Sobrante (cuadrar inventario)</option>
        </select></div>
      <div class="field"><label>Producto</label>
        <select id="aj-prod">
          ${prods.map((p) => `<option value="${p.id}">${esc(p.name)} · ${esc(p.code || '')}</option>`).join('')}
        </select></div>
      <div class="row2">
        <div class="field"><label>Talla</label><select id="aj-size"></select></div>
        <div class="field"><label>Cantidad</label><input id="aj-qty" type="number" min="1" value="1"></div>
      </div>
      <div class="field"><label>Motivo</label>
        <select id="aj-reason">
          <option>Producto dañado</option>
          <option>Pérdida</option>
          <option>Robo</option>
          <option>Error de captura</option>
          <option>Devolución a proveedor</option>
        </select></div>
      <div class="field"><label>Nota (opcional)</label><input id="aj-note" placeholder="Detalle"></div>
      <div class="hint" id="aj-stock"></div>`,
    foot: `<button class="btn ghost sm" data-close>Cancelar</button>
           <button class="btn sm" id="aj-go">Registrar</button>`,
  });

  const root = m.root;
  const prodSel = root.querySelector('#aj-prod');
  const sizeSel = root.querySelector('#aj-size');

  const paintSizes = () => {
    const p = productById(prodSel.value);
    const sizes = realSizes(p);
    sizeSel.innerHTML = sizes.map((s) => {
      const n = stockOf(p, s);
      return `<option value="${esc(s)}">${esc(fmtSize(s))} (${n})</option>`;
    }).join('');
    root.querySelector('#aj-stock').textContent = `Stock actual: ${sizes.map((s) => fmtSize(s) + ':' + stockOf(p, s)).join(' · ')}`;
  };
  prodSel.onchange = paintSizes;
  paintSizes();

  root.querySelector('#aj-go').onclick = () => {
    const type = root.querySelector('#aj-type').value;
    const r = registerAdjustment({
      productId: prodSel.value,
      size: sizeSel.value,
      qty: root.querySelector('#aj-qty').value,
      type,
      reason: root.querySelector('#aj-reason').value,
      note: root.querySelector('#aj-note').value,
    });
    if (!r.ok) { toast(r.msg); return; }
    m.close();
    toast((type === 'ajuste_positivo' ? 'Sobrante registrado' : 'Merma registrada') + ' · ' + r.rec.name);
    onDone?.();
  };
}

/* ================= Traspaso entre sucursales ================= */
export function openTransferModal(onDone) {
  if (state.branches.length < 2) {
    toast('Agrega otra sucursal en Configuración → Empresas');
    return;
  }
  const prods = state.products.filter((p) => p.active !== false);

  const m = modal({
    title: 'Traspaso entre sucursales',
    body: `
      <div class="row2">
        <div class="field"><label>De</label>
          <select id="tr-from">${state.branches.map((b) => `<option value="${b.id}" ${b.id === state.currentBranch ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
        <div class="field"><label>A</label>
          <select id="tr-to">${state.branches.map((b) => `<option value="${b.id}" ${b.id !== state.currentBranch ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Producto</label>
        <select id="tr-prod">${prods.map((p) => `<option value="${p.id}">${esc(p.name)} · ${esc(p.code || '')}</option>`).join('')}</select></div>
      <div class="row2">
        <div class="field"><label>Talla</label><select id="tr-size"></select></div>
        <div class="field"><label>Cantidad</label><input id="tr-qty" type="number" min="1" value="1"></div>
      </div>
      <div class="field"><label>Nota (opcional)</label><input id="tr-note" placeholder="Ej. pedido de sucursal"></div>
      <div class="hint" id="tr-stock"></div>`,
    foot: `<button class="btn ghost sm" data-close>Cancelar</button>
           <button class="btn sm" id="tr-go">Traspasar</button>`,
  });

  const root = m.root;
  const fromSel = root.querySelector('#tr-from');
  const prodSel = root.querySelector('#tr-prod');
  const sizeSel = root.querySelector('#tr-size');

  const paintSizes = () => {
    const p = productById(prodSel.value);
    const sizes = realSizes(p);
    sizeSel.innerHTML = sizes.map((s) => {
      const n = stockOf(p, s, fromSel.value);
      return `<option value="${esc(s)}" ${n ? '' : 'disabled'}>${esc(fmtSize(s))} (${n})</option>`;
    }).join('');
    root.querySelector('#tr-stock').textContent = `Disponible en ${branchName(fromSel.value)}: ${sizes.map((s) => fmtSize(s) + ':' + stockOf(p, s, fromSel.value)).join(' · ')}`;
  };
  prodSel.onchange = paintSizes;
  fromSel.onchange = paintSizes;
  paintSizes();

  root.querySelector('#tr-go').onclick = () => {
    const from = fromSel.value;
    const to = root.querySelector('#tr-to').value;
    if (from === to) { toast('Elige sucursales distintas'); return; }
    const r = transferStock(prodSel.value, sizeSel.value, from, to, root.querySelector('#tr-qty').value, root.querySelector('#tr-note').value);
    if (!r.ok) { toast(r.msg); return; }
    m.close();
    toast(`Traspaso: ${r.rec.qty} pza(s) ${branchName(from)} → ${branchName(to)}`);
    onDone?.();
  };
}

/* ================= Calculadora de mezclas (perfumería) ================= */
export function openMixCalculator() {
  const m = modal({
    wide: true,
    title: 'Calculadora de mezclas (perfumería)',
    body: `
      <div class="hint" style="margin-bottom:12px">
        Calcula cuántos frascos salen de tu concentrado según la concentración y el tamaño de frasco.
      </div>
      <div class="row2">
        <div class="field"><label>Concentrado disponible (ml)</label>
          <input id="mx-conc" type="number" value="1000" min="1"></div>
        <div class="field"><label>Tamaño del frasco (ml)</label>
          <select id="mx-bottle">
            <option value="30">30 ml</option>
            <option value="50" selected>50 ml</option>
            <option value="100">100 ml</option>
            <option value="250">250 ml</option>
            <option value="custom">Otro…</option>
          </select></div>
        <div class="field" id="mx-custom-wrap" style="display:none"><label>Frasco personalizado (ml)</label>
          <input id="mx-custom" type="number" value="60" min="1"></div>
        <div class="field"><label>Concentración (% de esencia)</label>
          <select id="mx-pct">
            <option value="15">15% (suave)</option>
            <option value="20" selected>20% (estándar)</option>
            <option value="25">25% (intenso)</option>
            <option value="30">30% (extra)</option>
            <option value="custom">Otro…</option>
          </select></div>
        <div class="field" id="mx-pct-wrap" style="display:none"><label>% personalizado</label>
          <input id="mx-pct-custom" type="number" value="18" min="1" max="60"></div>
        <div class="field"><label>Merma (%)</label>
          <input id="mx-waste" type="number" value="3" min="0" max="30"></div>
      </div>

      <div class="mx-out" id="mx-out"></div>

      <details style="margin-top:12px">
        <summary style="cursor:pointer;font-size:12.5px;font-weight:700;color:var(--brand-700)">Costos y precio (opcional)</summary>
        <div class="row2" style="margin-top:10px">
          <div class="field"><label>Costo del concentrado (por ml)</label><input id="mx-cost-conc" type="number" step="0.01" value="0"></div>
          <div class="field"><label>Costo del alcohol (por ml)</label><input id="mx-cost-alc" type="number" step="0.01" value="0"></div>
          <div class="field"><label>Costo del frasco</label><input id="mx-cost-bottle" type="number" step="0.01" value="0"></div>
          <div class="field"><label>Margen deseado (%)</label><input id="mx-margin" type="number" value="60"></div>
        </div>
      </details>`,
    foot: `<button class="btn ghost sm" data-close>Cerrar</button>`,
  });

  const root = m.root;
  const $ = (s) => root.querySelector(s);

  const calc = () => {
    const conc = Math.max(0, Number($('#mx-conc').value) || 0);
    const bottleSel = $('#mx-bottle').value;
    const bottle = bottleSel === 'custom' ? Math.max(1, Number($('#mx-custom').value) || 0) : Number(bottleSel);
    const pctSel = $('#mx-pct').value;
    const pct = pctSel === 'custom' ? Math.max(1, Number($('#mx-pct-custom').value) || 0) : Number(pctSel);
    const waste = Math.max(0, Number($('#mx-waste').value) || 0);

    const concPerBottle = bottle * (pct / 100);
    const alcPerBottle = bottle - concPerBottle;
    const concPerBottleW = concPerBottle * (1 + waste / 100);
    const alcPerBottleW = alcPerBottle * (1 + waste / 100);
    const bottles = concPerBottleW > 0 ? Math.floor(conc / concPerBottleW) : 0;
    const alcTotal = alcPerBottleW * bottles;

    const cConc = Number($('#mx-cost-conc').value) || 0;
    const cAlc = Number($('#mx-cost-alc').value) || 0;
    const cBot = Number($('#mx-cost-bottle').value) || 0;
    const margin = Number($('#mx-margin').value) || 0;
    const cost = (concPerBottleW * cConc) + (alcPerBottleW * cAlc) + cBot;
    const price = cost * (1 + margin / 100);

    const n = (v) => (Math.round(v * 10) / 10).toLocaleString('es-MX');
    const money2 = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

    $('#mx-out').innerHTML = `
      <div class="mx-big"><b>${bottles}</b> frascos de ${n(bottle)} ml al ${n(pct)}%</div>
      <div class="mx-grid">
        <div><span>Concentrado por frasco</span><b>${n(concPerBottleW)} ml</b></div>
        <div><span>Alcohol por frasco</span><b>${n(alcPerBottleW)} ml</b></div>
        <div><span>Alcohol total</span><b>${n(alcTotal / 1000)} L</b></div>
        <div><span>Concentrado usado</span><b>${n((concPerBottleW * bottles) / 1000)} L</b></div>
      </div>
      ${cost > 0 || price > 0 ? `<div class="mx-cost">
        <div><span>Costo por frasco</span><b>${money2(cost)}</b></div>
        <div><span>Precio sugerido (${n(margin)}% margen)</span><b>${money2(price)}</b></div>
        <div><span>Ganancia por frasco</span><b>${money2(price - cost)}</b></div>
      </div>` : ''}`;
  };

  root.querySelectorAll('input,select').forEach((i) => {
    i.oninput = () => {
      $('#mx-custom-wrap').style.display = $('#mx-bottle').value === 'custom' ? 'block' : 'none';
      $('#mx-pct-wrap').style.display = $('#mx-pct').value === 'custom' ? 'block' : 'none';
      calc();
    };
    i.onchange = i.oninput;
  });
  calc();
}