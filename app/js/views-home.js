// Vista Inicio (home) — estilo ZoCo Classic
import { el, money, esc } from './ui.js';
import { state, totalStock } from './store.js';

const spark = (color) => `
  <svg viewBox="0 0 200 34" preserveAspectRatio="none" fill="none">
    <path d="M0 26 C 20 24, 34 30, 52 22 S 80 10, 104 18 S 140 26, 160 16 S 186 8, 200 14"
      stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

export function homeView(ctx) {
  const root = el(`<div id="home" class="home-wrap"></div>`);
  let tab = 'global';

  // Fiscal = pagado con tarjeta · Interno = pagado en efectivo · Global = todo
  const isCard = (s) => s.method === 'debit' || s.method === 'credit'
    || (s.method === 'split' && (s.payments || []).some((p) => p.method === 'debit' || p.method === 'credit'));
  const matchTab = (s) => tab === 'global' ? true : tab === 'fiscal' ? isCard(s) : !isCard(s);

  function render() {
    const now = new Date();
    const isToday = (d) => new Date(d).toDateString() === now.toDateString();
    const done = state.sales.filter((s) => s.status === 'done' && matchTab(s));
    const todays = done.filter((s) => isToday(s.date));
    const yest = done.filter((s) => {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return new Date(s.date).toDateString() === y.toDateString();
    });
    const month = done.filter((s) => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const sum = (a) => a.reduce((x, s) => x + s.total, 0);
    const lowStock = state.products.filter((p) => totalStock(p) <= 3).length;

    root.innerHTML = `
      <div class="seg-wrap"><div class="seg" id="seg">
        <button class="${tab === 'global' ? 'on' : ''}" data-t="global">🌐 Global</button>
        <button class="${tab === 'fiscal' ? 'on' : ''}" data-t="fiscal">🧾 Fiscal</button>
        <button class="${tab === 'interno' ? 'on' : ''}" data-t="interno">🏢 Interno</button>
      </div></div>
      <div class="home-hero">
        <div class="hh-head">
          <div class="hh-ico">$</div>
          <div class="hh-head-txt">
            <span class="hh-lbl">RESUMEN</span>
            <span class="hh-title">Ventas de Hoy</span>
          </div>
          <span class="hh-eye">◉</span>
        </div>
        <div class="hh-center">
          <div class="hh-amount">${money(sum(todays))}</div>
          <div class="hh-pill">↗ ${todays.length} ${todays.length === 1 ? 'venta' : 'ventas'}</div>
        </div>
        <div class="hh-duo">
          <div class="hh-mini purple"><span>AYER</span><b>${money(sum(yest))}</b>${spark('#C4B5FD')}</div>
          <div class="hh-mini green"><span>ESTE MES</span><b>${money(sum(month))}</b>${spark('#6EE7B7')}</div>
        </div>
      </div>

      <button class="hh-btn" id="go-sell" style="width:100%;margin-top:14px">＋ Registrar Nueva Venta</button>

      <div class="home-grid">
        <div class="panel">
          <div class="panel-head"><h2>Cuentas por pagar</h2>
            <span class="badge grey" style="margin-left:auto">$0.00</span></div>
          <div style="padding:14px 18px 16px;color:var(--muted);font-size:13px">
            Saldo actual considerando altas de stock, ventas y pagos.
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Inventario</h2>
            <span class="badge ${lowStock ? 'warn' : 'ok'}" style="margin-left:auto">${lowStock ? lowStock + ' con stock bajo' : 'Al día'}</span></div>
          <div style="padding:16px 18px">
            <div class="home-stats">
              <div><b>${state.products.length}</b><span>PRODUCTOS</span></div>
              <div><b>${money(state.products.reduce((a, p) => a + (p.cost || 0) * totalStock(p), 0))}</b><span>VALOR (COSTO)</span></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:14px">
              <button class="btn ghost sm" id="go-new" style="flex:1">＋ Agregar</button>
              <button class="btn ghost sm" id="go-stock" style="flex:1">Ver todo</button>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Últimas ventas</h2></div>
          <div style="padding:10px 18px 16px">
            ${done.length ? done.slice(0, 4).map((s) => `
              <div class="row-kv" style="padding:8px 0;border-bottom:1px solid var(--line-2)">
                <span>#${esc(s.code)} · ${s.items.reduce((a, i) => a + i.qty, 0)} art.</span>
                <b class="mono">${money(s.total)}</b>
              </div>`).join('')
              : `<div style="color:var(--muted);font-size:13px;padding:6px 0">Aún no hay ventas.</div>`}
          </div>
        </div>
      </div>`;

    root.querySelectorAll('#seg button').forEach((b) => b.onclick = () => {
      tab = b.dataset.t;
      render();
    });
    root.querySelector('#go-sell').onclick = () => ctx.go('vender');
    root.querySelector('#go-new').onclick = () => ctx.go('productos', { create: true });
    root.querySelector('#go-stock').onclick = () => ctx.go('productos');
  }

  render();
  return { root, refresh: render };
}
