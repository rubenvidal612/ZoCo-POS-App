// Sincronización híbrida: local-first + Supabase (opcional)
import { state, emit } from './store.js';

const CFG = 'zoco.supabase';
const DIRTY = 'zoco.sync.dirty';
const LAST = 'zoco.sync.last';

export function sbConfig() {
  let local = {};
  try { local = JSON.parse(localStorage.getItem(CFG) || '{}'); } catch {}
  const def = window.ZOCO_CONFIG || {};
  return {
    url: local.url || def.supabaseUrl || '',
    key: local.key || def.supabaseKey || '',
  };
}
export function setSbConfig(url, key) {
  localStorage.setItem(CFG, JSON.stringify({ url: String(url || '').replace(/\/$/, ''), key: key || '' }));
}
export function sbReady() {
  const c = sbConfig();
  return !!(c.url && c.key);
}

const T = (ms = 9000) => { try { return { signal: AbortSignal.timeout(ms) }; } catch { return {}; } };

// usa el token del usuario logueado (RLS lo necesita); si no hay sesión, cae a la anon key
const authToken = () => {
  try {
    const s = JSON.parse(localStorage.getItem('zoco.cloud.session') || 'null');
    if (s && s.access_token) return s.access_token;
  } catch {}
  return '';
};

const headers = () => ({
  'Content-Type': 'application/json',
  apikey: sbConfig().key,
  Authorization: 'Bearer ' + (authToken() || sbConfig().key),
});

export const hasCloudSession = () => !!authToken();

const company = () => state.currentCompany || 'default';
const markDirty = (v) => { try { localStorage.setItem(DIRTY, v ? '1' : '0'); } catch {} };
export const isDirty = () => { try { return localStorage.getItem(DIRTY) === '1'; } catch { return false; } };

/** Sube el estado local a la nube (incrementa rev). */
export async function pushCloud() {
  if (!sbReady()) return { ok: false, error: 'Sin configurar' };
  const c = company();
  try {
    const cur = await fetch(`${sbConfig().url}/rest/v1/company_state?company_id=eq.${encodeURIComponent(c)}&select=rev`, { headers: headers() });
    const rows = await cur.json();
    const rev = Array.isArray(rows) && rows[0] ? Number(rows[0].rev) + 1 : 1;
    // nunca subir la llave de IA al estado sincronizado
    const clean = { ...state, settings: { ...(state.settings || {}) } };
    if (clean.settings) { delete clean.settings.aiKey; }
    const body = { company_id: c, data: clean, rev, updated_at: new Date().toISOString() };
    const r = await fetch(`${sbConfig().url}/rest/v1/company_state`, {
      method: 'POST', ...T(12000),
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error((await r.text()).slice(0, 200));
    markDirty(false);
    localStorage.setItem(LAST, new Date().toISOString());
    return { ok: true, rev };
  } catch (e) {
    markDirty(true);
    return { ok: false, error: e.message };
  }
}

/** Cuenta registros "reales" de un estado (para saber si tiene negocio dentro). */
function peso(d) {
  if (!d || typeof d !== 'object') return 0;
  return (d.products || []).length + (d.sales || []).length + (d.customers || []).length
    + (d.purchases || []).length + (d.expenses || []).length + (d.layaways || []).length;
}

/** Baja el estado de la nube si es más nuevo que el local. */
export async function pullCloud(force = false) {
  if (!sbReady()) return { ok: false, error: 'Sin configurar' };
  const c = company();
  try {
    const r = await fetch(`${sbConfig().url}/rest/v1/company_state?company_id=eq.${encodeURIComponent(c)}&select=data,rev,updated_at`, { headers: headers() });
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return { ok: true, empty: true };
    const row = rows[0];
    const remoteRev = Number(row.rev || 0);
    const localRev = Number(state.rev || 0);
    if (!force && remoteRev <= localRev && !isDirty()) return { ok: true, skipped: true, rev: remoteRev };

    // PROTECCIÓN: nunca reemplazar un negocio con datos por una nube vacía.
    const pRemote = peso(row.data);
    const pLocal = peso(state);
    if (pLocal > 0 && pRemote === 0) {
      return { ok: true, skipped: true, rev: remoteRev, reason: 'cloud-vacia' };
    }
    // Y si lo local es más nuevo, no se pisa con una revisión vieja.
    if (pLocal > 0 && remoteRev < localRev) {
      return { ok: true, skipped: true, rev: remoteRev, reason: 'local-mas-nuevo' };
    }

    if (row.data && typeof row.data === 'object' && Object.keys(row.data).length) {
      Object.assign(state, row.data);
      state.rev = remoteRev;
      try { localStorage.setItem('zoco.pos.v1', JSON.stringify(state)); } catch {}
      emit();
    }
    return { ok: true, rev: remoteRev, updated_at: row.updated_at };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Sincroniza: sube si hay cambios locales pendientes; si no, baja. */
export async function syncNow() {
  if (!sbReady()) return { ok: false, error: 'Sin configurar' };
  if (isDirty()) {
    const up = await pushCloud();
    if (!up.ok) return up;
  }
  return pullCloud(true);
}

export async function testConnection() {
  if (!sbReady()) return { ok: false, error: 'Falta URL o key' };
  try {
    const r = await fetch(`${sbConfig().url}/rest/v1/companies?select=id&limit=1`, { headers: headers() });
    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status + ' ' + (await r.text()).slice(0, 120) };
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

let readyToPush = false;
let pushTimer = null;

function schedulePush() {
  if (!readyToPush) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    if (navigator.onLine) pushCloud();
  }, 1500);
}

/** Arranca: sube cambios, escucha online/offline y sincroniza cada 45 s. */
export function startSync() {
  if (!sbReady()) return;

  // cualquier cambio local marca pendiente y programa subida
  window.addEventListener('zoco:save', () => { markDirty(true); schedulePush(); });
  window.addEventListener('online', () => { if (isDirty()) pushCloud(); else pullCloud(true); });

  // primera bajada: trae lo que haya en la nube antes de permitir subir
  setTimeout(async () => {
    let pulled = null;
    try { pulled = await pullCloud(); } catch {}
    readyToPush = true;
    // Si la nube está vacía y este equipo ya tiene negocio, se sube solo.
    try {
      const hasLocal = ((state.products || []).length + (state.sales || []).length + (state.customers || []).length) > 0;
      const revLocal = Number(state.rev || 0);
      if (hasLocal && revLocal === 0 && (pulled?.empty || pulled?.rev === 0)) {
        const up = await pushCloud();
        if (up.ok) {
          window.dispatchEvent(new CustomEvent('zoco:cloud-bootstrapped', { detail: { rev: up.rev } }));
        }
      }
    } catch {}
    if (isDirty()) schedulePush();
  }, 2500);

  // red de seguridad: cada 45 s sube pendientes o baja cambios
  setInterval(() => {
    if (!navigator.onLine) return;
    if (isDirty()) pushCloud(); else pullCloud(true);
  }, 45000);
}
