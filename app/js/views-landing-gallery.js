import { el, toast } from './ui.js';
import { myAffCode } from './store.js';

const landingOptions = [
  { name: 'Landing 1', badge: '✓ Original', title: 'Landing clásica', description: 'La presentación original de ZoCo POS.', url: '/landing', color: '#1266f4', border: '#bcd6ff', tint: '#f5f9ff', badgeColor: '#0e762d', badgeBackground: '#e5f7e9' },
  { name: 'Landing 2', badge: '✦ Nueva opción', title: 'ZoCo con Inteligencia Artificial', description: 'Agentes IA, giros de negocio, integraciones y programa de afiliados.', url: '/landing-2', color: '#e95000', border: '#ff9b61', tint: '#fff7f3', badgeColor: '#803b07', badgeBackground: '#fff0d5' },
];

export function landingGalleryView() {
  const code = myAffCode();
  const selectedKey = 'zoco.affiliate.landing.' + code;
  const selected = localStorage.getItem(selectedKey) || '/landing';
  const personalizedUrl = (path) => path + '?ref=' + encodeURIComponent(code);
  const root = el(`<div style="width:100%;max-width:1250px;margin:auto">
    <p style="margin:0 0 14px;color:var(--muted,#52617a)">Elige la página que compartirás como afiliado. Los enlaces incluyen tu código de referido.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,425px),1fr));gap:16px">
      ${landingOptions.map(item => `<article style="background:${item.tint};color:#111d37;border:1px solid ${item.border};border-radius:18px;padding:clamp(10px,2vw,17px);min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
          <b style="background:${item.color};color:white;padding:5px 13px;border-radius:20px">${item.name}</b>
          <small style="background:${item.badgeBackground};color:${item.badgeColor};padding:5px 9px;border-radius:20px;font-weight:700">${item.badge}</small>
        </div>
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${item.name}" style="display:block;position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:12px;border:1px solid #e0e6f0;background:white">
          <iframe title="Vista previa de ${item.name}" loading="lazy" tabindex="-1" aria-hidden="true" src="${item.url}" style="position:absolute;inset:0;width:1200px;height:675px;transform:scale(var(--preview-scale,.25));transform-origin:top left;border:0;pointer-events:none"></iframe>
        </a>
        <h2 style="margin:10px 0 3px;font-size:18px">${item.title}</h2>
        <p style="margin:0 0 9px;color:#41536e;font-size:14px">${item.description}</p>
        <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">
          <a href="${personalizedUrl(item.url)}" target="_blank" rel="noopener noreferrer" style="background:${item.color};color:white;border-radius:9px;padding:8px 12px;text-decoration:none;font-weight:750">↗ Ver mi landing</a>
          <button type="button" data-select="${item.url}" aria-pressed="${selected === item.url}" style="border:1px solid #b8d6c4;background:${selected === item.url ? '#d8f9e4' : 'white'};color:#125b35;border-radius:9px;padding:8px 11px;font:inherit;font-weight:700;cursor:pointer">${selected === item.url ? '✓ Elegida' : 'Elegir landing'}</button>
          <button type="button" data-copy="${personalizedUrl(item.url)}" style="border:1px solid #dce3ef;background:white;color:#15213c;border-radius:9px;padding:8px 11px;font:inherit;font-weight:700;cursor:pointer">Copiar enlace</button>
          <small style="margin-left:auto;background:#eaf0fa;color:#263955;padding:5px 9px;border-radius:13px">${item.url}?ref=${encodeURIComponent(code)}</small>
        </div>
      </article>`).join('')}
    </div>
  </div>`);
  const observer = new ResizeObserver(entries => {
    for (const { target, contentRect } of entries) {
      target.style.setProperty('--preview-scale', String(contentRect.width / 1200));
    }
  });
  root.querySelectorAll('iframe').forEach(frame => observer.observe(frame.parentElement));
  root.querySelectorAll('[data-select]').forEach(button => {
    button.onclick = () => {
      localStorage.setItem(selectedKey, button.dataset.select);
      root.querySelectorAll('[data-select]').forEach(other => {
        const active = other.dataset.select === button.dataset.select;
        other.textContent = active ? '✓ Elegida' : 'Elegir landing';
        other.setAttribute('aria-pressed', String(active));
        other.style.background = active ? '#d8f9e4' : 'white';
      });
      toast('Landing elegida para tus referidos');
    };
  });
  root.querySelectorAll('[data-copy]').forEach(button => {
    button.onclick = async () => {
      const url = new URL(button.dataset.copy, location.origin).href;
      try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); }
      catch { window.prompt('Copia el enlace', url); }
    };
  });
  return { root, destroy: () => observer.disconnect() };
}
