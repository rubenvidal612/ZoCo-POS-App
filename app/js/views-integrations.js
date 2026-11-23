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
  .zoco-integrations .zi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:18px}
  .zoco-integrations .zi-card{background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:22px;padding:22px;box-shadow:0 8px 28px rgba(16,24,40,.045)}
  .zoco-integrations .zi-top{display:flex;align-items:center;gap:12px;margin-bottom:20px}
  .zoco-integrations .zi-logo{height:54px;width:54px;display:grid;place-items:center;border-radius:15px;font-size:24px;font-weight:900;background:#e9f4ff;color:#1682c8;flex-shrink:0}.zoco-integrations .zi-logo-mp{background:#e6f6ff}.zoco-integrations .zi-logo-envia{background:#e4f7f1}
  .zoco-integrations .zi-name{font-size:19px;font-weight:750}
  .zoco-integrations .zi-badge{margin-left:auto;background:#f1f5f9;color:#64748b;border-radius:30px;padding:7px 10px;font-size:11px;font-weight:750;white-space:nowrap}
  .zoco-integrations .zi-panel{background:var(--bg,#f8fafc);border-radius:15px;padding:15px;margin:16px 0}
  .zoco-integrations .zi-line{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px}
  .zoco-integrations .zi-line:last-child{border-bottom:0}
  .zoco-integrations .zi-line span:last-child{color:var(--muted,#64748b);text-align:right}
  .zoco-integrations .zi-label{font-size:13px;font-weight:700;margin-bottom:8px;display:block}
  .zoco-integrations input{width:100%;padding:12px;border-radius:10px;border:1px solid var(--border,#cbd5e1);background:var(--card,#fff);color:inherit;box-sizing:border-box;font-size:15px}
  .zoco-integrations button{border:0;border-radius:12px;background:#f97316;color:#fff;font-weight:750;padding:13px 17px;cursor:pointer;width:100%;margin-top:12px}
  .zoco-integrations button:disabled{opacity:.55;cursor:not-allowed}
  .zoco-integrations .zi-hint{font-size:12px;color:var(--muted,#64748b);margin-top:10px}
  .zoco-integrations a{color:#167ac6}
  .zoco-integrations .zi-banner{border:1px solid #f6d5a8;background:#fff8ee;color:#855318;border-radius:14px;padding:13px 15px;margin-bottom:20px;font-size:13px}
  `;
  root.append(css);
  const wrap=document.createElement('div');root.append(wrap);
  wrap.innerHTML = `
    <div class="zi-head"><h2>🔌 Integraciones</h2><p>Conecta los servicios de tu negocio para cobrar y enviar desde ZoCo.</p></div>
    <div class="zi-banner">Configuración en preparación. Por seguridad, ZoCo todavía no recibe ni guarda credenciales de terceros desde esta pantalla.</div>
    <div class="zi-grid">
      <article class="zi-card">
        <div class="zi-top"><div class="zi-logo zi-logo-mp"><img src="https://www.google.com/s2/favicons?domain=mercadopago.com.mx&sz=128" alt="Ícono oficial de Mercado Pago" width="43" height="43" loading="lazy"></div><div><div class="zi-name">Mercado Pago</div><p>Cobros online y terminal Point</p></div><span class="zi-badge">Sin conectar</span></div>
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
      </article>
      <article class="zi-card">
        <div class="zi-top"><div class="zi-logo zi-logo-envia"><img src="https://www.google.com/s2/favicons?domain=envia.com&sz=128" alt="Ícono de Envia.com" width="43" height="43" loading="lazy"></div><div><div class="zi-name">Envia.com</div><p>Guías, cotizaciones y rastreo</p></div><span class="zi-badge">Sin conectar</span></div>
        <div class="zi-panel">
          <div class="zi-line"><b>Cotizar envíos</b><span>Varias paqueterías</span></div>
          <div class="zi-line"><b>Generar etiquetas</b><span>Desde tus ventas</span></div>
          <div class="zi-line"><b>Rastreo</b><span>En el pedido</span></div>
        </div>
        <label class="zi-label" for="zi-envia-key">Clave API de Envia.com</label>
        <input id="zi-envia-key" type="password" placeholder="••••••••••••••••" disabled autocomplete="off">
        <button type="button" id="zi-envia-connect" disabled>Conectar Envia.com</button>
        <p class="zi-hint">La clave deberá guardarse cifrada en el servidor, separada de los datos del negocio. No la pegues hasta habilitar la conexión segura.</p>
        <a href="https://developers.envia.com/" target="_blank" rel="noopener noreferrer">Documentación oficial de Envia.com</a>
      </article>
    </div>`;
  return { root };
}
