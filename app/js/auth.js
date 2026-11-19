// Login con Supabase Auth (correo/contraseña) — opcional, convive con el login local
import { sbConfig, sbReady } from './sync.js';

const SESSION = 'zoco.cloud.session';
const T = (ms = 9000) => {
  try { return { signal: AbortSignal.timeout(ms) }; } catch { return {}; }
};
async function safeFetch(url, opts = {}, ms = 9000) {
  return await fetch(url, { ...opts, ...T(ms) });
}

const headers = (token) => ({
  'Content-Type': 'application/json',
  apikey: sbConfig().key,
  Authorization: 'Bearer ' + (token || sbConfig().key),
});

export function cloudSession() {
  try { return JSON.parse(localStorage.getItem(SESSION) || 'null'); } catch { return null; }
}
export function cloudUser() {
  return cloudSession()?.user || null;
}
export function isCloudLogged() {
  return !!cloudSession()?.access_token;
}
export function saveCloudSession(s) {
  localStorage.setItem(SESSION, JSON.stringify(s));
}
export function clearCloudSession() {
  localStorage.removeItem(SESSION);
}

export async function cloudSignIn(email, password) {
  if (!sbReady()) return { ok: false, error: 'Configura Supabase primero' };
  try {
    const r = await safeFetch(`${sbConfig().url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: headers(), ...T(),
      body: JSON.stringify({ email, password }),
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j.error_description || j.msg || 'Correo o contraseña incorrectos' };
    saveCloudSession(j);
    return { ok: true, user: j.user };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function cloudSignUp(email, password, companyName) {
  if (!sbReady()) return { ok: false, error: 'Configura Supabase primero' };
  try {
    const r = await safeFetch(`${sbConfig().url}/auth/v1/signup`, {
      method: 'POST', headers: headers(), ...T(),
      body: JSON.stringify({ email, password }),
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j.msg || j.error_description || 'No se pudo crear la cuenta' };
    // con confirmación de correo desactivada viene la sesión
    if (j.access_token) {
      saveCloudSession(j);
      await bootstrapCompany(companyName || email.split('@')[0]);
      return { ok: true, user: j.user };
    }
    return { ok: true, needConfirm: true, user: j.user || j };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function bootstrapCompany(name) {
  const s = cloudSession();
  if (!s?.access_token) return { ok: false, error: 'Sin sesión' };
  const id = 'co-' + (s.user?.id || Date.now()).slice(0, 8);
  try {
    const r = await safeFetch(`${sbConfig().url}/rest/v1/rpc/bootstrap_company`, {
      method: 'POST', headers: headers(s.access_token),
      body: JSON.stringify({ company_name: name, company_id: id }),
    });
    if (!r.ok) return { ok: false, error: (await r.text()).slice(0, 200) || 'No se pudo crear la empresa' };
    return { ok: true, companyId: id };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function myCompanies() {
  const s = cloudSession();
  if (!s?.access_token) return [];
  try {
    const r = await safeFetch(`${sbConfig().url}/rest/v1/members?select=company_id,role,companies(name)&user_id=eq.${s.user.id}`, { headers: headers(s.access_token) });
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch { return []; }
}

/* ================= Equipo: invitaciones por correo ================= */

/** Reclama invitaciones pendientes dirigidas a mi correo. */
export async function claimInvites() {
  const s = cloudSession();
  if (!s?.access_token) return { ok: false, claimed: 0 };
  const email = String(s.user?.email || '').toLowerCase();
  if (!email) return { ok: true, claimed: 0 };
  try {
    const r = await safeFetch(
      `${sbConfig().url}/rest/v1/members?user_id=is.null&email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: { ...headers(s.access_token), Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: s.user.id }),
      },
    );
    if (!r.ok) return { ok: false, claimed: 0, error: (await r.text()).slice(0, 160) };
    const rows = await r.json();
    const claimed = Array.isArray(rows) ? rows.length : 0;
    if (claimed) logOauth('invitacion', 'aceptadas: ' + claimed);
    return { ok: true, claimed };
  } catch (e) { return { ok: false, claimed: 0, error: e.message }; }
}

