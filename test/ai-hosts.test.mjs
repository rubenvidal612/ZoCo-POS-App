// Pruebas del allowlist del proxy de IA: la llave nunca puede salir hacia un host arbitrario.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBaseUrl, parseHostList } from '../api/ai-hosts.mjs';

test('los proveedores conocidos usan su host fijo e ignoran baseUrl del cliente', () => {
  for (const [p, host] of [['openai', 'api.openai.com'], ['deepseek', 'api.deepseek.com'], ['gemini', 'generativelanguage.googleapis.com'], ['anthropic', 'api.anthropic.com']]) {
    const r = resolveBaseUrl({ provider: p, baseUrl: 'https://attacker.example' });
    assert.equal(r.ok, true);
    assert.equal(r.host, host);
    assert.ok(r.base.startsWith('https://'));
  }
});

test('custom sin baseUrl falla', () => {
  const r = resolveBaseUrl({ provider: 'custom' });
  assert.equal(r.ok, false);
});

test('custom con http falla', () => {
  assert.equal(resolveBaseUrl({ provider: 'custom', baseUrl: 'http://mi-servidor.local' }).ok, false);
});

test('custom con host no autorizado falla', () => {
  const r = resolveBaseUrl({ provider: 'custom', baseUrl: 'https://attacker.example/v1' });
  assert.equal(r.ok, false);
  assert.match(r.error, /Destino no autorizado/);
});

test('custom con credenciales o puerto raro falla', () => {
  assert.equal(resolveBaseUrl({ provider: 'custom', baseUrl: 'https://user:pass@api.openai.com' }).ok, false);
  assert.equal(resolveBaseUrl({ provider: 'custom', baseUrl: 'https://api.openai.com:8443' }).ok, false);
});

test('localhost no está autorizado', () => {
  assert.equal(resolveBaseUrl({ provider: 'custom', baseUrl: 'https://localhost:443' }).ok, false);
  assert.equal(resolveBaseUrl({ provider: 'custom', baseUrl: 'https://127.0.0.1' }).ok, false);
});

test('custom con host autorizado por variable de entorno funciona', () => {
  const prev = process.env.ZOCO_AI_ALLOWED_HOSTS;
  process.env.ZOCO_AI_ALLOWED_HOSTS = 'gateway.miempresa.com, otro.example';
  try {
    const r = resolveBaseUrl({ provider: 'custom', baseUrl: 'https://gateway.miempresa.com/v1/' });
    assert.equal(r.ok, true);
    assert.equal(r.host, 'gateway.miempresa.com');
    assert.equal(r.base, 'https://gateway.miempresa.com/v1');
    assert.equal(resolveBaseUrl({ provider: 'custom', baseUrl: 'https://attacker.example' }).ok, false);
  } finally {
    if (prev === undefined) delete process.env.ZOCO_AI_ALLOWED_HOSTS;
    else process.env.ZOCO_AI_ALLOWED_HOSTS = prev;
  }
});

test('parseHostList normaliza', () => {
  assert.deepEqual(parseHostList(' A.com , b.com.,, '), ['a.com', 'b.com']);
});
