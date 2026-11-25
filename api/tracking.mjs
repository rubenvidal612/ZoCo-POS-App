// Seguimiento público de una orden de lavandería — /api/tracking?c=<empresa>&f=<folio>&k=<clave>
// Devuelve SOLO lo necesario: folio, estado, fecha y número de prendas.
// Nunca teléfono, nombre completo, importes ni el resto del negocio.
export const config = { runtime: 'edge' };

const env = (k) => {
  if (typeof process === 'undefined') return '';
  const v = process.env?.[k];
  if (v) return v;
  if (k === 'SUPABASE_URL') return process.env?.NEXT_PUBLIC_SUPABASE_URL || '';
  return '';
};

const json = (body, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cache,
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  },
});

const ETIQUETAS = {
  recibido: 'Recibido',
  proceso: 'En proceso',
  listo: 'Listo para recoger',
  entregado: 'Entregado',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const company = String(url.searchParams.get('c') || '').trim();
  const folio = String(url.searchParams.get('f') || '').trim().toUpperCase();
  const clave = String(url.searchParams.get('k') || '').trim();

  if (!company || !folio) return json({ ok: false, error: 'Faltan datos de la orden' }, 400);

  const base = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return json({ ok: false, error: 'Seguimiento no configurado' }, 503);

  try {
    const r = await fetch(
      `${base}/rest/v1/company_state?company_id=eq.${encodeURIComponent(company)}&select=data&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' },
    );
    if (!r.ok) return json({ ok: false, error: 'No se pudo leer la orden' }, 502);
    const rows = await r.json();
    const data = Array.isArray(rows) && rows[0] ? rows[0].data : null;
    const orders = Array.isArray(data?.laundry?.orders) ? data.laundry.orders : [];
    const orden = orders.find((o) => String(o.folio || '').toUpperCase() === folio);

    if (!orden) return json({ ok: false, error: 'Orden no encontrada' }, 404);
    if (orden.trackCode && clave && String(orden.trackCode) !== clave) {
      return json({ ok: false, error: 'Clave incorrecta' }, 403);
    }

    const prendas = (orden.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
    return json({
      ok: true,
      folio: orden.folio,
      status: orden.status,
      statusLabel: ETIQUETAS[orden.status] || orden.status,
      recibido: orden.createdAt || null,
      listo: orden.readyAt || null,
      entregado: orden.deliveredAt || null,
      prendas,
      negocio: String(data?.company?.name || 'ZoCo').slice(0, 60),
      actualizado: new Date().toISOString(),
    });
  } catch {
    return json({ ok: false, error: 'Error al consultar' }, 500);
  }
}
