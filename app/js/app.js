// Shell + router + login de ZoCo POS
import { state, emit, makeCart, subscribe, hydrate, currentUser, login, logout, can, readSession } from './store.js';
import { posView } from './views-pos.js';
import { homeView } from './views-home.js';
import { productsView, salesView, reportsView, settingsView, customersView, usersView, layawaysView, couponsView, financeView, timeClockView, affiliatesView, payrollView } from './views-catalog.js';
import { aiView } from './views-ai.js';
import { installScanner } from './scanner.js';
import { initInstallPrompt, showInstallCard, mountInstallButtons } from './install.js';
import { subscribePush } from './notify.js';
import { stopAllCams } from './camera.js';
import { startSync, sbReady, pullCloud } from './sync.js';
import { captureRef, pendingRef, registerReferral } from './store.js';
import { loadDemoForMode } from './store.js';
import { cloudSignIn, cloudSignUp, amISuperadmin, signInWithGoogle, handleOAuthReturn, alignCompany, ensureCompany, sendMagicLink, sendRecovery } from './auth.js';
import { adminView } from './views-admin.js';
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
      { id: 'afiliados', label: 'Afiliados', icon: '🔗' },
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
      { id: 'admin', label: 'Panel maestro', icon: '🛡', super: true },
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
  usuarios: 'Usuarios', checador: 'Reloj Checador', nomina: 'Nómina', finanzas: 'Finanzas', afiliados: 'Afiliados', apartados: 'Apartados', cupones: 'Cupones',
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
        <h1 id="lg-title">Bienvenido a ZoCo</h1>
        <p id="lg-sub">Entra con tu cuenta para usar tu punto de venta.</p>
        <div class="field"><label>Correo</label>
          <input id="lg-email" type="email" placeholder="tu@correo.com" autocomplete="username" value="ramberamericasefectivo@gmail.com"></div>
        <div class="field"><label>Contraseña</label>
          <input id="lg-pass" type="password" placeholder="••••••" autocomplete="current-password"></div>
        <div class="field" id="lg-name-wrap" style="display:none"><label>Nombre de tu negocio</label>
          <input id="lg-name" placeholder="Mi tienda"></div>
        <div class="login-err" id="lg-err"></div>
        <button class="btn orange" type="submit" id="lg-main">Entrar</button>
        <button class="btn ghost" type="button" id="lg-register" style="margin-top:8px;width:100%">Crear cuenta nueva</button>
        <button class="btn ghost" type="button" id="lg-google" style="margin-top:10px;width:100%;display:flex;align-items:center;justify-content:center;gap:10px" aria-label="Continuar con Google"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48" style="flex-shrink:0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.88 23.88 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.92-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Continuar con Google</button>
        <div class="login-links">
          <button type="button" id="lg-forgot">¿Olvidaste tu contraseña?</button>
          <button type="button" id="lg-magic">Entrar sin contraseña</button>
        </div>
        <div class="login-hint">
          Demo: <b>ramberamericasefectivo@gmail.com</b> / <b>1234</b><br>
          Cajero: <b>cajero@zoco.app</b> / <b>1234</b>
        </div>
      </form>
    </div>`;

  $('#lg-google').onclick = () => {
    if (!sbReady()) { $('#lg-err').textContent = 'Falta configurar Supabase'; return; }
    signInWithGoogle();
  };

  let mode = 'login';
  $('#lg-register').onclick = () => {
    mode = mode === 'login' ? 'register' : 'login';
    $('#lg-name-wrap').style.display = mode === 'register' ? 'block' : 'none';
    $('#lg-register').textContent = mode === 'register' ? '← Ya tengo cuenta' : 'Crear cuenta nueva';
    $('#lg-main').textContent = mode === 'register' ? 'Crear mi cuenta' : 'Entrar';
    $('#lg-title').textContent = mode === 'register' ? 'Crea tu cuenta' : 'Bienvenido a ZoCo';
    $('#lg-sub').textContent = mode === 'register' ? 'Toma 30 segundos y empiezas a vender.' : 'Entra con tu cuenta para usar tu punto de venta.';
    $('#lg-err').textContent = '';
  };

  if (!sbReady()) {
    const r = $('#lg-register'); if (r) r.style.display = 'none';
    const f = $('#lg-forgot'); if (f) f.style.display = 'none';
    const m = $('#lg-magic'); if (m) m.style.display = 'none';
  }

  $('#lg-forgot').onclick = async () => {
    const email = $('#lg-email').value.trim();
    if (!email) { $('#lg-err').textContent = 'Escribe tu correo arriba'; return; }
    $('#lg-err').textContent = 'Enviando…';
    const r = await sendRecovery(email);
    $('#lg-err').textContent = r.ok
      ? '📬 Te enviamos un enlace para crear una nueva contraseña.'
      : 'No se pudo enviar: ' + (r.error || '');
  };

  $('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#lg-email').value.trim();
    const pass = $('#lg-pass').value;

    // 1) Registro: siempre en la nube
    if (mode === 'register') {
      if (!sbReady()) { $('#lg-err').textContent = 'Falta configurar Supabase'; return; }
      if (pass.length < 6) { $('#lg-err').textContent = 'La contraseña debe tener 6 caracteres o más'; return; }
      $('#lg-err').textContent = 'Creando tu cuenta…';
      const r = await cloudSignUp(email, pass, $('#lg-name').value.trim() || email.split('@')[0]);
      if (!r.ok) { $('#lg-err').textContent = r.error; return; }
      if (r.needConfirm) { $('#lg-err').textContent = '📬 Revisa tu correo para confirmar la cuenta'; return; }
      const u = state.users.find((x) => x.role === 'owner') || state.users[0];
      if (u) state.user = u;
      state.superadmin = await amISuperadmin();
      // cada cliente nuevo arranca con el demo de su giro (se puede quitar después)
      if (!(state.products || []).length) {
        try { loadDemoForMode(state.company.mode || 'shoe', { replace: true }); } catch {}
      }
      const refCode = pendingRef();
      if (refCode) { try { registerReferral({ code: refCode, email, name: $('#lg-name').value.trim() || email.split('@')[0] }); } catch {} }
      toast('Cuenta creada. ¡Bienvenido!');
      setTimeout(() => toast('Configuración → Datos de prueba: borra el catálogo de ejemplo'), 2000);
      route = 'inicio'; location.hash = '#/inicio'; paintShell();
      return;
    }

    // 2) Login local primero (instantáneo, sin esperar a la nube)
    const local = login(email, pass);
    if (local.ok) {
      toast('Bienvenido, ' + local.user.name);
      route = 'inicio'; location.hash = '#/inicio'; paintShell();
      // en segundo plano se valida contra la nube
      if (sbReady()) {
        cloudSignIn(email, pass).then(async (r) => {
          if (r.ok) { state.superadmin = await amISuperadmin(); paintShell(); }
        }).catch(() => {});
      }
      return;
    }

    // 3) Si no es usuario local, se intenta en la nube
    if (sbReady()) {
      $('#lg-err').textContent = 'Conectando…';
      const r = await cloudSignIn(email, pass);
      if (!r.ok) { $('#lg-err').textContent = r.error || 'Correo o contraseña incorrectos'; return; }
      const u = state.users.find((x) => x.role === 'owner') || state.users[0];
      if (u) state.user = u;
      state.superadmin = await amISuperadmin();
      toast('Bienvenido');
      route = 'inicio'; location.hash = '#/inicio'; paintShell();
      return;
    }

    $('#lg-err').textContent = local.msg || 'Correo o contraseña incorrectos';
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
          const items = g.items.filter((n) => (!n.perm || can(n.perm)) && (!n.super || state.superadmin));
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
    admin: () => adminView(ctx),
    finanzas: guard('finance.view', () => financeView(ctx)),
    apartados: () => layawaysView(ctx),
    cupones: guard('products.edit', () => couponsView(ctx)),
    afiliados: () => affiliatesView(ctx),
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

/* Vuelta de Google (OAuth): guarda sesión, crea empresa si es nueva y entra */
async function bootOAuth() {
  try {
    const r = await handleOAuthReturn();
    if (!r.ok) return false;
    // La sesión de Supabase ya está validada; la sesión local se establece
    // después de hydrate(), que puede reemplazar los usuarios locales.
    return { user: r.user };
  } catch { return false; }
}

captureRef();

  // Migración P6: si hay una llave de IA vieja en el estado, moverla cifrada al servidor
  if (state.settings?.aiKey) {
    try {
      const r = await fetch('/api/secret', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: state.currentCompany || 'default', key: state.settings.aiKey, provider: state.settings.aiProvider }),
      });
      const j = await r.json();
      if (j.ok) { state.settings.aiKey = ''; state.settings.aiKeySaved = true; emit(); }
    } catch {}
  }
bootOAuth().then(async (oauth) => {
  await hydrate();
  if (oauth?.user && sbReady()) {
    try {
      const email = (oauth.user.email || '').toLowerCase();
      const user = state.users.find((u) => u.active && u.email?.toLowerCase() === email);
      if (!user) {
        // Nunca conceder el rol del dueño local a una cuenta Google diferente.
        toast('Google autenticado, pero este correo no tiene usuario en ZoCo.');
      } else {
        // currentUser() lee zoco.session, no state.user: es necesario persistirla.
        localStorage.setItem('zoco.session', JSON.stringify({ userId: user.id, at: Date.now() }));
        state.user = user;
        try { alignCompany(await ensureCompany(oauth.user.user_metadata?.name || email.split('@')[0])); } catch (e) { console.warn('No se pudo vincular empresa', e); }
        state.superadmin = await amISuperadmin();
        route = 'inicio'; location.hash = '#/inicio';
        toast('Bienvenido con Google');
      }
    } catch (e) { console.error('Error de acceso con Google', e); toast('No se pudo completar el acceso con Google'); }
  }
  paintShell();
    setTimeout(() => initInstallPrompt(), 1200);
    setTimeout(() => maybeDailyNotice(), 2500);
    setTimeout(() => { startUpdateWatcher(); initNotifPill(); watchServiceWorker(); startSync(); }, 2000);
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