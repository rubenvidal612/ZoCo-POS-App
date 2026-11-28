// ZoCo Digital: catálogo piloto con vista especial para el giro digital.
// Sin enlaces de atribución, ventas ni pagos de comisiones reales.
import { esc } from './ui.js';
import { currentUser } from './store.js';
import { renderDigitalPages } from './views-digital-pages.js';

const PRODUCTS = [
  {id:'zoco',icon:'▣',name:'ZoCo POS',type:'Software para negocios',summary:'Sistema de ventas y gestión para comercios.',url:'/digital.html?producto=zoco',commission:'$50 MXN por contratación del plan Esencial',theme:'zoco'},
  {id:'luciana',icon:'♫',name:'Luciana Music',type:'Plataforma musical',summary:'Creación de canciones y herramientas musicales con IA.',url:'/digital.html?producto=luciana',commission:'Por configurar',theme:'music'},
  {id:'song',icon:'♪',name:'Canciones personalizadas',type:'Producto digital por encargo',summary:'Canciones especiales y paquetes musicales personalizados.',url:'/digital.html?producto=song',commission:'Por configurar',theme:'song'}
];
const CSS = `
.zd{padding:16px;max-width:1240px;margin:0 auto;color:var(--text,#172033)}
.zd .zd-hero{background:linear-gradient(120deg,#172033,#31435c);color:#fff;padding:24px;border-radius:22px}
.zd .zd-hero h2{font-size:clamp(22px,4vw,32px);margin:10px 0}
.zd .zd-hero p{opacity:.92;line-height:1.5}
.zd .zd-badge{display:inline-flex;border-radius:99px;padding:6px 11px;background:#fff0df;color:#94430b;font-size:12px;font-weight:800}
.zd .zd-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}
.zd .zd-tab{border:1px solid var(--border,#d7dfe8);background:var(--card,#fff);color:var(--text,#172033);padding:11px 15px;border-radius:12px;cursor:pointer;font-weight:700}
.zd .zd-tab[aria-selected="true"]{background:#f97316;color:#fff;border-color:#f97316}
.zd .zd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,245px),1fr));gap:16px}
.zd .zd-card{border:1px solid var(--border,#dce3ec);border-radius:20px;overflow:hidden;background:var(--card,#fff);color:var(--text,#172033)}
.zd .zd-cover{height:172px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.zd .zd-cover.zoco{background:linear-gradient(135deg,#fff1e5,#f97316)}
.zd .zd-cover.music{background:linear-gradient(135deg,#201438,#8155b2)}
.zd .zd-cover.song{background:linear-gradient(135deg,#183c3b,#1e9b98)}
.zd .zd-kit{width:106px;height:128px;border-radius:7px 14px 14px 7px;box-shadow:14px 14px 22px #0003;border:1px solid #ffffff55;transform:perspective(400px) rotateY(-16deg);display:grid;place-items:center;background:#fff;color:#f97316;font-size:57px;font-weight:900}
.zd .music .zd-kit{background:#231b38;color:#e1c47b}
.zd .song .zd-kit{background:#173f42;color:#fff}
.zd .zd-kit:after{content:'';position:absolute;left:-8px;top:0;width:9px;height:100%;background:#0002;transform:skewY(-25deg);border-radius:4px}
.zd .zd-cover small{position:absolute;bottom:8px;right:10px;color:white;background:#0006;border-radius:8px;padding:3px 7px}
.zd .zd-info{padding:17px}
.zd .zd-info h3{margin:6px 0;font-size:19px}
.zd .zd-type,.zd .zd-muted{font-size:13px;color:var(--muted,#667085)}
.zd .zd-info p{line-height:1.45}
.zd .zd-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}
.zd .zd-btn{padding:10px 13px;border:0;border-radius:10px;background:#f97316;color:white;font-weight:750;text-decoration:none;cursor:pointer;font-size:13px}
.zd .zd-btn.alt{background:#0f766e}.zd .zd-btn.share{background:#32465c}.zd .zd-btn[disabled]{opacity:.7;cursor:not-allowed}
.zd .zd-panel{padding:19px;border:1px solid var(--border,#dce3ec);border-radius:18px;background:var(--card,#fff);margin:14px 0}
.zd .zd-panel h3{margin-top:0}
.zd .zd-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:14px}
.zd .zd-step{padding:14px;background:var(--bg,#f5f7fa);border-radius:12px}
.zd .zd-step strong{display:block;margin-bottom:6px}
.zd .zd-warning{font-size:13px;line-height:1.55;color:var(--muted,#667085);margin-top:18px}
@media(max-width:580px){.zd{padding:10px}.zd .zd-hero{padding:20px}.zd .zd-cover{height:150px}}
`;