/** Lista el equipo (miembros) de una empresa. */
export async function listTeam(companyId) {
  const s = cloudSession();
  if (!s?.access_token) return [];
  try {
    const r = await safeFetch(
      `${sbConfig().url}/rest/v1/members?company_id=eq.${encodeURIComponent(companyId)}&select=id,email,role,user_id,created_at&order=created_at.asc`,
      { headers: headers(s.access_token) },
    );
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch { return []; }
}

/** Invita a un empleado por correo. */
export async function inviteMember(companyId, email, role = 'CASHIER') {
  const s = cloudSession();
  if (!s?.access_token) return { ok: false, error: 'Entra con tu cuenta primero' };
  const mail = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return { ok: false, error: 'Correo inválido' };
  try {
    const team = await listTeam(companyId);
    if (team.some((m) => String(m.email || '').toLowerCase() === mail)) {
      return { ok: false, error: 'Ese correo ya está en el equipo' };
    }
    const r = await safeFetch(`${sbConfig().url}/rest/v1/members`, {
      method: 'POST',
      headers: { ...headers(s.access_token), Prefer: 'return=minimal' },
      body: JSON.stringify({ company_id: companyId, email: mail, role, user_id: null }),
    });
    if (!r.ok) return { ok: false, error: (await r.text()).slice(0, 180) };
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

/** Quita a un miembro (no permite quitar al último dueño). */
export async function removeMember(companyId, memberId) {
  const s = cloudSession();
  if (!s?.access_token) return { ok: false, error: 'Sin sesión' };
  try {
    const r = await safeFetch(`${sbConfig().url}/rest/v1/members?id=eq.${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
      headers: headers(s.access_token),
    });
    if (!r.ok) return { ok: false, error: (await r.text()).slice(0, 180) };
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function amISuperadmin() {
  const s = cloudSession();
  if (!s?.access_token) return false;
  try {
    const r = await safeFetch(`${sbConfig().url}/rest/v1/rpc/am_i_superadmin`, {
      method: 'POST', headers: headers(s.access_token), body: '{}',
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch { return false; }
}

export async function adminCompanies() {
  const s = cloudSession();
  if (!s?.access_token) return [];
  const r = await safeFetch(`${sbConfig().url}/rest/v1/rpc/admin_companies`, {
    method: 'POST', headers: headers(s.access_token), body: '{}',
  });
  if (!r.ok) throw new Error((await r.text()).slice(0, 160));
  return await r.json();
}

export async function adminSetPlan(companyId, plan) {
  const s = cloudSession();
  if (!s?.access_token) return;
  await safeFetch(`${sbConfig().url}/rest/v1/rpc/admin_set_plan`, {
    method: 'POST', headers: headers(s.access_token),
    body: JSON.stringify({ p_company: companyId, p_plan: plan }),
  });
}

export function cloudSignOut() {
  const s = cloudSession();
  if (s?.access_token && sbReady()) {
    fetch(`${sbConfig().url}/auth/v1/logout`, { method: 'POST', headers: headers(s.access_token) }).catch(() => {});
  }
  clearCloudSession();
}

/* ================= Google (OAuth) ================= */
export function logOauth(step, detail = '') {
  try {
    const k = 'zoco.oauth.log';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.push({ t: new Date().toISOString().slice(11, 19), step, detail: String(detail).slice(0, 170) });
    localStorage.setItem(k, JSON.stringify(arr.slice(-12)));
  } catch {}
}

/* ---- utilidades PKCE ---- */
function b64url(bytes) {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function randomVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}
async function sha256B64(txt) {
  const data = new TextEncoder().encode(txt);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return b64url(new Uint8Array(hash));
}
export function decodeJwt(t) {
  try {
    const part = String(t).split('.')[1] || '';
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
    );
    return JSON.parse(json);
  } catch { return null; }
}
export function signInWithGoogle() {
  if (!sbReady()) return false;
  try { sessionStorage.setItem('zoco.oauth.pending', String(Date.now())); } catch {}
  const redirect = location.origin + '/';
  // PKCE: se genera el verificador y se manda el reto SHA-256.
  // Así funciona tanto si el proyecto usa PKCE como si usa implicit.
  const verifier = randomVerifier();
  try { sessionStorage.setItem('zoco.oauth.verifier', verifier); } catch {}
  // Respaldo: si el navegador abre otra pestaña o descarta sessionStorage
  try { localStorage.setItem('zoco.oauth.verifier', verifier); } catch {}
  sha256B64(verifier).then((challenge) => {
    const p = new URLSearchParams({ provider: 'google', redirect_to: redirect });
    if (challenge) {
      p.set('code_challenge', challenge);
      p.set('code_challenge_method', 'S256');
      p.set('flow_type', 'pkce');
    }
    location.href = `${sbConfig().url}/auth/v1/authorize?${p.toString()}`;
  }).catch(() => {
    location.href = `${sbConfig().url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
  });
  return true;
}

/** Lee el #access_token (implicit) o el ?code= (PKCE) que devuelve Supabase. */
export async function handleOAuthReturn() {
  const hash = location.hash || '';
  const search = location.search || '';
  logOauth('vuelta', 'hash=' + (hash ? hash.slice(0, 30) + '…' : 'vacío') + ' | search=' + (search ? search.slice(0, 30) + '…' : 'vacío'));

  // ---------- Flujo PKCE: llega ?code= ----------
  const q = new URLSearchParams(search);
  const code = q.get('code');
  if (code) {
    logOauth('pkce', 'code recibido');
    try {
      const verifier = (() => {
        try {
          return sessionStorage.getItem('zoco.oauth.verifier')
            || localStorage.getItem('zoco.oauth.verifier')
            || '';
        } catch { return ''; }
      })();
      logOauth('pkce-verifier', verifier ? 'encontrado (' + verifier.length + ' chars)' : 'FALTA');
      const r = await safeFetch(`${sbConfig().url}/auth/v1/token?grant_type=pkce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: sbConfig().key },
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.access_token) {
        const msg = j.error_description || j.msg || j.error || ('HTTP ' + r.status);
        logOauth('pkce-fail', msg);
        return { ok: false, error: 'No se pudo completar el acceso con Google: ' + msg };
      }
      let user = j.user || null;
      if (!user?.id) {
        const claims = decodeJwt(j.access_token) || {};
        if (claims.sub) {
          user = { id: claims.sub, email: claims.email || '', user_metadata: claims.user_metadata || {}, app_metadata: claims.app_metadata || {}, _fromToken: true };
        }
      }
      if (!user?.id) return { ok: false, error: 'Google no devolvió una identidad válida.' };
      logOauth('pkce-ok', 'id=' + user.id + ' | email=' + (user.email || '(sin correo)'));
      saveCloudSession({ access_token: j.access_token, refresh_token: j.refresh_token, expires_in: j.expires_in || 3600, user, token_type: 'bearer' });
      try { sessionStorage.removeItem('zoco.oauth.verifier'); } catch {}
      try { localStorage.removeItem('zoco.oauth.verifier'); } catch {}
      history.replaceState(null, '', location.pathname);
      return { ok: true, user };
    } catch (e) {
      logOauth('pkce-err', e.message);
      return { ok: false, error: 'No se pudo completar el acceso con Google.' };
    }
  }

  if (!hash.includes('access_token=')) {
    // Supabase devuelve el motivo cuando algo falla (redirect no permitido, etc.)
    if (hash.includes('error')) {
      const p = new URLSearchParams(hash.replace(/^#/, ''));
      const msg = p.get('error_description') || p.get('error') || 'Error de autenticación';
      return { ok: false, error: decodeURIComponent(msg.replace(/\+/g, ' ')) };
    }
    if (location.search.includes('error')) {
      const p = new URLSearchParams(location.search);
      const msg = p.get('error_description') || p.get('error') || 'Error de autenticación';
      return { ok: false, error: decodeURIComponent(msg.replace(/\+/g, ' ')) };
    }
    return { ok: false };
  }
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.get('type') === 'recovery') { try { sessionStorage.setItem('zoco.recovery', '1'); } catch {} }
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const expires_in = Number(params.get('expires_in') || 3600);
  if (!access_token) return { ok: false };

  let user = null;
  try {
    const r = await safeFetch(`${sbConfig().url}/auth/v1/user`, {
      headers: { apikey: sbConfig().key, Authorization: 'Bearer ' + access_token },
    });
    if (r.ok) user = await r.json();
  } catch {}

  // Respaldo: si la verificación por red falla, se usa el propio token.
  if (!user?.id) {
    const claims = decodeJwt(access_token);
    if (claims?.sub) {
      user = {
        id: claims.sub,
        email: claims.email || '',
        user_metadata: claims.user_metadata || {},
        app_metadata: claims.app_metadata || {},
        _fromToken: true,
      };
    }
  }

  if (!user?.id) return { ok: false, error: 'No se pudo leer tu identidad de Google. Intenta de nuevo.' };
  if (!user.email) {
    const claims = decodeJwt(access_token) || {};
    user.email = claims.email || '';
  }

  logOauth('token', 'id=' + user.id + ' | email=' + (user.email || '(sin correo)') + (user._fromToken ? ' | leido del token' : ' | verificado en red'));
  saveCloudSession({ access_token, refresh_token, expires_in, user, token_type: 'bearer' });
  history.replaceState(null, '', location.pathname + (location.search || ''));
  return { ok: true, user };
}

/** Si el usuario de Google es nuevo, le crea su empresa. */
export async function ensureCompany(name) {
  const s = cloudSession();
  if (!s?.access_token) return { ok: false };
  const companies = await myCompanies();
  if (companies.length) return { ok: true, company: companies[0].company_id, existed: true };
  const r = await bootstrapCompany(name || (s.user?.email || 'mi-negocio').split('@')[0]);
  return { ok: !!r.ok, company: r.companyId, existed: false };
}

/** Alinea el id de empresa local con el de la nube (evita escribir en una empresa inexistente). */
export function alignCompany(res) {
  if (!res?.ok || !res.company) return null;
  try {
    const raw = localStorage.getItem('zoco.pos.v1');
    const st = raw ? JSON.parse(raw) : null;
    if (st && st.currentCompany !== res.company) {
      st.currentCompany = res.company;
      localStorage.setItem('zoco.pos.v1', JSON.stringify(st));
    }
  } catch {}
  return res.company;
}
/* ================= Enlace mágico por correo (sin contraseña) ================= */
export async function sendMagicLink(email) {
  if (!sbReady()) return { ok: false, error: 'Configura Supabase primero' };
  try {
    const redirect = location.origin + '/';
    const r = await safeFetch(`${sbConfig().url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: sbConfig().key },
      body: JSON.stringify({ email, create_user: true }),
    });
    if (!r.ok) {
      const t = await r.text();
      return { ok: false, error: t.slice(0, 160) || 'No se pudo enviar el correo' };
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
/* ================= Recuperar contraseña ================= */
export async function sendRecovery(email) {
  if (!sbReady()) return { ok: false, error: 'Configura Supabase primero' };
  try {
    const redirect = location.origin + '/';
    const r = await safeFetch(`${sbConfig().url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirect)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: sbConfig().key },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) return { ok: false, error: (await r.text()).slice(0, 160) };
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function updatePassword(newPass) {
  const s = cloudSession();
  if (!s?.access_token) return { ok: false, error: 'Sin sesión' };
  try {
    const r = await safeFetch(`${sbConfig().url}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', apikey: sbConfig().key, Authorization: 'Bearer ' + s.access_token },
      body: JSON.stringify({ password: newPass }),
    });
    if (!r.ok) return { ok: false, error: (await r.text()).slice(0, 160) };
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

export function isRecoveryReturn() {
  try { return sessionStorage.getItem('zoco.recovery') === '1'; } catch { return false; }
}
export function clearRecoveryFlag() {
  try { sessionStorage.removeItem('zoco.recovery'); } catch {}
}
/* ================= Comisiones (superadmin) ================= */
export async function adminCommissions() {
  const s = cloudSession();
  if (!s?.access_token) return [];
  try {
    const r = await safeFetch(`${sbConfig().url}/rest/v1/rpc/admin_company_commissions`, {
      method: 'POST', headers: headers(s.access_token), body: '{}',
    });
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

export async function adminSetCommission(companyId, commissionId, status) {
  const s = cloudSession();
  if (!s?.access_token) return { ok: false, error: 'Sin sesión' };
  try {
    const r = await safeFetch(`${sbConfig().url}/rest/v1/rpc/admin_set_commission`, {
      method: 'POST', headers: headers(s.access_token),
      body: JSON.stringify({ p_company: companyId, p_commission: commissionId, p_status: status }),
    });
    if (!r.ok) return { ok: false, error: (await r.text()).slice(0, 160) };
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
/**
 * Acceso con Google: garantiza que la cuenta tenga acceso a ZoCo.
 * - Si el correo ya existe como usuario local, entra con ese usuario.
 * - Si no existe, crea el usuario (rol de la nube si ya tiene empresa; si no, dueño
 *   cuando el equipo no tiene dueño, o cajero cuando ya lo tiene).
 * Devuelve { ok, user, created }.
 */
export async function googleSignIn(guser) {
  const email = String(guser?.email || '').toLowerCase();
  if (!email) return { ok: false, error: 'Google no devolvió correo' };
  const name = guser?.user_metadata?.name || guser?.user_metadata?.full_name || email.split('@')[0];

  const st = (() => {
    try { return JSON.parse(localStorage.getItem('zoco.pos.v1') || 'null'); } catch { return null; }
  })();
  const users = Array.isArray(st?.users) ? st.users : [];
  logOauth('local', 'usuarios=' + users.length + ' | busca=' + email);
  let user = users.find((u) => u.active !== false && String(u.email || '').toLowerCase() === email);
  let created = false;

  if (!user) {
    let cloudRole = '';
    let cloudCompany = '';
    try {
      const companies = await myCompanies();
      if (companies.length) {
        cloudCompany = companies[0].company_id || '';
        cloudRole = String(companies[0].role || '').toUpperCase();
      }
    } catch {}

    const roles = ['OWNER', 'ADMIN', 'CASHIER', 'STOCK', 'ACCOUNT'];
    const role = roles.includes(cloudRole)
      ? cloudRole
      : (users.some((u) => String(u.role).toUpperCase() === 'OWNER') ? 'CASHIER' : 'OWNER');

    user = {
      id: 'u-' + Math.random().toString(36).slice(2, 9),
      name, email, role, pin: '1234', active: true,
      jobTitle: role === 'OWNER' ? 'Propietario' : 'Vendedor',
      payType: 'HOURLY', payRate: 60,
    };
    created = true;
    return { ok: true, user, created, cloudCompany, needsState: true, role };
  }

  return { ok: true, user, created: false };
}