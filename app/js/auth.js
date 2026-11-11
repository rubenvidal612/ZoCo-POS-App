// Login con Supabase Auth (correo/contraseña) — opcional, convive con el login local
import { sbConfig, sbReady } from './sync.js';

const SESSION = 'zoco.cloud.session';

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
    const r = await fetch(`${sbConfig().url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: headers(),
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
    const r = await fetch(`${sbConfig().url}/auth/v1/signup`, {
      method: 'POST', headers: headers(),
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
    await fetch(`${sbConfig().url}/rest/v1/rpc/bootstrap_company`, {
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
    const r = await fetch(`${sbConfig().url}/rest/v1/members?select=company_id,role,companies(name)&user_id=eq.${s.user.id}`, { headers: headers(s.access_token) });
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch { return []; }
}

export async function amISuperadmin() {
  const s = cloudSession();
  if (!s?.access_token) return false;
  try {
    const r = await fetch(`${sbConfig().url}/rest/v1/rpc/am_i_superadmin`, {
      method: 'POST', headers: headers(s.access_token), body: '{}',
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch { return false; }
}

export async function adminCompanies() {
  const s = cloudSession();
  if (!s?.access_token) return [];
  const r = await fetch(`${sbConfig().url}/rest/v1/rpc/admin_companies`, {
    method: 'POST', headers: headers(s.access_token), body: '{}',
  });
  if (!r.ok) throw new Error((await r.text()).slice(0, 160));
  return await r.json();
}

export async function adminSetPlan(companyId, plan) {
  const s = cloudSession();
  if (!s?.access_token) return;
  await fetch(`${sbConfig().url}/rest/v1/rpc/admin_set_plan`, {
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
