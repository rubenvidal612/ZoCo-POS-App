// /api/secret — guarda la llave de IA de cada empresa CIFRADA en Supabase.
// Requiere variables de entorno en Vercel:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ZOCO_KEK (32 bytes en base64)
// La llave nunca se devuelve al navegador.
export const config = { runtime: 'edge' };

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });

const env = (k) => {
  if (typeof process === 'undefined') return '';
  const v = process.env?.[k];
  if (v) return v;
  // respaldo: nombres estilo Next.js para la URL pública
  if (k === 'SUPABASE_URL') return process.env?.NEXT_PUBLIC_SUPABASE_URL || '';
  return '';
};

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

async function kek() {
  const raw = env('ZOCO_KEK');
  if (!raw) throw new Error('Falta ZOCO_KEK');
  const bytes = b64ToBytes(raw);
  if (bytes.length !== 32) throw new Error('ZOCO_KEK debe ser de 32 bytes en base64');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

// formato: iv(12) | tag(16) | cipher  (compatible con el servidor local)
export async function encryptKey(txt) {
  const key = await kek();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(String(txt));
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const all = new Uint8Array(buf);
  const cipher = all.slice(0, all.length - 16);
  const tag = all.slice(all.length - 16);
  const out = new Uint8Array(12 + 16 + cipher.length);
  out.set(iv, 0); out.set(tag, 12); out.set(cipher, 28);
  return bytesToB64(out);
}

export async function decryptKey(b64) {
  const key = await kek();
  const raw = b64ToBytes(b64);
  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const cipher = raw.slice(28);
  const joined = new Uint8Array(cipher.length + tag.length);
  joined.set(cipher, 0); joined.set(tag, cipher.length);
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, joined);
  return new TextDecoder().decode(buf);
}

async function whoAmI(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + token },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u?.id ? u : null;
}

async function isMember(userId, companyId) {
  const r = await fetch(
    `${env('SUPABASE_URL')}/rest/v1/members?user_id=eq.${encodeURIComponent(userId)}&company_id=eq.${encodeURIComponent(companyId)}&select=role`,
    { headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY') } },
  );
  if (!r.ok) return false;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length > 0;
}

export default async function handler(req) {
  if (!env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) {
    return json({ ok: false, error: 'Falta configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Vercel' }, 500);
  }
  const url = new URL(req.url);
  const company = String(url.searchParams.get('c') || url.searchParams.get('company') || 'default');

  const user = await whoAmI(req);
  if (!user) return json({ ok: false, error: 'Sesión no válida' }, 401);
  if (!(await isMember(user.id, company))) return json({ ok: false, error: 'Sin acceso a esta empresa' }, 403);

  if (req.method === 'GET') {
    const r = await fetch(
      `${env('SUPABASE_URL')}/rest/v1/company_secrets?company_id=eq.${encodeURIComponent(company)}&select=provider,updated_at`,
      { headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY') } },
    );
    const rows = r.ok ? await r.json() : [];
    return json({ ok: true, hasKey: Array.isArray(rows) && rows.length > 0, provider: rows?.[0]?.provider || null, updatedAt: rows?.[0]?.updated_at || null });
  }

  if (req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch {}
    const key = String(body.key || '').trim();
    const provider = String(body.provider || '').trim();
    const svc = { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY'), 'Content-Type': 'application/json' };

    if (!key) {
      await fetch(`${env('SUPABASE_URL')}/rest/v1/company_secrets?company_id=eq.${encodeURIComponent(company)}`, { method: 'DELETE', headers: svc });
      return json({ ok: true, hasKey: false });
    }
    const encrypted = await encryptKey(key);
    const r = await fetch(`${env('SUPABASE_URL')}/rest/v1/company_secrets`, {
      method: 'POST',
      headers: { ...svc, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ company_id: company, encrypted, provider, updated_at: new Date().toISOString() }]),
    });
    if (!r.ok) return json({ ok: false, error: (await r.text()).slice(0, 200) }, 500);
    return json({ ok: true, hasKey: true });
  }

  return json({ ok: false, error: 'Método no permitido' }, 405);
}
