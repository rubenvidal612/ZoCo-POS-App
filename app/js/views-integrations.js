import { sbConfig } from './sync.js';
import { cloudSession } from './auth.js';
import { state } from './store.js';
import { esc, toast } from './ui.js';

/* Configuración de integraciones: sin guardar secretos en el estado sincronizado.
   Las credenciales y los cobros requieren endpoints autenticados en el servidor. */
export function integrationsView() {
  const root = document.createElement('section');
  root.className = 'zoco-integrations';
  const css = document.createElement('style');
  css.textContent = `
  .zoco-integrations{max-width:930px;margin:0 auto;padding:14px 8px 35px;color:var(--text,#172033)}
  .zoco-integrations .zi-head{margin-bottom:24px}
  .zoco-integrations h2{font-size:26px;margin:0 0 6px}
  .zoco-integrations p{color:var(--muted,#64748b);line-height:1.5;margin:4px 0}
  .zoco-integrations .zi-grid{display:grid;grid-template-columns:1fr;gap:18px}
  .zoco-integrations .zi-card{background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:22px;padding:22px;box-shadow:0 8px 28px rgba(16,24,40,.045)}
  .zoco-integrations .zi-card{padding:0;overflow:hidden}\n  .zoco-integrations .zi-top{display:flex;align-items:center;gap:12px;margin-bottom:0}
  .zoco-integrations .zi-toggle{display:flex;align-items:center;gap:12px;width:100%;padding:18px 20px;margin:0;border:0;border-radius:0;background:transparent;color:inherit;text-align:left;cursor:pointer}
  .zoco-integrations .zi-toggle:hover{background:var(--bg,#f8fafc)}
  .zoco-integrations .zi-toggle:focus-visible{outline:3px solid #f97316;outline-offset:-4px}
  .zoco-integrations .zi-summary{min-width:0;flex:1}
  .zoco-integrations .zi-summary p{font-size:13px}
  .zoco-integrations .zi-chevron{font-size:22px;color:var(--muted,#64748b);transition:transform .2s}
  .zoco-integrations .zi-toggle[aria-expanded="true"] .zi-chevron{transform:rotate(180deg)}
  .zoco-integrations .zi-body{padding:0 20px 22px;border-top:1px solid var(--border,#e2e8f0)}
  .zoco-integrations .zi-body[hidden]{display:none}
  .zoco-integrations .zi-logo{height:54px;width:54px;display:grid;place-items:center;border-radius:15px;font-size:24px;font-weight:900;background:#e9f4ff;color:#1682c8;flex-shrink:0}.zoco-integrations .zi-logo-mp{background:#e6f6ff}.zoco-integrations .zi-logo-envia{background:#e4f7f1}
  .zoco-integrations .zi-name{font-size:19px;font-weight:750}
  .zoco-integrations .zi-badge{margin-left:auto;background:#f1f5f9;color:#64748b;border-radius:30px;padding:7px 10px;font-size:11px;font-weight:750;white-space:nowrap}
  .zoco-integrations .zi-panel{background:var(--bg,#f8fafc);border-radius:15px;padding:15px;margin:16px 0}
  .zoco-integrations .zi-line{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px}
  .zoco-integrations .zi-line:last-child{border-bottom:0}
  .zoco-integrations .zi-line span:last-child{color:var(--muted,#64748b);text-align:right}
  .zoco-integrations .zi-label{font-size:13px;font-weight:700;margin-bottom:8px;display:block}
  .zoco-integrations input{width:100%;padding:12px;border-radius:10px;border:1px solid var(--border,#cbd5e1);background:var(--card,#fff);color:inherit;box-sizing:border-box;font-size:15px}
  .zoco-integrations button:not(.zi-toggle){border:0;border-radius:12px;background:#f97316;color:#fff;font-weight:750;padding:13px 17px;cursor:pointer;width:100%;margin-top:12px}
  .zoco-integrations button:not(.zi-toggle):disabled{opacity:.55;cursor:not-allowed}
  .zoco-integrations .zi-hint{font-size:12px;color:var(--muted,#64748b);margin-top:10px}
  .zoco-integrations a{color:#167ac6}
  .zoco-integrations .zi-banner{border:1px solid #f6d5a8;background:#fff8ee;color:#855318;border-radius:14px;padding:13px 15px;margin-bottom:20px;font-size:13px}
  `;
  root.append(css);
  const wrap=document.createElement('div');root.append(wrap);
  wrap.innerHTML = `
    <div class="zi-head"><h2>🔌 Integraciones</h2><p>Conecta los servicios de tu negocio para cobrar y enviar desde ZoCo.</p></div>
    <div class="zi-banner">Envia.com: conexión segura en preparación. Mercado Pago todavía no está disponible.</div>
    <div class="zi-grid">
      <article class="zi-card">
        <button type="button" class="zi-toggle zi-top" aria-expanded="false" aria-controls="zi-mp-body"><div class="zi-logo zi-logo-mp"><img src="https://www.google.com/s2/favicons?domain=mercadopago.com.mx&sz=128" alt="Ícono oficial de Mercado Pago" width="43" height="43" loading="lazy"></div><div class="zi-summary"><div class="zi-name">Mercado Pago</div><p>Cobros online y terminal Point</p></div><span class="zi-badge">Sin conectar</span><span class="zi-chevron" aria-hidden="true">⌄</span></button>\n        <div class="zi-body" id="zi-mp-body" hidden>
        <div class="zi-panel">
          <div class="zi-line"><b>Cuenta de cobros</b><span>Conexión OAuth</span></div>
          <div class="zi-line"><b>Terminal asignada</b><span>Seleccionar Point</span></div>
          <div class="zi-line"><b>Confirmación de pagos</b><span>Automática al integrar</span></div>
        </div>
        <label class="zi-label" for="zi-mp-account">Cuenta de Mercado Pago</label>
        <input id="zi-mp-account" placeholder="Conectar de forma segura" disabled autocomplete="off">
        <button type="button" id="zi-mp-connect" disabled>Conectar Mercado Pago</button>
        <p class="zi-hint">La conexión requerirá autorización del dueño y confirmación de pagos desde el servidor. No introduzcas aquí tu access token.</p>
        <a href="https://www.mercadopago.com.mx/developers/es" target="_blank" rel="noopener noreferrer">Documentación oficial de Mercado Pago</a>
        </div>
      </article>
      <article class="zi-card">
        <button type="button" class="zi-toggle zi-top" aria-expanded="false" aria-controls="zi-envia-body"><div class="zi-logo zi-logo-envia"><img src="https://www.google.com/s2/favicons?domain=envia.com&sz=128" alt="Ícono de Envia.com" width="43" height="43" loading="lazy"></div><div class="zi-summary"><div class="zi-name">Envia.com</div><p>Guías, cotizaciones y rastreo</p></div><span class="zi-badge">Sin conectar</span><span class="zi-chevron" aria-hidden="true">⌄</span></button>\n        <div class="zi-body" id="zi-envia-body" hidden>
        <div class="zi-panel">
          <div class="zi-line"><b>Cotizar envíos</b><span>Varias paqueterías</span></div>
          <div class="zi-line"><b>Generar etiquetas</b><span>Desde tus ventas</span></div>
          <div class="zi-line"><b>Rastreo</b><span>En el pedido</span></div>
        </div>
        <label class="zi-label" for="zi-envia-env">Ambiente de Envia.com</label>
        <select id="zi-envia-env" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border,#cbd5e1);background:var(--card,#fff);color:inherit;font-size:15px;margin-bottom:14px">
          <option value="sandbox">Pruebas (sandbox)</option>
          <option value="production">Producción (envíos reales)</option>
        </select>
        <p class="zi-hint" id="zi-envia-note">Utiliza un token generado en el ambiente de pruebas de Envia.com. Las guías de prueba no deben comprarse como envíos reales.</p>
        <label class="zi-label" for="zi-envia-key">Clave API de Envia.com</label>
        <input id="zi-envia-key" type="password" placeholder="Token API de Envia.com" autocomplete="off">
        <button type="button" id="zi-envia-connect">Conectar Envia.com</button>
        <p class="zi-hint">La clave se envía al servidor y nunca se guarda en este navegador. La conexión solo se marcará como verificada tras comprobar la API.</p>
        <a href="https://developers.envia.com/" target="_blank" rel="noopener noreferrer">Documentación oficial de Envia.com</a>
        </div>
      </article>
    </div>`;
  wrap.querySelectorAll('.zi-toggle').forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      const open=toggle.getAttribute('aria-expanded')!=='true';
      wrap.querySelectorAll('.zi-toggle').forEach(other=>{
        other.setAttribute('aria-expanded','false');
        wrap.querySelector('#'+other.getAttribute('aria-controls')).hidden=true;
      });
      toggle.setAttribute('aria-expanded',String(open));
      wrap.querySelector('#'+toggle.getAttribute('aria-controls')).hidden=!open;
    });
  });
  // La lista permanece contraída hasta que el usuario abra una integración.
  const environment = wrap.querySelector('#zi-envia-env');
  const note = wrap.querySelector('#zi-envia-note');
  environment.addEventListener('change', () => {
    note.textContent = environment.value === 'production'
      ? 'Producción: utiliza el token real de la empresa. Generar guías puede generar cargos.'
      : 'Pruebas: utiliza un token del ambiente sandbox de Envia.com, independiente del token real.';
  });

  const keyInput=wrap.querySelector('#zi-envia-key');
  const button=wrap.querySelector('#zi-envia-connect');
  const badge=wrap.querySelector('.zi-logo-envia').closest('.zi-top').querySelector('.zi-badge');
  const status=document.createElement('p');status.className='zi-hint';status.setAttribute('role','status');button.after(status);
  const request=async(action,token)=>{
    const config=sbConfig(),session=cloudSession();
    if(!config.url||!config.key||!session?.access_token)throw new Error('Inicia sesión en ZoCo con tu cuenta de la nube.');
    const company_id=state.currentCompany;
    if(!company_id||company_id==='default')throw new Error('Selecciona una empresa de la nube.');
    const response=await fetch(config.url+'/functions/v1/envia-connection',{method:'POST',headers:{'Content-Type':'application/json','apikey':config.key,'Authorization':'Bearer '+session.access_token},body:JSON.stringify({action,company_id,environment:environment.value,...(token?{token}:{})})});
    const raw=await response.text();
    let data={};try{data=JSON.parse(raw);}catch{}
    if(!response.ok){
      const reason=data.error||data.message||'Respuesta no JSON del servidor';
      if(response.status===401)throw new Error('Sesión de Supabase vencida o rechazada (401). Cierra sesión de la nube y vuelve a entrar.');
      if(response.status===403)throw new Error('Sin permisos para conectar esta empresa (403). Verifica que seas dueño o administrador.');
      throw new Error('Error de conexión HTTP '+response.status+': '+String(reason).slice(0,180));
    }
    return data;
  };
  const MASK='••••••••••••••••••••••••';
  let hasSavedToken=false;
  const showSaved=(saved)=>{
    hasSavedToken=!!saved;
    keyInput.value='';
    keyInput.placeholder=saved?MASK:'Token API de Envia.com';
    badge.textContent=saved?'Token guardado':'Sin conectar';
  };
  const refresh=async()=>{
    showSaved(false);
    status.textContent='';
    try{
      const data=await request('status');
      showSaved(data.connected);
      if(data.connected)status.textContent='API guardada de forma segura. Para reemplazarla, escribe una nueva clave. Pendiente verificarla con Envia.com.';
    }catch(e){status.textContent=e.message;}
  };
  environment.addEventListener('change',refresh);
  button.addEventListener('click',async()=>{
    const token=keyInput.value.trim();if(!token){status.textContent='Introduce el token API.';return;}
    button.disabled=true;status.textContent='Guardando token de forma segura…';
    try{const data=await request('connect',token);showSaved(true);badge.textContent=data.verified?'Conectado':'Token guardado';status.textContent=data.message||'Operación completada.';}
    catch(e){status.textContent=e.message;}
    finally{button.disabled=false;}
  });
  refresh();
  return { root };
}
