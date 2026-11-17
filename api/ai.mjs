// Proxy de IA para Vercel (serverless) — evita CORS y problemas de TLS
export const config = { runtime: 'edge' };

function upper(s) {
  if (!s || typeof s !== 'object') return s;
  const out = Array.isArray(s) ? [] : {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'type' && typeof v === 'string') out[k] = v.toUpperCase();
    else if (k === 'properties') { out[k] = {}; for (const [pk, pv] of Object.entries(v)) out[k][pk] = upper(pv); }
    else out[k] = upper(v);
  }
  return out;
}


/* ---------- Llave cifrada por empresa (Supabase, service role) ---------- */
const env = (k) => (typeof process !== 'undefined' ? process.env?.[k] : '') || '';

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function decryptKey(b64) {
  const raw = b64ToBytes(b64);
  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const cipher = raw.slice(28);
  const joined = new Uint8Array(cipher.length + tag.length);
  joined.set(cipher, 0); joined.set(tag, cipher.length);
  const kekBytes = b64ToBytes(env('ZOCO_KEK'));
  const k = await crypto.subtle.importKey('raw', kekBytes, 'AES-GCM', false, ['decrypt']);
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, k, joined);
  return new TextDecoder().decode(buf);
}

async function storedKey(company, authHeader) {
  const url = env('SUPABASE_URL');
  const svc = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !svc) return '';
  // valida que el usuario pertenezca a la empresa
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return '';
  const u = await fetch(`${url}/auth/v1/user`, { headers: { apikey: svc, Authorization: 'Bearer ' + token } });
  if (!u.ok) return '';
  const user = await u.json();
  if (!user?.id) return '';
  const m = await fetch(`${url}/rest/v1/members?user_id=eq.${encodeURIComponent(user.id)}&company_id=eq.${encodeURIComponent(company)}&select=role`,
    { headers: { apikey: svc, Authorization: 'Bearer ' + svc } });
  const rows = m.ok ? await m.json() : [];
  if (!Array.isArray(rows) || !rows.length) return '';
  const s = await fetch(`${url}/rest/v1/company_secrets?company_id=eq.${encodeURIComponent(company)}&select=encrypted`,
    { headers: { apikey: svc, Authorization: 'Bearer ' + svc } });
  const sr = s.ok ? await s.json() : [];
  if (!Array.isArray(sr) || !sr.length) return '';
  try { return await decryptKey(sr[0].encrypted); } catch { return ''; }
}
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const { provider, model, baseUrl, messages = [], system = '', tools = [], images = [] } = body;
  let { key } = body;

  // Si el cliente no manda llave, se usa la guardada cifrada de su empresa
  if (!key && body.company) {
    try { key = await storedKey(body.company, req.headers.get('authorization') || ''); } catch {}
  }
  if (!key) return json({ error: 'Falta API key (configúrala en Configuración → Agente IA)' });

  const imgs = (Array.isArray(images) ? images : []).map((d) => {
    const m = String(d).match(/^data:([^;]+);base64,(.*)$/);
    return m ? { mime: m[1], b64: m[2] } : null;
  }).filter(Boolean);

  try {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      const r = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m, i) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }, ...(i === messages.length - 1 && imgs.length ? imgs.map((im) => ({ inline_data: { mime_type: im.mime, data: im.b64 } })) : [])],
          })),
          tools: tools.length ? [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: upper(t.parameters) })) }] : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) return json({ error: 'Gemini ' + r.status + ': ' + JSON.stringify(j).slice(0, 300) });
      const parts = j.candidates?.[0]?.content?.parts || [];
      return json({
        text: parts.filter((p) => p.text).map((p) => p.text).join(''),
        calls: parts.filter((p) => p.functionCall).map((p) => ({ name: p.functionCall.name, args: p.functionCall.args || {} })),
      });
    }

    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model, max_tokens: 900, system,
          messages: messages.map((m, i) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: (i === messages.length - 1 && imgs.length)
              ? [{ type: 'text', text: m.content }, ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.b64 } }))]
              : m.content,
          })),
          tools: tools.length ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) return json({ error: 'Anthropic ' + r.status + ': ' + JSON.stringify(j).slice(0, 300) });
      const blocks = j.content || [];
      return json({
        text: blocks.filter((b) => b.type === 'text').map((b) => b.text).join(''),
        calls: blocks.filter((b) => b.type === 'tool_use').map((b) => ({ name: b.name, args: b.input || {} })),
      });
    }

    const base = provider === 'openai' ? 'https://api.openai.com/v1'
      : provider === 'deepseek' ? 'https://api.deepseek.com'
      : String(baseUrl || '').replace(/\/$/, '');
    const r = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...messages.map((m, i) => (
          i === messages.length - 1 && imgs.length
            ? { role: m.role, content: [{ type: 'text', text: m.content || 'Analiza la imagen' }, ...imgs.map((im) => ({ type: 'image_url', image_url: { url: 'data:' + im.mime + ';base64,' + im.b64 } }))] }
            : m
        ))],
        tools: tools.length ? tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
        temperature: 0.7,
      }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: (j.error?.message || JSON.stringify(j)).slice(0, 300) });
    const msg = j.choices?.[0]?.message || {};
    return json({
      text: msg.content || '',
      calls: (msg.tool_calls || []).map((tc) => {
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
        return { name: tc.function.name, args };
      }),
    });
  } catch (e) {
    return json({ error: String(e.message || e) });
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
