// Piloto de Mercado Digital. Sin pagos, enlaces de seguimiento ni comisiones reales.
// La simulación se conserva en el navegador del usuario; no se envía a Supabase.
import { esc } from './ui.js';
const SAMPLES = [
  {id:'zoco',emoji:'🛍️',name:'ZoCo POS',kind:'Software para negocios',detail:'Recomienda ZoCo a emprendedores y comercios.',url:'https://zoco-pos.vercel.app',rate:50,unit:'MXN por contratación del plan Esencial'},
  {id:'luciana',emoji:'🎵',name:'Luciana Music',kind:'Música y creatividad',detail:'Promociona una plataforma para crear música.',url:'https://lucianamusic.app',rate:null,unit:'Por definir'},
  {id:'canciones',emoji:'🎤',name:'Canciones personalizadas',kind:'Servicio digital por encargo',detail:'Ofrece canciones hechas para momentos especiales.',url:'https://lucianamusic.app',rate:null,unit:'Por definir'}
];
export function mercadoDigitalView() {
  const root=document.createElement('div');
  root.className='zoco-digital-pilot';
  const style=document.createElement('style');
  style.textContent=`.zoco-digital-pilot{padding:16px;max-width:1200px;margin:auto;color:var(--text)}.zoco-digital-pilot .hero{background:linear-gradient(120deg,#102642,#155e75);color:white;border-radius:22px;padding:24px}.zoco-digital-pilot .hero h2{font-size:clamp(22px,4vw,34px);margin:0 0 8px}.zoco-digital-pilot .hero p{opacity:.9}.zoco-digital-pilot .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:18px}.zoco-digital-pilot .tile{padding:20px;border:1px solid var(--border,#dce3ec);border-radius:18px;background:var(--card,#fff);color:var(--text,#172033)}.zoco-digital-pilot .tile h3{margin:8px 0}.zoco-digital-pilot .tile small{color:var(--muted,#667085)}.zoco-digital-pilot .chip{display:inline-block;background:#e8f5ff;color:#075985;border-radius:20px;padding:5px 10px;font-size:12px;font-weight:700}.zoco-digital-pilot .actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.zoco-digital-pilot a.action,.zoco-digital-pilot button.action{border:0;background:#f97316;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700;cursor:pointer}.zoco-digital-pilot .muted{font-size:13px;color:var(--muted,#667085)}`;
  root.appendChild(style);
  const hero=document.createElement('section');hero.className='hero';hero.innerHTML='<span class="chip">PILOTO • SIN COBROS</span><h2>¿No sabes qué vender? Empieza aquí</h2><p>Descubre productos digitales para promocionar. Prueba el catálogo con ZoCo, Luciana Music y canciones personalizadas.</p><p style="font-size:13px">Las afiliaciones, enlaces de atribución y pagos automáticos todavía no están activados.</p>';root.appendChild(hero);
  const cards=document.createElement('div');cards.className='cards';root.appendChild(cards);
  for (const p of SAMPLES) {
    const card=document.createElement('article');card.className='tile';
    card.innerHTML=`<div style="font-size:34px">${p.emoji}</div><small>${esc(p.kind)}</small><h3>${esc(p.name)}</h3><p>${esc(p.detail)}</p><p><strong>Comisión:</strong> ${p.rate!==null? '$'+p.rate+' '+esc(p.unit):'Pendiente de configurar'}</p><div class="actions"><a class="action" href="${p.url}" target="_blank" rel="noopener noreferrer">Ver producto</a><button class="action preview" type="button" style="background:#0f766e">Simular promoción</button></div><p class="muted result" aria-live="polite">Sin enlaces de afiliado reales.</p>`;
    card.querySelector('.preview').onclick=()=>{card.querySelector('.result').textContent='Vista de prueba: aún no se creó una afiliación ni se registró una venta. El dueño deberá habilitar comisiones y aprobar afiliados antes de lanzar.'};
    cards.appendChild(card);
  }
  const note=document.createElement('p');note.className='muted';note.style.marginTop='16px';note.textContent='Importante: este escaparate es una demostración sin datos personales ni financieros. No confundir con el programa actual de afiliados de ZoCo POS.';root.appendChild(note);
  return {root,refresh(){}};
}
