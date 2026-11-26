// Allowlist de destinos del proxy de IA.
//
// Por qué existe: el proxy reenvía la llave del cliente (o la guardada de la
// empresa) en la cabecera Authorization. Si aceptamos cualquier `baseUrl`, un
// tercero puede apuntar el proxy a su servidor y quedarse con la llave.
//
// Regla: el destino se decide por el proveedor, nunca por el cliente. Solo
// `provider: "custom"` puede usar `baseUrl`, y únicamente contra hosts que el
// operador haya autorizado con ZOCO_AI_ALLOWED_HOSTS (coma separada).

export const PROVIDER_HOSTS = {
  gemini: ['generativelanguage.googleapis.com'],
  openai: ['api.openai.com'],
  deepseek: ['api.deepseek.com'],
  anthropic: ['api.anthropic.com'],
};

const PROVIDER_BASE = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com',
  anthropic: 'https://api.anthropic.com',
};

export function parseHostList(raw) {
  return String(raw || '')
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/\.$/, ''))
    .filter(Boolean);
}

/**
 * Decide la URL base a la que se puede mandar la llave.
 * @returns {{ok:true, base:string, host:string} | {ok:false, error:string}}
 */
export function resolveBaseUrl({ provider, baseUrl, extraHosts = [] } = {}) {
  const p = String(provider || '').toLowerCase();

  const fixed = PROVIDER_BASE[p];
  if (fixed) return { ok: true, base: fixed, host: new URL(fixed).hostname };

  if (!baseUrl) return { ok: false, error: 'Falta baseUrl para un proveedor personalizado' };

  let u;
  try {
    u = new URL(String(baseUrl));
  } catch {
    return { ok: false, error: 'baseUrl inválida' };
  }
  if (u.protocol !== 'https:') return { ok: false, error: 'baseUrl debe usar https' };
  if (u.username || u.password) return { ok: false, error: 'baseUrl no puede llevar credenciales' };
  if (u.port && u.port !== '443') return { ok: false, error: 'baseUrl con puerto no permitido' };

  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  const envHosts = typeof process !== 'undefined' ? process.env?.ZOCO_AI_ALLOWED_HOSTS : '';
  const allowed = [...parseHostList(envHosts), ...parseHostList(extraHosts.join(','))];
  if (!allowed.includes(host)) {
    return {
      ok: false,
      error: 'Destino no autorizado: ' + host + '. Un administrador debe añadirlo en ZOCO_AI_ALLOWED_HOSTS.',
    };
  }
  return { ok: true, base: u.origin + u.pathname.replace(/\/$/, ''), host };
}
