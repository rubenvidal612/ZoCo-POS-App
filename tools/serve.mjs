// Servidor ZoCo POS: estático + API mínima con persistencia en disco (sin dependencias)
// Nota: algunas redes/antivirus interceptan TLS con un certificado propio.
// Para que el proxy de IA pueda salir a internet en esas redes, se relaja la verificación
// SOLO en este proceso local. Si tu red no intercepta TLS, puedes quitar la línea siguiente.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import http from 'node:http';
import { loadVapid, loadSubs, saveSubs, sendPush } from './push.mjs';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..', 'app');
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PORT = Number(process.env.PORT || 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

fs.mkdirSync(DATA_DIR, { recursive: true });

function dbFile(company) {
  const c = String(company || 'default').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'default';
  return path.join(DATA_DIR, 'zoco-' + c + '.json');
}
function readDb(company) {
  try { return JSON.parse(fs.readFileSync(dbFile(company), 'utf8')); } catch { return null; }
}
function writeDb(company, obj) {
  const f = dbFile(company);
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, f);
}

/* ---------- Push ---------- */
const VAPID = loadVapid(DATA_DIR);

async function pushTo(subs, payload) {
  let ok = 0, dead = 0, fail = 0;
  const alive = [];
  for (const s of subs) {
    try {
      const r = await sendPush(s, payload, VAPID);
      if (r.status >= 200 && r.status < 300) { ok++; alive.push(s); }
      else if (r.status === 404 || r.status === 410) { dead++; console.log('[push] dead', r.status); }
      else { fail++; alive.push(s); console.log('[push] error', r.status, r.text); }
    } catch (e) {
      fail++; alive.push(s);
      console.log('[push] excepción', e.message);
    }
  }
  if (dead) saveSubs(DATA_DIR, alive);
  return { ok, dead, fail };
}

/** Avisa a los dispositivos del dueño/admin cuando entra una venta nueva. */
async function notifyNewSales(company, sales) {
  const db = readDb(company) || {};
  if (!db.settings?.saleNotifications) return;
  const subs = loadSubs(DATA_DIR).filter((s) => s.company === company && ['owner', 'admin'].includes(s.role));
  if (!subs.length) return;
  for (const sale of sales.slice(0, 3)) {
    const r = await pushTo(subs, {
      title: '💰 Nueva venta ' + (sale.code || ''),
      body: '$' + Number(sale.total || 0).toLocaleString('es-MX') + ' · ' + (sale.user || '') + ' · ' + (sale.items?.length || 0) + ' art.',
      url: '/#/ventas',
      tag: 'sale-' + (sale.id || sale.code),
    });
    console.log('[push] venta', sale.code, JSON.stringify(r));
  }
}
function listCompanies() {
  return fs.readdirSync(DATA_DIR)
    .filter((f) => f.startsWith('zoco-') && f.endsWith('.json'))
    .map((f) => f.slice(5, -5));
}

/* ---------- Proxy de IA (evita CORS del navegador) ---------- */
function upperSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = Array.isArray(s) ? [] : {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'type' && typeof v === 'string') out[k] = v.toUpperCase();
    else if (k === 'properties') { out[k] = {}; for (const [pk, pv] of Object.entries(v)) out[k][pk] = upperSchema(pv); }
    else out[k] = upperSchema(v);
  }
  return out;
}

