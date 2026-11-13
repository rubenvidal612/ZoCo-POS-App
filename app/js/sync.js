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

const headers = () => ({
  'Content-Type': 'application/json',
  apikey: sbConfig().key,
  Authorization: 'Bearer ' + sbConfig().key,
});

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
    const body = { company_id: c, data: state, rev, updated_at: new Date().toISOString() };
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

/** Arranca: escucha online/offline y sincroniza cada 60 s si hay red. */
export function startSync() {
  if (!sbReady()) return;
  window.addEventListener('online', () => syncNow());
  setInterval(() => { if (navigator.onLine && isDirty()) pushCloud(); }, 60000);
  setTimeout(() => pullCloud(), 2500);
}
