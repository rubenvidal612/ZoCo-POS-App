// Web Push sin dependencias: VAPID (ES256) + cifrado aes128gcm (RFC 8291)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/* ---------- Llaves VAPID (se generan una vez y se guardan) ---------- */
export function loadVapid(dataDir) {
  const file = path.join(dataDir, 'vapid.json');
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (j.publicKey && j.privateKey) return j;
  } catch {}
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const priv = ecdh.getPrivateKey();
  const pub = ecdh.getPublicKey(); // 65 bytes sin comprimir
  const vapid = {
    publicKey: b64u(pub),
    privateKey: b64u(priv),
    subject: 'mailto:admin@zoco.app',
  };
  try { fs.writeFileSync(file, JSON.stringify(vapid, null, 2)); } catch {}
  return vapid;
}

/* ---------- Suscripciones (una por dispositivo) ---------- */
export function loadSubs(dataDir) {
  try { return JSON.parse(fs.readFileSync(path.join(dataDir, 'push-subs.json'), 'utf8')); } catch { return []; }
}
export function saveSubs(dataDir, subs) {
  try { fs.writeFileSync(path.join(dataDir, 'push-subs.json'), JSON.stringify(subs, null, 2)); } catch {}
}

/* ---------- JWT para VAPID ---------- */
function vapidJwt(endpoint, vapid) {
  const aud = new URL(endpoint).origin;
  const header = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64u(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject,
  }));
  const data = Buffer.from(header + '.' + payload);
  const key = crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: vapid.privateKey, x: b64u(fromB64u(vapid.publicKey).subarray(1, 33)), y: b64u(fromB64u(vapid.publicKey).subarray(33, 65)) },
    format: 'jwk',
  });
  const sig = crypto.sign('sha256', data, { key, dsaEncoding: 'ieee-p1363' });
  return header + '.' + payload + '.' + b64u(sig);
}

/* ---------- Cifrado del payload (aes128gcm) ---------- */
function encryptPayload(payload, p256dh, authSecret) {
  const uaPublic = fromB64u(p256dh);       // 65 bytes
  const auth = fromB64u(authSecret);       // 16 bytes
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);

  const salt = crypto.randomBytes(16);
  const hkdf = (ikm, saltBuf, info, len) =>
    Buffer.from(crypto.hkdfSync('sha256', ikm, saltBuf, info, len));

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), Buffer.from(uaPublic), Buffer.from(asPublic)]);
  const ikm = hkdf(shared, auth, keyInfo, 32);

  const cek = hkdf(ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12);

  const record = Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([2])]);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096, 0);
  const idlen = Buffer.from([asPublic.length]);

  return Buffer.concat([salt, rs, idlen, Buffer.from(asPublic), encrypted]);
}

/* ---------- Envío ---------- */
export async function sendPush(sub, payload, vapid) {
  const body = encryptPayload(JSON.stringify(payload), sub.keys.p256dh, sub.keys.auth);
  const jwt = vapidJwt(sub.endpoint, vapid);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '43200',
      Urgency: 'high',
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
    },
    body,
  });
  return { status: res.status, text: res.status >= 400 ? (await res.text()).slice(0, 200) : '' };
}
