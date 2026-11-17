// Vista Inicio (home) — estilo ZoCo Classic
import { el, money, esc } from './ui.js';
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
