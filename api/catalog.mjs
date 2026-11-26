// Catálogo público de solo lectura — /api/catalog?c=<companyId>
// Devuelve ÚNICAMENTE lo que el cliente debe ver: nombre del negocio,
// WhatsApp y productos publicados. Nunca ventas, clientes, gastos ni finanzas.
export const config = { runtime: 'edge' };

const env = (k) => {
  if (typeof process === 'undefined') return '';
  const v = process.env?.[k];
  if (v) return v;
  if (k === 'SUPABASE_URL') return process.env?.NEXT_PUBLIC_SUPABASE_URL || '';
  return '';
};

const json = (body, status = 200, cache = 'public, s-maxage=60, stale-while-revalidate=300') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cache,
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  },
});

/** Solo campos públicos de un producto. */
function publicProduct(p) {
  if (!p || p.active === false || p.catalog === false) return null;
  const branchStock = p.branchStock || {};
  const firstBranch = Object.values(branchStock)[0] || {};
  const sizes = Object.entries(firstBranch)
    .filter(([, q]) => Number(q) > 0)
    .map(([k]) => String(k).split('|')[0]);
  // Se reconstruye una existencia "de vitrina" (solo disponible/no disponible),
  // sin exponer cantidades reales del negocio.
  const vitrina = {};
  Object.entries(firstBranch).forEach(([k, q]) => { if (Number(q) > 0) vitrina[k] = 1; });
  return {
    id: p.id || '',
    name: String(p.name || '').slice(0, 120),
    price: Number(p.price) || 0,
    section: String(p.section || ''),
    image: String(p.image || ''),
    colors: Array.isArray(p.colors) ? p.colors.slice(0, 8) : (p.color ? [p.color] : []),
    sizes: [...new Set(sizes)].slice(0, 30),
    unit: String(p.sellBy || 'pza'),
    branchStock: { vitrina },
  };
}

/** Normaliza el WhatsApp a formato de wa.me. */
function waNumber(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10) d = '52' + d;
  if (d.length === 12 && d.startsWith('52')) d = '521' + d.slice(2);
  return d;
}

export default async function handler(req) {
  const url = new URL(req.url);
  const company = String(url.searchParams.get('c') || '').trim();
  if (!company) return json({ ok: false, error: 'Falta el parámetro c (empresa)' }, 400, 'no-store');

  const base = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return json({ ok: false, error: 'Catálogo no configurado' }, 503, 'no-store');

  try {
    const r = await fetch(
      `${base}/rest/v1/company_state?company_id=eq.${encodeURIComponent(company)}&select=data&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!r.ok) return json({ ok: false, error: 'No se pudo leer el catálogo' }, 502, 'no-store');
    const rows = await r.json();
    const data = Array.isArray(rows) && rows[0] ? rows[0].data : null;
    if (!data || !Array.isArray(data.products)) {
      return json({ ok: true, company: { name: 'ZoCo' }, whatsapp: '', products: [], empty: true });
    }

    const settings = data.settings || {};
    const products = data.products.map(publicProduct).filter(Boolean);

    return json({
      ok: true,
      company: {
        name: String((data.company?.nameByMode || {})[data.company?.mode] || data.company?.name || 'ZoCo').slice(0, 80),
        theme: String(data.company?.theme || 'classic'),
        mode: String(data.company?.mode || ''),
      },
      whatsapp: waNumber(settings.whatsapp || data.company?.whatsapp || data.company?.phone),
      ticket: { footer: String(settings.ticket?.footer || '').slice(0, 120) },
      products,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json({ ok: false, error: 'Error al leer el catálogo' }, 500, 'no-store');
  }
}
