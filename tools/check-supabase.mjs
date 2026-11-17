// Verifica que un proyecto Supabase tenga TODO lo que ZoCo necesita.
// Uso:  node tools/check-supabase.mjs <URL> <ANON_KEY>
const [url, key] = process.argv.slice(2);
if (!url || !key) {
  console.error('Uso: node tools/check-supabase.mjs https://xxx.supabase.co <anon_key>');
  process.exit(1);
}
const H = { apikey: key, Authorization: 'Bearer ' + key };
const TABLES = ['companies', 'company_state', 'members', 'superadmins'];

const check = async (path, headers = H) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers });
  const text = await r.text();
  return { status: r.status, ok: r.ok, body: text.slice(0, 140) };
};

console.log('Proyecto:', url);
let fails = 0;

for (const t of TABLES) {
  const r = await check(`${t}?select=*&limit=1`);
  const state = r.ok ? 'OK' : (r.status === 401 || r.status === 403 ? 'RLS activo (normal)' : 'ERROR');
  if (!r.ok && r.status !== 401 && r.status !== 403) fails++;
  console.log(`  ${t.padEnd(14)} ${r.status}  ${state}${r.ok ? '' : '  ' + r.body}`);
}

// company_secrets debe estar CERRADA para la llave pública
const sec = await check('company_secrets?select=company_id&limit=1');
const secOk = sec.status === 401 || sec.status === 403 || (sec.ok && sec.body.trim() === '[]');
console.log(`  company_secrets ${sec.status}  ${secOk ? 'OK (cerrada)' : 'REVISAR: quedó abierta'}`);
if (!secOk) fails++;

// función is_member
const rpc = await fetch(`${url}/rest/v1/rpc/is_member`, {
  method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_company: 'default' }),
});
console.log(`  is_member()    ${rpc.status}  ${rpc.ok ? 'OK' : 'revisar'}`);
if (!rpc.ok) fails++;

// auth
const auth = await fetch(`${url}/auth/v1/health`, { headers: H });
console.log(`  auth health    ${auth.status}  ${auth.ok ? 'OK' : 'revisar'}`);
if (!auth.ok) fails++;

console.log(fails === 0 ? '\n✓ Todo listo para conectar ZoCo' : `\n✗ ${fails} punto(s) a revisar`);
process.exit(fails === 0 ? 0 : 2);
