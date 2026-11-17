// Sube variables de entorno a Vercel desde un archivo local.
//
// 1) Crea tools/.env.vercel  (está en .gitignore, NO se sube a GitHub):
//      SUPABASE_URL=https://xxxx.supabase.co
//      SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
//      ZOCO_KEK=xxxx
//
// 2) Crea un token en https://vercel.com/account/tokens
//
// 3) Ejecuta (PowerShell):
//      $env:VERCEL_TOKEN="tu_token"
//      node tools/vercel-env.mjs zoco-pos
//
//    Opcional: agrega --team <teamId> si el proyecto es de un equipo.
//    Con --dry solo muestra lo que haría, sin subir nada.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const project = args.find((a) => !a.startsWith('--'));
const dry = args.includes('--dry');
const teamIdx = args.indexOf('--team');
const teamId = teamIdx >= 0 ? args[teamIdx + 1] : process.env.VERCEL_TEAM_ID || '';

const TOKEN = process.env.VERCEL_TOKEN;
if (!project) {
  console.error('Uso: node tools/vercel-env.mjs <nombre-del-proyecto> [--team <teamId>] [--dry]');
  process.exit(1);
}
if (!TOKEN) {
  console.error('Falta VERCEL_TOKEN. Créalo en https://vercel.com/account/tokens');
  process.exit(1);
}

const file = path.resolve('tools/.env.vercel');
if (!fs.existsSync(file)) {
  console.error('No existe tools/.env.vercel — créalo con las variables (KEY=VALOR por línea)');
  process.exit(1);
}

const vars = fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const i = l.indexOf('=');
    return { key: l.slice(0, i).trim(), value: l.slice(i + 1).trim().replace(/^["']|["']$/g, '') };
  })
  .filter((v) => v.key && v.value);

if (!vars.length) {
  console.error('El archivo no tiene variables válidas');
  process.exit(1);
}

const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
const api = (p, opts = {}) =>
  fetch(`https://api.vercel.com${p}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

const existingRes = await api(`/v9/projects/${encodeURIComponent(project)}/env${qs}`);
if (!existingRes.ok) {
  console.error('No pude leer el proyecto:', existingRes.status, (await existingRes.text()).slice(0, 200));
  process.exit(1);
}
const existing = (await existingRes.json()).envs || [];

console.log(`Proyecto: ${project}`);
console.log(`Variables en el archivo: ${vars.length}`);
console.log(`Destino: production + preview\n`);

let created = 0, updated = 0, failed = 0;

for (const v of vars) {
  const cur = existing.find((e) => e.key === v.key);
  if (dry) {
    console.log(`  [dry] ${cur ? 'actualizar' : 'crear'} ${v.key} (${v.value.length} caracteres)`);
    continue;
  }
  try {
    if (cur) {
      const r = await api(`/v9/projects/${encodeURIComponent(project)}/env/${cur.id}${qs}`, {
        method: 'PATCH',
        body: JSON.stringify({ value: v.value, target: ['production', 'preview'] }),
      });
      if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 120));
      updated++; console.log(`  ✓ actualizada ${v.key}`);
    } else {
      const r = await api(`/v10/projects/${encodeURIComponent(project)}/env${qs}`, {
        method: 'POST',
        body: JSON.stringify({ key: v.key, value: v.value, type: 'encrypted', target: ['production', 'preview'] }),
      });
      if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 120));
      created++; console.log(`  ✓ creada ${v.key}`);
    }
  } catch (e) {
    failed++; console.error(`  ✗ ${v.key}: ${e.message}`);
  }
}

if (!dry) {
  console.log(`\nCreadas: ${created} · Actualizadas: ${updated} · Errores: ${failed}`);
  console.log('Ahora haz Redeploy en Vercel para que las tome el proyecto.');
}
