// Shell + router + login de ZoCo POS
import { state, emit, makeCart, subscribe, hydrate, currentUser, login, logout, can, readSession } from './store.js';
import { posView } from './views-pos.js';
import { homeView } from './views-home.js';
import { productsView, salesView, reportsView, settingsView, customersView, usersView, layawaysView, couponsView, financeView, timeClockView, payrollView } from './views-catalog.js';
import { aiView } from './views-ai.js';
import { installScanner } from './scanner.js';
import { initInstallPrompt, showInstallCard, mountInstallButtons } from './install.js';
import { subscribePush } from './notify.js';
import { stopAllCams } from './camera.js';
import { checkUpdate, initNotifPill, watchServiceWorker, startUpdateWatcher } from './update.js';
import { toast, $, el, money } from './ui.js';

const NAV_GROUPS = [
  {
    label: 'OPERACIÓN',
    items: [
      { id: 'inicio', label: 'Inicio', icon: '⌂', mobile: true },
      { id: 'vender', label: 'Vender', icon: '✓', mobile: true, perm: 'sales.sell' },
      { id: 'ia', label: 'Asistente IA', icon: '✦', perm: 'ai.use' },
      { id: 'apartados', label: 'Apartados', icon: '⏱' },
      { id: 'ventas', label: 'Transacciones', icon: '$', mobile: true },
    ],
  },
  {
    label: 'GESTIÓN',
    items: [
      { id: 'productos', label: 'Productos', icon: '▦', mobile: true, perm: 'products.edit' },
      { id: 'cupones', label: 'Cupones', icon: '🎟', perm: 'products.edit' },
      { id: 'clientes', label: 'Clientes', icon: '👤', perm: 'customers.manage' },
      { id: 'catalogo', label: 'Catálogo Online', icon: '🛍', perm: 'settings.edit' },
      { id: 'instalar', label: 'Instalar App', icon: '⬇' },
      { id: 'gastos', label: 'Gastos', icon: '🧾' },
      { id: 'mifin', label: 'Mis Finanzas', icon: '💵' },
      { id: 'chat', label: 'ZoCo Chat', icon: '💬' },
      { id: 'finanzas', label: 'Finanzas', icon: '▤', perm: 'finance.view' },
    ],
  },
  {
    label: 'ADMINISTRACIÓN',
    items: [
      { id: 'reportes', label: 'Reportes', icon: '📊', perm: 'reports.view' },
      { id: 'checador', label: 'Reloj Checador', icon: '⏱' },
      { id: 'nomina', label: 'Nómina', icon: '💵', perm: 'finance.view' },
      { id: 'usuarios', label: 'Usuarios', icon: '👥', perm: 'users.manage' },
      { id: 'config', label: 'Configuración', icon: '⚙', mobile: true, perm: 'settings.edit' },
    ],
  },
];

const cart = makeCart();
const ctx = {
  cart,
  customer: '',
  customerId: null,
  go(route, params) { if (params?.create) pendingCreate = true; location.hash = '#/' + route; },
  persist: () => emit(),
  refreshShell: () => paintShell(),
};

let route = (location.hash.replace('#/', '') || 'inicio');
let pendingCreate = false;
let current = null;

const titles = {
  inicio: 'Resumen', vender: 'Vender', productos: 'Productos', ventas: 'Transacciones',
  reportes: 'Reportes', config: 'Configuración', ia: 'Asistente IA', clientes: 'Clientes',
  usuarios: 'Usuarios', checador: 'Reloj Checador', nomina: 'Nómina', finanzas: 'Finanzas', apartados: 'Apartados', cupones: 'Cupones',
};

function applyTheme() {
  document.documentElement.dataset.theme = state.company.theme === 'classic' ? '' : state.company.theme;
}

