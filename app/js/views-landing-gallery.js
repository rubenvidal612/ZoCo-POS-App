import { el, toast } from './ui.js';
const landingOptions = [
  { name: 'Landing 1', title: 'Landing clásica', description: 'La presentación original de ZoCo POS, conservada sin cambios.', url: '/landing', color: '#2467df' },
  { name: 'Landing 2', title: 'ZoCo con Inteligencia Artificial', description: 'Nueva versión interactiva: agentes IA, giros comerciales, integraciones y afiliados.', url: '/landing-2', color: '#f97316' },
];
export function landingGalleryView(ctx) {
  const root = el(`<div class="landing-gallery" style="width:100%;padding:clamp(14px,3vw,34px);background:#f6f8fc;border-radius:18px;color:#111d37">
    <div style="margin-bottom:24px"><span style="color:#f97316;font-size:12px;font-weight:800;letter-spacing:1.4px">PÁGINAS DE PRESENTACIÓN</span><h2 style="font-size:clamp(25px,3vw,38px);margin:8px 0">Elige tu Landing</h2><p style="color:#68758c;margin:0">Compara tus diseños, abre cada versión y comparte su enlace independiente. Podemos agregar más opciones en el futuro.</p></div>
    <div class="landing-gallery-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:20px">
      ${landingOptions.map((item,i)=>`<article style="background:#fff;border:1px solid #e0e6f0;border-radius:22px;padding:17px;box-shadow:0 12px 35px #1b2d4d0d;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:13px"><b style="background:${item.color};color:white;padding:9px 15px;border-radius:22px">${item.name}</b><small style="color:#6b7790">${i===0?'Original':'Nueva opción'}</small></div>
        <div style="height:clamp(180px,24vw,265px);border-radius:15px;border:1px solid #dce5f3;overflow:hidden;position:relative;background:#fff">
          <iframe title="Vista previa de ${item.name}" loading="lazy" tabindex="-1" aria-hidden="true" src="${item.url}" style="position:absolute;top:0;left:0;width:1000px;height:690px;transform:scale(.39);transform-origin:top left;border:0;pointer-events:none"></iframe>
          <a href="${item.url}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${item.name}" style="position:absolute;inset:0"></a>
        </div>
        <h3 style="margin:17px 0 7px;font-size:20px">${item.title}</h3><p style="color:#65728a;line-height:1.5;min-height:48px;margin:0 0 16px">${item.description}</p>
        <div style="display:flex;gap:9px;flex-wrap:wrap"><a href="${item.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${item.color};color:white;border-radius:12px;padding:11px 15px;text-decoration:none;font-weight:750">Ver landing ↗</a><button type="button" data-copy="${item.url}" style="border:1px solid #dce3ef;background:white;color:#15213c;border-radius:12px;padding:11px 15px;font-weight:750;cursor:pointer">Copiar enlace</button></div>
        <div style="font-size:12px;color:#7b879c;overflow-wrap:anywhere;margin-top:12px">${item.url}</div>
      </article>`).join('')}
    </div>
    <p style="margin:22px 0 0;color:#7a879c;font-size:13px">Cada landing tiene su propia URL. Abrir o copiar una versión no modifica la otra.</p>
  </div>`);
  root.querySelectorAll('[data-copy]').forEach(button => {
    button.onclick = async () => {
      const url = location.origin + button.dataset.copy;
      try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); }
      catch { window.prompt('Copia el enlace:', url); }
    };
  });
  return { root };
}