export function mercadoDigitalView(ctx, mode='market') {
  const owner=mode==='owner';
  const root=document.createElement('div');
  root.className='zd';
  root.innerHTML=`<style>${CSS}</style>
    <section class="zd-hero">
      <span class="zd-badge">PILOTO · SIN COBROS REALES</span>
      <h2>${owner?'ZoCo Digital · Productos digitales':'¿No sabes qué vender? Empieza aquí'}</h2>
      <p>${owner?'El área especial para vender cursos, software, canciones, archivos y servicios digitales. Empieza probando los kits de nuestras marcas.':'Explora productos digitales para promocionar sin inventario físico. Por ahora están disponibles nuestros tres productos de muestra.'}</p>
    </section>
    <nav class="zd-tabs" aria-label="Secciones de ZoCo Digital" role="tablist">
      <button type="button" class="zd-tab" data-tab="kits" role="tab" aria-selected="true">Kits digitales</button>
      <button type="button" class="zd-tab" data-tab="how" role="tab" aria-selected="false">Cómo funcionará</button>
      <button type="button" class="zd-tab" data-tab="links" role="tab" aria-selected="false">Mis enlaces</button>
      ${owner?'<button type="button" class="zd-tab" data-tab="manage" role="tab" aria-selected="false">Mis productos</button><button type="button" class="zd-tab" data-tab="pages" role="tab" aria-selected="false">Mis páginas de venta</button>':''}
    </nav>
    <section class="zd-body" role="tabpanel"></section>
    <p class="zd-warning">Las landings y los enlaces de difusión se pueden compartir, pero todavía no atribuyen ventas, generan saldos ni pagan comisiones. Las imágenes de las cajas son ilustraciones de muestra; se sustituirán por los artes oficiales aprobados. El programa actual de afiliados de ZoCo POS sigue separado.</p>`;
  const body=root.querySelector('.zd-body');
  const kits=()=>`<div class="zd-grid">${PRODUCTS.map(p=>`
    <article class="zd-card">
      <div class="zd-cover ${p.theme}"><div class="zd-kit" aria-hidden="true">${p.icon}</div><small>Kit digital</small></div>
      <div class="zd-info">
        <div class="zd-type">${esc(p.type)}</div><h3>${esc(p.name)}</h3><p>${esc(p.summary)}</p>
        <p><strong>Comisión:</strong> ${esc(p.commission)}</p>
        <div class="zd-actions"><a class="zd-btn" target="_blank" rel="noopener noreferrer" href="${esc(p.url)}">Ver landing</a><button type="button" class="zd-btn share" data-share="${p.id}">Copiar enlace</button></div>
        <p class="zd-muted" data-result="${p.id}" aria-live="polite">Enlace compartible; comisiones todavía inactivas.</p>
      </div>
    </article>`).join('')}</div>`;
  const how=()=>`<div class="zd-panel"><h3>Así funcionará la venta por afiliados</h3><div class="zd-steps">
     <div class="zd-step"><strong>1. El dueño publica</strong>Registra producto, precio, landing y comisión.</div>
     <div class="zd-step"><strong>2. El afiliado se registra</strong>Solicita acceso al producto del dueño.</div>
     <div class="zd-step"><strong>3. Comparte su enlace</strong>Promociona la misma landing con su identificador.</div>
     <div class="zd-step"><strong>4. Se valida la venta</strong>ZoCo atribuye y calcula comisión, con controles para reembolsos.</div>
  </div><p class="zd-muted">El seguimiento de enlaces y las transferencias automáticas son fases posteriores, sujetas a validación técnica y del proveedor de pagos.</p></div>`;
  const manage=()=>`<div class="zd-panel"><h3>Mis productos digitales</h3>
  <p>El giro ya tiene sus categorías en el catálogo de Productos: archivos y descargas, cursos y formación, productos personalizados y servicios digitales.</p>
  <p>Aquí añadiremos la configuración específica para archivos seguros, entregas, páginas de venta y comisiones por producto. Por ahora puedes administrar los productos desde el catálogo general de ZoCo.</p>
  <button class="zd-btn" type="button" data-products>Ir a Productos</button></div>`;
  const promotionCode = String(currentUser()?.affCode || '').trim().toUpperCase();
  // Un código del programa POS no activa comisiones digitales por sí mismo.
  const shareUrl=(p)=>{const url=new URL(p.url,location.origin);if(/^[A-Z0-9_-]{4,32}$/.test(promotionCode))url.searchParams.set('promotor',promotionCode);return url.href;};
  const links=()=>`<div class="zd-panel"><h3>Mis enlaces para compartir</h3><p>Estas páginas de venta ya se pueden abrir y difundir. El código de difusión, cuando existe, es informativo: todavía no contabiliza clics ni genera comisiones.</p><div class="zd-grid">${PRODUCTS.map(p=>`<article class="zd-card"><div class="zd-info"><h3>${esc(p.name)}</h3><p class="zd-muted" style="overflow-wrap:anywhere">${esc(shareUrl(p))}</p><div class="zd-actions"><button type="button" class="zd-btn share" data-share="${p.id}">Copiar enlace</button><a class="zd-btn alt" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Abrir landing</a></div><p class="zd-muted" data-result="${p.id}" aria-live="polite"></p></div></article>`).join('')}</div></div>`;
  const paint=(tab)=>{
    root.querySelectorAll('.zd-tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
    if(tab==='pages'&&owner){renderDigitalPages(body,ctx);return;}
    body.innerHTML=tab==='how'?how():tab==='links'?links():tab==='manage'&&owner?manage():kits();
    body.querySelectorAll('[data-share]').forEach(btn=>btn.onclick=async()=>{
      const p=PRODUCTS.find(x=>x.id===btn.dataset.share);
      if(!p)return;
      const result=body.querySelector('[data-result="'+p.id+'"]');
      try{await navigator.clipboard.writeText(shareUrl(p));if(result)result.textContent='Enlace copiado. Compartir no genera aún comisiones.';}
      catch{if(result)result.textContent='No se pudo copiar automáticamente. Abre la landing y copia su dirección.';}
    });
    const products=body.querySelector('[data-products]');
    if(products) products.onclick=()=>ctx?.go?.('productos');
  };
  root.querySelectorAll('.zd-tab').forEach(btn=>btn.onclick=()=>paint(btn.dataset.tab));
  paint('kits');
  return {root,refresh(){}};
}