/* ================= LOGIN ================= */
function paintLogin() {
  const app = $('#app');
  app.innerHTML = `
    <div class="login-wrap">
      <form class="login-card" id="login-form">
        <div class="login-logo">Z</div>
        <h1>Bienvenido a ZoCo</h1>
        <p>Entra con tu cuenta para usar tu punto de venta.</p>
        <div class="field"><label>Correo</label>
          <input id="lg-email" type="email" placeholder="tu@correo.com" autocomplete="username" value="ramberamericasefectivo@gmail.com"></div>
        <div class="field"><label>Contraseña</label>
          <input id="lg-pass" type="password" placeholder="••••" autocomplete="current-password"></div>
        <div class="login-err" id="lg-err"></div>
        <button class="btn orange" type="submit">Entrar</button>
        <div class="login-hint">
          Demo: <b>ramberamericasefectivo@gmail.com</b> / <b>1234</b><br>
          Cajero: <b>cajero@zoco.app</b> / <b>1234</b>
        </div>
      </form>
    </div>`;

  $('#login-form').onsubmit = (e) => {
    e.preventDefault();
    const email = $('#lg-email').value;
    const pass = $('#lg-pass').value;
    const r = login(email, pass);
    if (!r.ok) { $('#lg-err').textContent = r.msg; return; }
    toast('Bienvenido, ' + r.user.name);
    route = 'inicio';
    location.hash = '#/inicio';
    paintShell();
  };
  setTimeout(() => $('#lg-pass')?.focus(), 80);
}

