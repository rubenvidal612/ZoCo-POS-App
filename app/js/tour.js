import { mascotMarkup } from './mascot.js';
const STEPS = [
  ['¡Bienvenido a ZoCo!','Soy tu robot asistente. Te enseñaré las funciones más importantes para empezar a vender.','inicio'],
  ['Configura tu negocio','En Configuración eliges el giro y las categorías. Zapatería y heladería independientes son dos negocios; cambiar de categoría no se cobra.','config'],
  ['Registra productos','En Productos agregas precios, existencias, fotos, modelos y variaciones.','productos'],
  ['Aprende a cobrar','En Vender agregas artículos, revisas el total y registras pagos. No haremos una venta real durante esta guía.','vender'],
  ['Conoce al asistente IA','En Asistente IA puedes consultar datos y pedir ayuda. Las consultas avanzadas requieren configurar tu proveedor de IA.','ia'],
  ['Consulta tus resultados','En Inicio y Reportes encontrarás ventas, inventarios y estadísticas. ¡La guía estará disponible cuando la necesites!','inicio'],
];
const FAQ=[
 ['¿Cómo cobro?','Abre Vender, agrega los artículos y selecciona la forma de pago. Revisa el total antes de confirmar.','vender'],
 ['¿Cómo registro productos?','En Productos utiliza Agregar producto para registrar nombre, precio y existencias.','productos'],
 ['¿Cómo cambio de giro?','En Configuración → Negocio puedes seleccionar el giro y sus categorías.','config'],
 ['¿Cuánto cuesta otro negocio?','ZoCo Esencial incluye un negocio por $149/mes. Otro negocio independiente suma $100/mes. El alta y cobro están pendientes de activación segura.','config'],
 ['¿Dónde veo reportes?','Consulta los indicadores en Inicio o abre Reportes.','reportes'],
 ['¿Qué puede hacer la IA?','El asistente de IA responde consultas sobre tu negocio cuando está configurado. Ábrelo para utilizarlo.','ia']
];
let currentOverlay=null, scheduled=false;
const key = (user)=>'zoco.tour.done.v1.'+String(user?.id||user?.email||'usuario');
export function showZoCoTour(user=null) {
  currentOverlay?.remove();
  let step=0, target=null;
  const panel=document.createElement('div');
  panel.className='zoco-walkthrough';
  panel.innerHTML='<div class="zoco-walkthrough-focus" aria-hidden="true"></div><div class="zoco-walkthrough-bubble" role="dialog" aria-label="Guía interactiva ZoCo"><div class="zoco-walkthrough-avatar">'+mascotMarkup('zoco-tour-mascot')+'</div><div class="zoco-walkthrough-copy"><small class="zoco-tour-count"></small><h2></h2><p></p><div class="zoco-tour-buttons"><button class="btn ghost" data-tour="skip">Saltar</button><button class="btn ghost" data-tour="back">Atrás</button><button class="btn orange" data-tour="next">Siguiente</button></div></div></div>';
  const bubble=panel.querySelector('.zoco-walkthrough-bubble');
  const focus=panel.querySelector('.zoco-walkthrough-focus');
  const finish=()=>{try{if(user)localStorage.setItem(key(user),'1')}catch{};cleanup();};
  const cleanup=()=>{panel.remove();window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);document.removeEventListener('keydown',escape);if(currentOverlay===panel)currentOverlay=null;};
  const escape=e=>{if(e.key==='Escape')finish()};
  const position=()=>{
    const rect=target?.getBoundingClientRect();
    if(!rect||rect.width===0||rect.height===0){focus.style.display='none';bubble.style.left='50%';bubble.style.top='50%';bubble.style.transform='translate(-50%,-50%)';return;}
    focus.style.display='block';focus.style.left=Math.max(4,rect.left-5)+'px';focus.style.top=Math.max(4,rect.top-5)+'px';focus.style.width=rect.width+10+'px';focus.style.height=rect.height+10+'px';
    const w=Math.min(340,window.innerWidth-24),h=bubble.offsetHeight||210;
    let x=Math.min(window.innerWidth-w-12,Math.max(12,rect.left));
    let y=rect.bottom+18;
    if(y+h>window.innerHeight-12)y=Math.max(12,rect.top-h-18);
    bubble.style.left=x+'px';bubble.style.top=y+'px';bubble.style.transform='none';
  };
  const paint=()=>{
    const s=STEPS[step];
    panel.querySelector('.zoco-tour-count').textContent='PASO '+(step+1)+' DE '+STEPS.length;
    panel.querySelector('h2').textContent=s[0];panel.querySelector('p').textContent=s[1];
    panel.querySelector('[data-tour="back"]').disabled=step===0;
    panel.querySelector('[data-tour="next"]').textContent=step===STEPS.length-1?'Terminar':'Siguiente';
    target=document.querySelector('[data-r="'+s[2]+'"]');
    if(!target){panel.querySelector('p').textContent+=' Puedes continuar si tu rol no muestra esta sección.';}
    requestAnimationFrame(position);
  };
  panel.querySelector('[data-tour="skip"]').onclick=finish;
  panel.querySelector('[data-tour="back"]').onclick=()=>{step=Math.max(0,step-1);paint()};
  panel.querySelector('[data-tour="next"]').onclick=()=>{if(step===STEPS.length-1)return finish();step++;paint()};
  focus.onclick=()=>{if(target){target.click();location.hash='#/'+STEPS[step][2];}if(step<STEPS.length-1){step++;setTimeout(paint,180)}else finish()};
  document.addEventListener('keydown',escape);
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  document.body.appendChild(panel);currentOverlay=panel;paint();
}
export function scheduleZoCoWelcome(user){
 if(!user||scheduled||window.__ZOCO_DEMO__)return;
 try{if(localStorage.getItem(key(user)))return}catch{}
 scheduled=true;let retries=0;
 const begin=()=>{if(!document.querySelector('.shell')){scheduled=false;return}
   if(document.querySelector('#modal-root .overlay')&&retries++<6){setTimeout(begin,2000);return}
   showZoCoTour(user);
 };
 setTimeout(begin,3200);
}
export function showZoCoRobotHelp(user=null){
 currentOverlay?.remove();
 const box=document.createElement('div');box.className='zoco-help-overlay';
 box.innerHTML='<aside class="zoco-help-card" role="dialog" aria-modal="true" aria-label="Ayuda ZoCo"><div class="zoco-help-head">'+mascotMarkup('zoco-help-mascot')+'<div><b>Hola, soy tu robot ZoCo</b><small>¿En qué puedo ayudarte?</small></div><button class="icon-btn" data-close aria-label="Cerrar">✕</button></div><div class="zoco-help-questions"></div><div class="zoco-help-answer" aria-live="polite">Elige una pregunta para comenzar.</div><div class="zoco-help-actions"><button class="btn ghost" data-guide>Ver tutorial</button><button class="btn orange" data-ai>Hablar con IA</button></div></aside>';
 box.querySelector('.zoco-help-questions').innerHTML=FAQ.map((f,i)=>'<button type="button" data-question="'+i+'">'+f[0]+'</button>').join('');
 box.querySelectorAll('[data-question]').forEach(btn=>btn.onclick=()=>{const f=FAQ[Number(btn.dataset.question)];const answer=box.querySelector('.zoco-help-answer');answer.textContent=f[1];const row=document.createElement('div');const go=document.createElement('button');go.type='button';go.className='btn ghost sm';go.textContent='Abrir sección';go.onclick=()=>{if(document.querySelector('[data-r="'+f[2]+'"]')){box.remove();location.hash='#/'+f[2]}else answer.textContent='Tu rol no tiene acceso a esa sección.'};row.appendChild(go);answer.appendChild(row)});
 box.querySelector('[data-close]').onclick=()=>box.remove();
 box.querySelector('[data-guide]').onclick=()=>{box.remove();showZoCoTour(user)};
 box.querySelector('[data-ai]').onclick=()=>{if(document.querySelector('[data-r="ia"]')){box.remove();location.hash='#/ia'}else box.querySelector('.zoco-help-answer').textContent='Tu rol no tiene acceso a IA.'};
 box.onclick=(e)=>{if(e.target===box)box.remove()};document.body.appendChild(box);currentOverlay=box;
}