async function callProvider({ provider, key, model, baseUrl, messages, system, tools = [], images = [] }) {
  if (!key) return { error: 'Falta API key' };
  const msgs = Array.isArray(messages) ? messages : [];
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
          systemInstruction: { parts: [{ text: system || '' }] },
          contents: msgs.map((m, idx) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }, ...(idx === msgs.length - 1 && imgs.length ? imgs.map((im) => ({ inline_data: { mime_type: im.mime, data: im.b64 } })) : [])],
          })),
          tools: tools.length ? [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: upperSchema(t.parameters) })) }] : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) return { error: 'Gemini ' + r.status + ': ' + JSON.stringify(j).slice(0, 300) };
      const parts = j.candidates?.[0]?.content?.parts || [];
      return {
        text: parts.filter((p) => p.text).map((p) => p.text).join(''),
        calls: parts.filter((p) => p.functionCall).map((p) => ({ name: p.functionCall.name, args: p.functionCall.args || {} })),
      };
    }

    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model, max_tokens: 900, system: system || '',
          messages: msgs.map((m, idx) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: (idx === msgs.length - 1 && imgs.length)
              ? [{ type: 'text', text: m.content }, ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.b64 } }))]
              : m.content,
          })),
          tools: tools.length ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) return { error: 'Anthropic ' + r.status + ': ' + JSON.stringify(j).slice(0, 300) };
      const blocks = j.content || [];
      return {
        text: blocks.filter((b) => b.type === 'text').map((b) => b.text).join(''),
        calls: blocks.filter((b) => b.type === 'tool_use').map((b) => ({ name: b.name, args: b.input || {} })),
      };
    }

    const base = provider === 'openai' ? 'https://api.openai.com/v1'
      : provider === 'deepseek' ? 'https://api.deepseek.com'
      : String(baseUrl || '').replace(/\/$/, '');
    const r = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system || '' }, ...msgs.map((m, idx) => (
          idx === msgs.length - 1 && imgs.length
            ? { role: m.role, content: [{ type: 'text', text: m.content || 'Describe la imagen' }, ...imgs.map((im) => ({ type: 'image_url', image_url: { url: 'data:' + im.mime + ';base64,' + im.b64 } }))] }
            : m
        ))],
        tools: tools.length ? tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
        temperature: 0.7,
      }),
    });
    const j = await r.json();
    if (!r.ok) return { error: (j.error?.message || JSON.stringify(j)).slice(0, 300) };
    const msg = j.choices?.[0]?.message || {};
    return {
      text: msg.content || '',
      calls: (msg.tool_calls || []).map((tc) => {
        let args = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
        return { name: tc.function.name, args };
      }),
    };
  } catch (e) {
    const cause = e && e.cause ? ' (' + (e.cause.code || e.cause.message || String(e.cause)) + ')' : '';
    return { error: String(e.message || e) + cause };
  }
}

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 8e6) reject(new Error('too large')); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : null); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);

  /* ---------- API ---------- */
  if (url.startsWith('/api/')) {
    try {
      const q = new URL(req.url, 'http://x').searchParams;
      const company = q.get('c') || 'default';

      if (url === '/api/state' && req.method === 'GET') {
        const db = readDb(company);
        if (!db) return json(res, 404, { ok: false, error: 'sin datos', companies: listCompanies() });
        return json(res, 200, db);
      }
      if (url === '/api/state' && req.method === 'POST') {
        const body = await readBody(req);
        if (!body || typeof body !== 'object') return json(res, 400, { ok: false, error: 'payload inválido' });
        const current = readDb(company) || {};
        const next = {
          ...current, ...body,
          updatedAt: new Date().toISOString(),
          rev: (current.rev || 0) + 1,
        };
        writeDb(company, next);
        // Avisos push de ventas nuevas (a dueño/admin de esa empresa)
        try {
          const prevIds = new Set((current.sales || []).map((s) => s.id));
          const fresh = (next.sales || []).filter((s) => !prevIds.has(s.id) && s.status === 'done');
          if (fresh.length) notifyNewSales(company, fresh);
        } catch {}
        return json(res, 200, { ok: true, rev: next.rev });
      }

      if (url === '/api/push/key') {
        return json(res, 200, { ok: true, key: VAPID.publicKey });
      }
      if (url === '/api/push/subscribe' && req.method === 'POST') {
        const body = await readBody(req);
        if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
          return json(res, 400, { ok: false, error: 'suscripción inválida' });
        }
        const subs = loadSubs(DATA_DIR).filter((s) => s.endpoint !== body.endpoint);
        subs.push({
          endpoint: body.endpoint,
          keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
          company: body.company || company,
          userId: body.userId || null,
          role: body.role || 'owner',
          ua: String(req.headers['user-agent'] || '').slice(0, 120),
          created: new Date().toISOString(),
        });
        saveSubs(DATA_DIR, subs);
        return json(res, 200, { ok: true, total: subs.length });
      }
      if (url === '/api/push/test' && req.method === 'POST') {
        const body = await readBody(req) || {};
        const subs = loadSubs(DATA_DIR).filter((s) => !body.company || s.company === body.company);
        const sent = await pushTo(subs, {
          title: body.title || '🔔 Prueba ZoCo',
          body: body.body || 'Si ves esto, las notificaciones funcionan',
          url: '/',
          tag: 'zoco-test',
        });
        return json(res, 200, { ok: true, ...sent });
      }
      if (url === '/api/companies') {
        const list = listCompanies().map((id) => {
          const db = readDb(id);
          return { id, name: (db?.company?.name) || id };
        });
        return json(res, 200, { ok: true, companies: list });
      }
      if (url === '/api/ai' && req.method === 'POST') {
        const body = await readBody(req);
        const out = await callProvider(body || {});
        return json(res, 200, out);
      }
      if (url === '/api/print' && req.method === 'POST') {
        const body = await readBody(req);
        const host = body?.host, port = Number(body?.port) || 9100, b64 = body?.data;
        if (!host || !b64) return json(res, 400, { ok: false, error: 'host y data requeridos' });
        const bytes = Buffer.from(b64, 'base64');
        await new Promise((resolve, reject) => {
          const s = net.connect(port, host, () => { s.write(bytes, () => s.end()); });
          s.on('error', reject);
          s.on('close', resolve);
          setTimeout(() => { s.destroy(); reject(new Error('timeout')); }, 5000);
        });
        return json(res, 200, { ok: true });
      }
      if (url === '/api/health') {
        const db = readDb(company);
        return json(res, 200, { ok: true, hasData: !!db, rev: db?.rev || 0, updatedAt: db?.updatedAt || null, companies: listCompanies() });
      }
      return json(res, 404, { ok: false, error: 'ruta no encontrada' });
    } catch (e) {
      return json(res, 500, { ok: false, error: String(e.message || e) });
    }
  }

  /* ---------- Estático ---------- */
  let file = path.join(APP, url === '/' ? 'index.html' : url);
  if (!file.startsWith(APP)) { res.writeHead(403).end('forbidden'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) file = path.join(APP, 'index.html');
    fs.readFile(file, (e, buf) => {
      if (e) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(buf);
    });
  });
});

server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`ZoCo POS → http://localhost:${PORT}  (LAN: http://<tu-ip>:${PORT})`);
  console.log(`API → http://localhost:${PORT}/api/health`);
});