/* ================= SHELL ================= */
function paintShell() {
  if (!currentUser()) { paintLogin(); return; }
  applyTheme();
  const app = $('#app');
  const u = currentUser();
  const br = state.branches.find((b) => b.id === state.currentBranch) || state.branches[0];
  const initials = (u.name || 'Z').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const isHome = route === 'inicio';
  const roleLabel = { OWNER: 'OWNER', ADMIN: 'ADMIN', CASHIER: 'CAJERO', STOCK: 'ALMACÉN', ACCOUNT: 'CONTADOR' }[u.role] || u.role;

  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="user-card">
          <div class="uc-avatar">${initials}<span class="uc-star">★</span></div>
          <div class="uc-info">
            <div class="uc-name">${u.name} <span class="crown">♛</span></div>
            <div class="uc-tags"><span class="uc-role">${roleLabel}</span><span class="uc-plan">PRO</span></div>
          </div>
        </div>

        ${NAV_GROUPS.map((g) => {
          const items = g.items.filter((n) => !n.perm || can(n.perm));
          if (!items.length) return '';
          return `<div class="nav-group">
            <div class="nav-group-label">${g.label}</div>
            ${items.map((n) => `
              <button class="nav ${route === n.id ? 'on' : ''} ${n.mobile ? 'mo' : ''}" data-r="${n.id}">
                <span class="ic">${n.icon}</span><span class="lbl">${n.label}</span>
                ${n.soon ? '<span class="soon">PRONTO</span>' : ''}
              </button>`).join('')}
          </div>`;
        }).join('')}

        <button class="nav logout" data-r="salir"><span class="ic">⏻</span><span class="lbl">Cerrar sesión</span></button>
      </aside>

      <div class="main">
        <header class="topbar">
          <button class="tb-burger" id="burger" title="Mostrar/ocultar menú">☰</button>
          <div class="tb-title">
            <h1 id="ttl">${titles[route] || 'Resumen'}</h1>
            ${isHome ? `<div class="tb-sub">Hola, ${u.name.split(' ')[0]} 👋</div>` : ''}
          </div>
          <div class="spacer"></div>
          <div class="chip-branch" id="brnch"><span class="dot"></span>${br.name} ▾</div>
          <div class="avatar">${initials}<span class="av-dot"></span></div>
        </header>
        <main class="content" id="content"></main>
        <nav class="tabbar">
          <button data-r="inicio" class="${route === 'inicio' ? 'on' : ''}"><span>⌂</span>Inicio</button>
          <button data-r="vender" class="${route === 'vender' ? 'on' : ''}"><span>✓</span>Vender</button>
          <button data-r="productos" class="${route === 'productos' ? 'on' : ''}"><span>▦</span>Productos</button>
          <button data-r="ventas" class="${route === 'ventas' ? 'on' : ''}"><span>$</span>Ventas</button>
          <button data-r="config" class="${route === 'config' ? 'on' : ''}"><span>⚙</span>Ajustes</button>
        </nav>
      </div>
    </div>`;

  mountInstallButtons();
  app.querySelectorAll('[data-r]').forEach((b) => b.onclick = () => {
    if (b.dataset.r === 'salir') {
      if (confirm('¿Cerrar sesión?')) { logout(); paintLogin(); }
      return;
    }
    if (b.dataset.r === 'catalogo') {
      window.open('/catalogo.html', '_blank');
      return;
    }
    if (b.dataset.r === 'instalar') { showInstallCard(true); return; }
    if (b.dataset.r === 'gastos') { window.open('/gastos.html', '_blank'); return; }
    if (b.dataset.r === 'mifin') { window.open('/finanzas.html', '_blank'); return; }
    if (b.dataset.r === 'chat') { window.open('/chat.html', '_blank'); return; }
    shellEl.classList.remove('mob-open');
    location.hash = '#/' + b.dataset.r;
  });
  $('#brnch').onclick = switchBranch;
  const shellEl = app.querySelector('.shell');
  const isMob = () => window.matchMedia('(max-width: 900px)').matches;
  if (localStorage.getItem('zoco.sidebar') === 'closed' && !isMob()) shellEl.classList.add('collapsed');
  $('#burger').onclick = () => {
    if (isMob()) { shellEl.classList.toggle('mob-open'); return; }
    shellEl.classList.toggle('collapsed');
    localStorage.setItem('zoco.sidebar', shellEl.classList.contains('collapsed') ? 'closed' : 'open');
  };
  const closeMob = () => shellEl.classList.remove('mob-open');
  app.querySelectorAll('.tabbar [data-r]').forEach((b) => b.onclick = () => {
    location.hash = '#/' + b.dataset.r;
  });
  shellEl.addEventListener('click', (e) => {
    if (shellEl.classList.contains('mob-open') && !e.target.closest('.sidebar') && !e.target.closest('#burger')) closeMob();
  });
  mount();
  if (route === 'vender') setTimeout(() => $('#pos-q')?.focus(), 60);
}

function switchBranch() {
  if (!can('settings.edit') && !can('*')) { toast('No tienes permiso para cambiar de sucursal'); return; }
  const others = state.branches.filter((b) => b.id !== state.currentBranch);
  const m = document.createElement('div');
  m.className = 'overlay';
  m.innerHTML = `<div class="modal" style="width:420px;max-width:100%">
      <div class="modal-head"><h3>Cambiar sucursal</h3><button class="icon-btn" data-close>✕</button></div>
      <div class="modal-body">
        <div style="font-size:12.5px;color:var(--muted);margin-bottom:12px">Selecciona la sucursal. Se pedirá tu contraseña para confirmar.</div>
        ${others.map((b, i) => `<button class="btn ghost sm" style="width:100%;justify-content:flex-start;margin-bottom:8px;${i === 0 ? 'border-color:var(--brand)' : ''}" data-b="${b.id}">🏬 ${b.name}</button>`).join('')}
        <div class="field" style="margin-top:14px"><label>Contraseña</label><input type="password" id="pw" placeholder="••••"></div>
      </div>
      <div class="modal-foot"><button class="btn ghost sm" data-close>Cancelar</button>
        <button class="btn sm" id="ok">Cambiar</button></div>
    </div>`;
  document.getElementById('modal-root').appendChild(m);
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.remove(); });
  let chosen = others[0]?.id;
  m.querySelectorAll('[data-b]').forEach((b) => b.onclick = () => {
    chosen = b.dataset.b;
    m.querySelectorAll('[data-b]').forEach((x) => x.style.borderColor = 'var(--line)');
    b.style.borderColor = 'var(--brand)';
  });
  m.querySelector('#ok').onclick = () => {
    const pw = m.querySelector('#pw').value;
    const u = currentUser();
    if (u.pass !== pw && u.role !== 'OWNER') { toast('Contraseña incorrecta'); return; }
    if (!pw) { toast('Escribe tu contraseña'); return; }
    state.currentBranch = chosen; emit(); m.remove(); paintShell();
    toast('Sucursal: ' + state.branches.find((b) => b.id === chosen).name);
  };
}

function soonView(name) {
  const d = document.createElement('div');
  d.innerHTML = `<div class="panel"><div class="cart-empty" style="padding:60px 20px">
      <div class="big">🚧</div>
      <div style="font-size:16px;font-weight:800;color:var(--text);margin:8px 0">${name} — en construcción</div>
      <div>Ya está en el mapa de la app. Lo construimos en la siguiente fase.</div>
    </div></div>`;
  return { root: d, refresh() {} };
}

function mount() {
  const content = $('#content');
  const ttl = $('#ttl');
  stopAllCams();
  // Limpieza de la vista anterior (apaga cámara, intervalos, etc.)
  try { current?.destroy?.(); } catch {}
  current?.root?.remove?.();
  content.innerHTML = '';
  if (ttl) ttl.textContent = titles[route] || 'Resumen';

  const guard = (perm, fn) => () => (can(perm) ? fn() : soonView('Sin permiso'));

  const map = {
    inicio: () => homeView(ctx),
    vender: guard('sales.sell', () => posView(ctx)),
    productos: guard('products.edit', () => {
      const v = productsView(ctx);
      if (pendingCreate) { pendingCreate = false; setTimeout(() => v.openCreate(), 60); }
      return v;
    }),
    ventas: () => salesView(ctx),
    clientes: guard('customers.manage', () => customersView(ctx)),
    usuarios: guard('users.manage', () => usersView(ctx)),
    checador: () => timeClockView(ctx),
    nomina: guard('finance.view', () => payrollView(ctx)),
    reportes: guard('reports.view', () => reportsView(ctx)),
    config: guard('settings.edit', () => settingsView(ctx)),
    ia: guard('ai.use', () => aiView(ctx)),
    finanzas: guard('finance.view', () => financeView(ctx)),
    apartados: () => layawaysView(ctx),
    cupones: guard('products.edit', () => couponsView(ctx)),
  };

  const build = map[route] || map.inicio;
  try {
    current = build();
    content.appendChild(current.root);
  } catch (err) {
    console.error(err);
    content.innerHTML = '<div class="panel"><div class="cart-empty" style="padding:30px">'
      + '<div class="big">⚠️</div>'
      + '<div style="font-weight:800;color:var(--danger)">Error al montar ' + route + '</div>'
      + '<pre style="white-space:pre-wrap;font-size:11px;color:var(--muted);text-align:left;margin-top:10px">'
      + String((err && (err.stack || err.message)) || err).replace(/[<>&]/g, '')
      + '</pre></div></div>';
  }
}

window.addEventListener('hashchange', () => {
  route = location.hash.replace('#/', '') || 'inicio';
  paintShell();
});

subscribe(() => { current?.refresh?.(); });

window.addEventListener('keydown', (e) => {
  if (!currentUser()) return;
  if (e.key === 'F2') { e.preventDefault(); if (route !== 'vender') location.hash = '#/vender'; setTimeout(() => $('#pos-q')?.focus(), 80); }
  if (e.key === 'F3') { e.preventDefault(); location.hash = '#/productos'; }
});

installScanner((code) => {
  if (!currentUser() || !can('sales.sell')) return;
  if (route !== 'vender') location.hash = '#/vender';
  setTimeout(() => current?.scanCode?.(code), 120);
});

applyTheme();
hydrate().then(() => {
  paintShell();
  setTimeout(() => initInstallPrompt(), 1200);
  setTimeout(() => maybeDailyNotice(), 2500);
  setTimeout(() => { startUpdateWatcher(); initNotifPill(); watchServiceWorker(); }, 2000);
  // Refresca la suscripción push si el usuario ya dio permiso
  if ('Notification' in window && Notification.permission === 'granted') {
    setTimeout(() => subscribePush(), 3000);
  }
});

/* Aviso diario de presupuesto personal (opcional) */
async function maybeDailyNotice() {
  try {
    if (!state.settings?.dailyBudgetNotice) return;
    const dayKey = 'zoco.notice.' + new Date().toDateString();
    if (localStorage.getItem(dayKey)) return;
    const { runQuery } = await import('./ai-tools.js');
    const p = runQuery({ tema: 'personal' });
    if (p.presupuesto_diario_recomendado == null) return;
    localStorage.setItem(dayKey, '1');
    toast('💰 Hoy puedes gastar ' + money(p.disponible_hoy ?? p.presupuesto_diario_recomendado));
  } catch {}
}