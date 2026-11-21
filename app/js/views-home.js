// Vista Inicio (home) — estilo ZoCo Classic
import { el, money, esc, modal, toast } from './ui.js';
import { state, totalStock, cashBreakdown, openRegister, branch, currentUser } from './store.js';
import { openCutZ } from './views-inventory.js';

const spark = (color) => `  <svg viewBox="0 0 200 34" preserveAspectRatio="none" fill="none">
    <path d="M0 26 C 20 24, 34 30, 52 22 S 80 10, 104 18 S 140 26, 160 16 S 186 8, 200 14"
      stroke="${color}" stroke-width="2" stroke-linecap="round">
      <animate attributeName="d" dur="10s" repeatCount="indefinite" calcMode="spline"
        keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
        values="M0 26 C 20 24, 34 30, 52 22 S 80 10, 104 18 S 140 26, 160 16 S 186 8, 200 14;
                M0 17 C 20 31, 34 12, 52 19 S 80 30, 104 14 S 140 10, 160 24 S 186 28, 200 18;
                M0 26 C 20 24, 34 30, 52 22 S 80 10, 104 18 S 140 26, 160 16 S 186 8, 200 14"/>
    </path>
  </svg>`;

export function homeView(ctx) {
  const root = el(`<div id="home" class="home-wrap"></div>`);
  let tab = 'global';
  const THEME_KEY = 'zoco.home.mobile.theme';
  let mobileTheme = localStorage.getItem(THEME_KEY) === 'visual' ? 'visual' : 'original';
  const wave = (color, className) => `<svg class="${className}" viewBox="0 0 500 90" preserveAspectRatio="none" aria-hidden="true"><path d="M-50 45 C 40 2, 110 85, 200 45 S 360 2, 450 45 S 610 85, 700 45" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

  // Fiscal = pagado con tarjeta · Interno = pagado en efectivo · Global = todo
  const isCard = (s) => s.method === 'debit' || s.method === 'credit'
    || (s.method === 'split' && (s.payments || []).some((p) => p.method === 'debit' || p.method === 'credit'));
  const matchTab = (s) => tab === 'global' ? true : tab === 'fiscal' ? isCard(s) : !isCard(s);

  function render() {
    const activeBranch = branch();
    const isOwner = currentUser()?.role === 'OWNER';
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

    root.classList.toggle('home-theme-visual', mobileTheme === 'visual');
    root.classList.toggle('home-theme-original', mobileTheme !== 'visual');
    root.innerHTML = `
      <div class="home-theme-control">
        ${isOwner && activeBranch ? `<button type="button" class="home-theme-toggle home-branch-toggle" id="home-branch-toggle" aria-haspopup="dialog" aria-label="Cambiar sucursal, actual: ${esc(activeBranch.name)}">Sucursal <span>${esc(activeBranch.name)}</span> <span aria-hidden="true">▾</span></button>` : ''}
        <button type="button" class="home-theme-toggle" id="home-theme-toggle" aria-expanded="false" aria-label="Cambiar estilo de Inicio">◉ <span>Estilo</span></button>
        <div class="home-theme-menu" id="home-theme-menu" hidden>
          <button type="button" data-home-theme="original" class="${mobileTheme === 'original' ? 'selected' : ''}">Original</button>
          <button type="button" data-home-theme="visual" class="${mobileTheme === 'visual' ? 'selected' : ''}">Visual</button>
        </div>
      </div>
      <div class="seg-wrap"><div class="seg" id="seg">
        <button class="${tab === 'global' ? 'on' : ''}" data-t="global">🌐 Global</button>
        <button class="${tab === 'fiscal' ? 'on' : ''}" data-t="fiscal">🧾 Fiscal</button>
        <button class="${tab === 'interno' ? 'on' : ''}" data-t="interno">🏢 Interno</button>
      </div></div>
      <div class="home-feature-grid"><div class="home-feature-main"><div class="home-hero">
        <div class="hh-head">
          <div class="hh-ico home-hero-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M6 8V4h12v4M3 12h18M16 16h2M7 4h10"/></svg></div>
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
        <div class="home-hero-wave">${wave('#c084fc','wave-purple')}${wave('#6ee7b7','wave-green')}</div>
        <div class="hh-duo">
          <div class="hh-mini purple"><span>AYER</span><b>${money(sum(yest))}</b>${spark('#C4B5FD')}</div>
          <div class="hh-mini green"><span>ESTE MES</span><b>${money(sum(month))}</b>${spark('#6EE7B7')}</div>
          <div class="hh-mini blue"><span>ESTE AÑO</span><b>${money(sum(year))}</b>${spark('#60A5FA')}</div>
        </div>
      </div>

      </div>
      <div class="home-cash-card panel">
        <div class="panel-head"><h2 class="home-cash-heading"><span class="home-cash-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M6 8V4h12v4M3 12h18M16 16h2M7 4h10"/></svg></span>Caja</h2><span class="badge ${state.register?.open ? 'ok' : 'grey'}">${state.register?.open ? 'Abierta' : 'Cerrada'}</span></div>
        <div class="home-cash-body"><div class="home-stats">
          <div><span class="home-cash-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M5 3h14M5 21h14"/><circle cx="12" cy="12" r="3"/><path d="M6 12h1m10 0h1"/></svg></span><b>${money(state.register?.opening || 0)}</b><span>FONDO</span></div>
          <div><span class="home-cash-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="8" cy="6" rx="5.5" ry="2.5"/><path d="M2.5 6v5c0 1.4 2.5 2.5 5.5 2.5 1.2 0 2.4-.2 3.3-.6M2.5 11v5c0 1.4 2.5 2.5 5.5 2.5 1.2 0 2.4-.2 3.3-.6"/><ellipse cx="16" cy="13" rx="5.5" ry="2.5"/><path d="M10.5 13v5.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V13M10.5 16c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5"/></svg></span><b>${money(cashSummary.expected)}</b><span>ESPERADO</span></div>
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
        <div class="home-kpi green"><span class="home-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="19" cy="20" r="1.5"/><path d="M2 3h3l3 13h12l2-9H6"/></svg></span><div class="home-kpi-text"><b>${todays.length}</b><span>Ventas Hoy</span></div></div>
        <div class="home-kpi blue"><span class="home-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10M7.5 4.5l9 5"/></svg></span><div class="home-kpi-text"><b>${state.products.length}</b><span>Productos</span></div></div>
        <div class="home-kpi purple"><span class="home-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2H2ZM17 5a3 3 0 0 1 0 6M18 14a6 6 0 0 1 4 6"/></svg></span><div class="home-kpi-text"><b>${state.customers?.length || 0}</b><span>Clientes</span></div></div>
      </div>
      <div class="home-decor-waves">${wave('#6ee7b7','wave-green')}${wave('#c084fc','wave-purple')}</div>
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
              Último corte: <b>${esc(state.cuts[0].folio)}</b> · diferencia ${money(state.cuts[0].difference || 0)}
              <button class="btn ghost sm" id="cut-hist" style="margin-left:8px;padding:2px 10px;font-size:11px">Ver historial</button>
            </div>` : ''}
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

    root.querySelector('#home-branch-toggle')?.addEventListener('click', ctx.switchBranch);
    root.querySelector('#home-theme-toggle').onclick = () => {
      const menu = root.querySelector('#home-theme-menu');
      menu.hidden = !menu.hidden;
      root.querySelector('#home-theme-toggle').setAttribute('aria-expanded', String(!menu.hidden));
    };
    root.querySelectorAll('[data-home-theme]').forEach((button) => button.onclick = () => {
      mobileTheme = button.dataset.homeTheme;
      localStorage.setItem(THEME_KEY, mobileTheme);
      render();
    });
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
    root.querySelectorAll('#cut-z').forEach((button) => button.addEventListener('click', () => openCutZ(render)));
    const cutHist = root.querySelector('#cut-hist');
    if (cutHist) cutHist.onclick = () => openCutHistory();
    root.querySelectorAll('#open-reg').forEach((button) => button.addEventListener('click', () => {
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
    }));
    root.querySelectorAll('#add-cash').forEach((button) => button.addEventListener('click', () => {
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
    }));
  }

  render();
  return { root, refresh: render };
}

/** Historial de cortes Z: ver el detalle y reimprimir cualquiera. */
function openCutHistory() {
  const cuts = state.cuts || [];
  if (!cuts.length) { toast('Aún no hay cortes guardados'); return; }
  const m = modal({
    title: 'Historial de cortes Z',
    wide: true,
    body: `<div class="hint" style="margin-bottom:10px">${cuts.length} corte(s) guardados. Toca uno para verlo o reimprimirlo.</div>
      <div class="po-list">
        ${cuts.map((c) => `<div class="po-row">
          <div class="po-main">
            <div class="po-folio">${esc(c.folio)} <span class="po-tag ${Math.abs(Number(c.difference || 0)) < 0.01 ? 'po-ok' : 'po-ordered'}">${Math.abs(Number(c.difference || 0)) < 0.01 ? 'cuadra' : 'diferencia'}</span></div>
            <div class="po-sub">${new Date(c.date).toLocaleString('es-MX')} · ${esc(c.branchName || '')} · ${esc(c.user || '')}</div>
          </div>
          <div class="po-money"><b>${money(c.counted || 0)}</b><div class="po-sub">contado</div></div>
          <div class="po-actions"><button class="btn sm" data-cut="${esc(c.id)}">Ver / imprimir</button></div>
        </div>`).join('')}
      </div>`,
    foot: `<button class="btn ghost" data-close>Cerrar</button>`,
  });
  m.root.querySelectorAll('[data-cut]').forEach((b) => {
    b.onclick = async () => {
      const cut = cuts.find((c) => c.id === b.dataset.cut);
      if (!cut) return;
      const { cutText } = await import('./printer.js');
      const m2 = modal({
        title: 'Corte ' + cut.folio,
        body: `<pre class="ticket-preview">${esc(cutText(cut))}</pre>`,
        foot: `<button class="btn ghost" data-close>Cerrar</button>
               <button class="btn" id="cut-print">Imprimir</button>`,
      });
      m2.root.querySelector('#cut-print').onclick = () => {
        const w = window.open('', '_blank', 'width=420,height=640');
        if (!w) { toast('Permite las ventanas emergentes para imprimir'); return; }
        w.document.write('<pre style="font-family:monospace;font-size:12px;margin:12px"></pre>');
        w.document.querySelector('pre').textContent = cutText(cut);
        w.document.close();
        w.focus();
        setTimeout(() => { try { w.print(); } catch {} }, 300);
      };
    };
  });
}
