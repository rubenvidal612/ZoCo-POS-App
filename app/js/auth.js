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
    await safeFetch(`${sbConfig().url}/rest/v1/rpc/bootstrap_company`, {
      method: 'POST', headers: headers(s.access_token),
      body: JSON.stringify({ company_name: name, company_id: id }),
    });
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
export function signInWithGoogle() {
  if (!sbReady()) return false;
  const redirect = location.origin + location.pathname;
  const url = `${sbConfig().url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
  location.href = url;
  return true;
}

/** Lee el #access_token que Supabase devuelve al volver de Google. */
export async function handleOAuthReturn() {
  const hash = location.hash || '';
  if (!hash.includes('access_token=')) return { ok: false };
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.get('type') === 'recovery') { try { sessionStorage.setItem('zoco.recovery', '1'); } catch {} }
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const expires_in = Number(params.get('expires_in') || 3600);
  if (!access_token) return { ok: false };
  try {
    const r = await safeFetch(`${sbConfig().url}/auth/v1/user`, {
      headers: { apikey: sbConfig().key, Authorization: 'Bearer ' + access_token },
    });
    const user = await r.json();
    saveCloudSession({ access_token, refresh_token, expires_in, user, token_type: 'bearer' });
    history.replaceState(null, '', location.pathname + (location.search || ''));
    return { ok: true, user };
  } catch (e) {
    return { ok: false, error: e.message };
  }
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
/* ================= Enlace mágico por correo (sin contraseña) ================= */
export async function sendMagicLink(email) {
  if (!sbReady()) return { ok: false, error: 'Configura Supabase primero' };
  try {
    const redirect = location.origin + location.pathname;
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
    const redirect = location.origin + location.pathname;
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