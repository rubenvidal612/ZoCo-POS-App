import { MODES, BUSINESS_FAMILIES, familyForMode } from './store.js';

const PHOTOS = {
 shoe:'photo-1542291026-7eec264c27ff', boutique:'photo-1441986300917-64674bd600d8',
 abarrotes:'photo-1542838132-92c53300491e', farmacia:'photo-1576091160399-112ba8d25d1d',
 papeleria:'photo-1455390582262-044cdead277a', ferreteria:'photo-1504148455328-c376907d081c',
 joyeria:'photo-1515562141207-7a88fb7ce338', optica:'photo-1511499767150-a48a237f0083',
 carniceria:'photo-1607623814075-e51df1bdc82f', fruteria:'photo-1619566636858-adf3ef46400b',
 panaderia:'photo-1509440159596-0249088772ff', dulceria:'photo-1499195333224-3ce974eecb47',
 cosmeticos:'photo-1596462502278-27bfdc403348', electronica:'photo-1498049794561-7780e7231661',
 mascotas:'photo-1583337130417-3346a1be7dee', muebleria:'photo-1555041469-a586c61ea9bc',
 floreria:'photo-1490750967868-88aa4486c946', barberia:'photo-1503951914875-452162b0f3f1',
 restaurante:'photo-1552566626-52f8b828add9', lavanderia:'photo-1545173168-9f1947eebb7f',
 merceria:'photo-1494438639946-1ebd1d20bf85', refaccionaria:'photo-1486262715619-67b85e0b08d3',
 perfumeria:'photo-1541643600914-78b084683601', digitales:'photo-1516321318423-f06f85e504b3', general:'photo-1472851294608-062f824d29cc'
};
const SUBGIROS = {
 restaurante:'Taquería tacos al pastor trompo fonda cocina económica cafetería restaurante comida rápida dark kitchen',
 shoe:'Zapatería tenis calzado sandalias botas bolsas',
 boutique:'Ropa boutique vestidos moda playeras pantalones',
 perfumeria:'Perfumería fragancias perfumes esencias',
 cosmeticos:'Maquillaje belleza cosméticos cuidado facial',
 barberia:'Barbería estética salón spa uñas peluquería',
 abarrotes:'Minisúper tienda de conveniencia abarrotes miscelánea',
 digitales:'Productos digitales cursos ebooks canciones plantillas software páginas web diseños licencias servicios',
 general:'Otro negocio servicios productos generales'
};
const clean = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photo = id => 'https://images.unsplash.com/'+(PHOTOS[id]||PHOTOS.general)+'?auto=format&fit=crop&w=640&q=75';

export function openVisualGiroSelector({ selected = 'general', onSelect } = {}) {
 const overlay=document.createElement('div');
 overlay.className='zoco-giro-overlay';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Selecciona tu giro de negocio');
 overlay.innerHTML=`<section class="zoco-giro-dialog"><header><div><h2>Descubre tu giro en ZoCo</h2><p>Elige el negocio que mejor te representa. Busca también por subgiro.</p></div><button type="button" class="zoco-giro-close" aria-label="Cerrar">×</button></header><input class="zoco-giro-search" type="search" placeholder="Buscar zapatería, tacos al pastor, perfumería..." aria-label="Buscar giro o subgiro"><div class="zoco-giro-grid"></div><p class="zoco-giro-note">Cambiar el giro de tu negocio actual no crea otro negocio. Confirma y guarda en Ajustes.</p></section>`;
 const style=document.createElement('style');
 style.textContent=`.zoco-giro-overlay{position:fixed;inset:0;z-index:99990;background:#071224bb;display:grid;place-items:center;padding:14px}.zoco-giro-dialog{width:min(980px,100%);max-height:92dvh;overflow:auto;background:#fff;color:#152238;border-radius:23px;padding:clamp(15px,3vw,27px);box-shadow:0 25px 90px #0005}.zoco-giro-dialog header{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:17px}.zoco-giro-dialog h2{margin:0 0 6px;font-size:clamp(21px,3vw,29px)}.zoco-giro-dialog p{margin:0;color:#667085;font-size:14px}.zoco-giro-close{background:#f1f5f9;border:0;border-radius:50%;width:38px;height:38px;font-size:26px;cursor:pointer}.zoco-giro-search{width:100%;border:1px solid #cbd5e1;border-radius:13px;padding:13px 15px;font-size:16px;margin-bottom:17px;color:#152238;background:#fff}.zoco-giro-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,195px),1fr));gap:13px}.zoco-giro-card{border:2px solid #e2e8f0;border-radius:15px;background:white;overflow:hidden;text-align:left;padding:0;cursor:pointer;color:#152238;transition:transform .15s,border-color .15s}.zoco-giro-card:hover,.zoco-giro-card:focus-visible{transform:translateY(-2px);border-color:#f97316;outline:none}.zoco-giro-card[aria-pressed=true]{border-color:#f97316;box-shadow:0 0 0 2px #fed7aa}.zoco-giro-card img{display:block;width:100%;height:125px;object-fit:cover}.zoco-giro-card span{display:block;padding:10px 11px;font-weight:700;font-size:14px}.zoco-giro-card small{display:block;color:#667085;font-size:12px;font-weight:400;margin-top:3px}.zoco-giro-note{margin-top:15px!important;font-size:12px!important}@media(max-width:520px){.zoco-giro-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.zoco-giro-card img{height:105px}.zoco-giro-dialog{max-height:95dvh}.zoco-giro-card span{font-size:13px}}`;
 document.head.appendChild(style);document.body.appendChild(overlay);
 const close=()=>{overlay.remove();style.remove();document.removeEventListener('keydown',key)};
 const key=e=>{if(e.key==='Escape')close()};
 document.addEventListener('keydown',key);
 overlay.querySelector('.zoco-giro-close').onclick=close;
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 const input=overlay.querySelector('.zoco-giro-search'),grid=overlay.querySelector('.zoco-giro-grid');
 const render=()=>{
  const q=clean(input.value);
  const entries=Object.entries(MODES).filter(([id,v])=>!q||clean([v.label,SUBGIROS[id]||'',BUSINESS_FAMILIES[familyForMode(id)]?.label].join(' ')).includes(q));
  if(q&&!entries.some(([id])=>id==='general'))entries.push(['general',MODES.general]);
  grid.innerHTML=entries.map(([id,v])=>`<button type="button" class="zoco-giro-card" data-mode="${esc(id)}" aria-pressed="${selected===id}"><img src="${photo(id)}" alt="" loading="lazy"><span>${esc(v.label)}<small>${esc((SUBGIROS[id]||'').split(' ').slice(0,5).join(' ')||'Configura tu negocio')}</small></span></button>`).join('');
  if(!entries.length)grid.innerHTML='<p>No encontramos resultados. Selecciona Otro negocio.</p>';
  grid.querySelectorAll('[data-mode]').forEach(btn=>btn.onclick=()=>{onSelect?.(btn.dataset.mode);close()});
 };
 input.addEventListener('input',render);render();input.focus();
}
