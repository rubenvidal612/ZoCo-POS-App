// Vista Inicio (home) — estilo ZoCo Classic
import { el, money, esc, modal, toast } from './ui.js';
import { state, totalStock, cashBreakdown, openRegister } from './store.js';
import { openCutZ } from './views-inventory.js';

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
    const cashSummary = cashBreakdown();
    const year = done.filter((sale) => new Date(sale.date).getFullYear() === now.getFullYear());
    const lowProducts = state.products.filter((p) => p.active !== false && totalStock(p) <= 3).slice(0, 5);
    const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday); day.setDate(day.getDate() + i);
      return { label: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i], total: sum(done.filter((sale) => new Date(sale.date).toDateString() === day.toDateString())) };
    });
    const weekMax = Math.max(1, ...weekDays.map((d) => d.total));
    const weekPoints = weekDays.map((d, i) => (10 + i * 80) + ',' + (126 - d.total / weekMax * 105)).join(' ');

    root.innerHTML = `
      <div class="seg-wrap"><div class="seg" id="seg">
        <button class="${tab === 'global' ? 'on' : ''}" data-t="global">🌐 Global</button>
        <button class="${tab === 'fiscal' ? 'on' : ''}" data-t="fiscal">🧾 Fiscal</button>
        <button class="${tab === 'interno' ? 'on' : ''}" data-t="interno">🏢 Interno</button>
      </div></div>
      <div class="home-feature-grid"><div class="home-feature-main"><div class="home-hero">
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
          <div class="hh-mini blue"><span>ESTE AÑO</span><b>${money(sum(year))}</b>${spark('#60A5FA')}</div>
        </div>
      </div>

      </div>
      <div class="home-cash-card panel">
        <div class="panel-head"><h2>Caja</h2><span class="badge ${state.register?.open ? 'ok' : 'grey'}">${state.register?.open ? 'Abierta' : 'Cerrada'}</span></div>
        <div class="home-cash-body"><div class="home-stats">
          <div><b>${money(state.register?.opening || 0)}</b><span>FONDO</span></div>
          <div><b>${money(cashSummary.expected)}</b><span>ESPERADO</span></div>
        </div>
        <div class="home-cash-actions">${state.register?.open ? '<button class="btn sm" id="cut-z">✂ Corte Z</button><button class="btn ghost sm" id="add-cash">+ Efectivo</button>' : '<button class="btn sm" id="open-reg">⏻ Abrir caja</button>'}</div></div>
      </div></div>
      <div class="home-actions">
        <button class="hh-btn" id="go-sell">＋ Registrar Nueva Venta</button>
        <button class="btn ghost" id="go-quick-product">▣ Nuevo Producto</button>
        <button class="btn ghost" id="go-quick-customer">♙ Nuevo Cliente</button>
        <button class="btn ghost" id="go-quick-report">▥ Ver Reportes</button>
      </div>
      <div class="home-overview">
        <div class="panel home-payables"><div class="panel-head"><h2>Cuentas por pagar</h2><span class="badge grey">$0.00</span></div><p>Saldo actual considerando altas de stock, ventas y pagos.</p></div>
        <div class="home-kpi green"><b>${todays.length}</b><span>Ventas Hoy</span></div>
        <div class="home-kpi blue"><b>${state.products.length}</b><span>Productos</span></div>
        <div class="home-kpi purple"><b>${state.customers?.length || 0}</b><span>Clientes</span></div>
      </div>
      <div class="home-analytics">
        <div class="panel home-week"><div class="panel-head"><h2>▥ Ventas de la Semana</h2></div>
          <div class="home-chart"><svg viewBox="0 0 500 150" preserveAspectRatio="none" role="img" aria-label="Ventas de la semana">
            <path d="M10 126 H490 M10 90 H490 M10 54 H490 M10 18 H490" stroke="#e5eaf2" stroke-dasharray="4 4" fill="none"/>
            <polyline points="${weekPoints}" stroke="#7c3aed" stroke-width="3" fill="none"/>
            ${weekDays.map((d,i) => '<circle cx="' + (10+i*80) + '" cy="' + (126-d.total/weekMax*105) + '" r="4" fill="#7c3aed"><title>' + d.label + ': ' + money(d.total) + '</title></circle>').join('')}
          </svg><div class="home-week-labels">${weekDays.map((d) => '<span>' + d.label + '</span>').join('')}</div></div>
        </div>
        <div class="panel home-low"><div class="panel-head"><h2>⚠ Productos con Stock Bajo</h2><button class="btn ghost sm" id="go-low-stock">Ver todos</button></div>
          <div class="home-low-list">${lowProducts.length ? lowProducts.map((p) => '<div class="home-low-item"><span>' + esc(p.name) + '</span><b>Stock: ' + totalStock(p) + '</b></div>').join('') : '<p class="home-empty">No hay productos con stock bajo.</p>'}</div>
        </div>
      </div>

      <div class="home-grid home-secondary-grid">
        <div class="panel">
          <div class="panel-head"><h2>Cuentas por pagar</h2>
            <span class="badge grey" style="margin-left:auto">$0.00</span></div>
          <div style="padding:14px 18px 16px;color:var(--muted);font-size:13px">
            Saldo actual considerando altas de stock, ventas y pagos.
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h2>Caja</h2>
            <span class="badge ${state.register?.open ? 'ok' : 'grey'}" style="margin-left:auto">
              ${state.register?.open ? 'Abierta' : 'Cerrada'}</span></div>
          <div style="padding:16px 18px">
            <div class="home-stats">
              <div><b>${money(state.register?.opening || 0)}</b><span>FONDO</span></div>
              <div><b>${money(cashSummary.expected)}</b><span>ESPERADO</span></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:14px">
              ${state.register?.open
                ? `<button class="btn sm" id="cut-z" style="flex:1">✂ Corte Z</button>
                   <button class="btn ghost sm" id="add-cash" style="flex:1">+ Efectivo</button>`
                : `<button class="btn sm" id="open-reg" style="flex:1">Abrir caja</button>`}
            </div>
            ${state.cuts?.length ? `<div style="margin-top:10px;font-size:11.5px;color:var(--muted)">
              Último corte: <b>${esc(state.cuts[0].folio)}</b> · diferencia ${money(state.cuts[0].difference || 0)}</div>` : ''}
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
    root.querySelector('#go-quick-product').onclick = () => ctx.go('productos', { create: true });
    root.querySelector('#go-quick-customer').onclick = () => ctx.go('clientes');
    root.querySelector('#go-quick-report').onclick = () => ctx.go('reportes');
    root.querySelector('#go-low-stock').onclick = () => ctx.go('productos');
    root.querySelector('#go-new').onclick = () => ctx.go('productos', { create: true });
    root.querySelector('#go-stock').onclick = () => ctx.go('productos');
    root.querySelector('#cut-z')?.addEventListener('click', () => openCutZ(render));
    root.querySelector('#open-reg')?.addEventListener('click', () => {
      const m = modal({
        title: 'Abrir caja',
        body: `<div class="field"><label>Fondo inicial en efectivo</label>
            <input id="op-amt" type="number" step="0.01" value="0"
              style="font-size:22px;font-weight:800;text-align:center;height:52px"></div>
          <div class="hint">Es el cambio con el que arrancas el turno.</div>`,
        foot: `<button class="btn ghost sm" data-close>Cancelar</button>
               <button class="btn sm" id="op-go">Abrir caja</button>`,
      });
      m.root.querySelector('#op-go').onclick = () => {
        const v = Number(m.root.querySelector('#op-amt').value) || 0;
        openRegister(v);
        m.close();
        toast('Caja abierta con ' + money(v));
        render();
      };
    });
    root.querySelector('#add-cash')?.addEventListener('click', () => {
      const m = modal({
        title: 'Entrada de efectivo',
        body: `<div class="field"><label>Monto</label>
            <input id="in-amt" type="number" step="0.01" value="0"></div>
          <div class="field"><label>Motivo</label>
            <input id="in-note" placeholder="Cambio, retiro, depósito…"></div>`,
        foot: `<button class="btn ghost sm" data-close>Cancelar</button>
               <button class="btn sm" id="in-go">Agregar</button>`,
      });
      m.root.querySelector('#in-go').onclick = async () => {
        const v = Number(m.root.querySelector('#in-amt').value) || 0;
        const note = m.root.querySelector('#in-note').value || 'Entrada manual';
        const { emit } = await import('./store.js');
        state.cashMovements.push({
          id: 'cm' + Date.now(), type: 'in', amount: v, note,
          user: state.user?.name || '-', date: new Date().toISOString(), branchId: state.currentBranch,
        });
        emit(); m.close(); toast('Entrada registrada'); render();
      };
    });
  }

  render();
  return { root, refresh: render };
}
