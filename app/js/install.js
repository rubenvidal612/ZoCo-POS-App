// Aviso de instalación PWA (PC y celular)
let deferred = null;
let shown = false;

const KEY_DISMISS = 'zoco.install.dismissed';
const DAY = 86400000;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isChromeDesktop = () => /chrome|edg/i.test(navigator.userAgent) && !isAndroid() && !/mobile/i.test(navigator.userAgent);

/* Recupera el evento capturado desde index.html (lo antes posible) */
if (window.__bip) deferred = window.__bip;
window.addEventListener('zoco:installable', () => { if (window.__bip) deferred = window.__bip; });

/* Capturamos también aquí por si el evento llega después */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  const card = document.getElementById('install-card');
  if (card) {
    const go = card.querySelector('#ic-go');
    const steps = card.querySelector('#ic-steps');
    if (go) go.innerHTML = '<span>⬇</span> Instalar ahora';
    if (steps) steps.hidden = true;
    card.classList.remove('with-steps');
  } else {
    setTimeout(() => showInstallCard(), 900);
  }
});

window.addEventListener('appinstalled', () => {
  try { localStorage.setItem(KEY_DISMISS, String(Date.now())); } catch {}
  const card = document.getElementById('install-card');
  if (card) { card.classList.remove('in'); setTimeout(() => card.remove(), 220); }
});

function stepsHTML() {
  if (isIOS()) {
    return `<b>En iPhone / iPad:</b>
      <ol>
        <li>Toca <span>Compartir</span> ⬆︎ abajo en Safari.</li>
        <li>Elige <span>“Agregar a inicio”</span>.</li>
        <li>Confirma con <span>Agregar</span>.</li>
      </ol>`;
  }
  if (isAndroid()) {
    return `<b>En Android:</b>
      <ol>
        <li>Abre el menú <span>⋮</span> arriba a la derecha.</li>
        <li>Toca <span>“Instalar aplicación”</span> o <span>“Agregar a pantalla principal”</span>.</li>
        <li>Confirma.</li>
      </ol>`;
  }
  return `<b>En la computadora:</b>
    <ol>
      <li>En Chrome/Edge busca el ícono <span>⊕</span> en la barra de direcciones.</li>
      <li>O abre el menú <span>⋮</span> → <span>“Instalar ZoCo”</span>.</li>
      <li>Confirma para crear el acceso.</li>
    </ol>`;
}

function buildCard() {
  const el = document.createElement('div');
  el.className = 'install-card';
  el.id = 'install-card';
  el.innerHTML = `
    <button class="ic-x" id="ic-close" aria-label="Cerrar">✕</button>
    <div class="ic-top">
      <img class="ic-logo" src="/zoco-192.png" alt="ZoCo">
      <div class="ic-txt">
        <b>Instala ZoCo en ${isIOS() || isAndroid() ? 'tu celular' : 'esta computadora'}</b>
        <span>Ábrela como app: un toque, pantalla completa y sin internet</span>
      </div>
    </div>
    <div class="ic-points">
      <span>⚡ Un toque para abrir</span>
      <span>📴 Funciona sin internet</span>
      <span>🖥 Pantalla completa</span>
    </div>
    <button class="ic-main" id="ic-go"><span>⬇</span> Instalar ahora</button>
    <div class="ic-steps" id="ic-steps" hidden>${stepsHTML()}</div>
    <button class="ic-later" id="ic-later">Ahora no</button>
  `;
  return el;
}

export function showInstallCard(force = false) {
  if (!force && isStandalone()) return;
  if (document.getElementById('install-card')) return;

  const card = buildCard();
  document.body.appendChild(card);
  requestAnimationFrame(() => card.classList.add('in'));
  shown = true;

  const go = card.querySelector('#ic-go');
  const steps = card.querySelector('#ic-steps');

  card.querySelector('#ic-close').onclick = () => dismiss();
  card.querySelector('#ic-later').onclick = () => dismiss();

  go.onclick = async () => {
    if (deferred) {
      deferred.prompt();
      const res = await deferred.userChoice;
      deferred = null;
      if (res?.outcome === 'accepted') { dismiss(); return; }
      steps.hidden = false;
      card.classList.add('with-steps');
      return;
    }
    // Sin diálogo nativo: mostramos los pasos ahí mismo
    steps.hidden = !steps.hidden;
    card.classList.toggle('with-steps', !steps.hidden);
    go.innerHTML = steps.hidden ? '<span>⬇</span> Instalar ahora' : '<span>✓</span> Ocultar pasos';
  };
}

export function dismiss() {
  const card = document.getElementById('install-card');
  if (card) {
    card.classList.remove('in');
    setTimeout(() => card.remove(), 220);
  }
  try { localStorage.setItem(KEY_DISMISS, String(Date.now())); } catch {}
  shown = false;
}

export function initInstallPrompt() {
  try {
    const last = Number(localStorage.getItem(KEY_DISMISS) || 0);
    if (isStandalone()) return;
    if (Date.now() - last < 7 * DAY) return;
  } catch {}

  setTimeout(() => {
    if (shown || isStandalone()) return;
    if (deferred || isIOS() || isAndroid() || isChromeDesktop()) showInstallCard();
  }, 6000);
}

/* Se conservan por compatibilidad, pero ya no se usan */
export function mountInstallButtons() {
  document.querySelector('.install-side')?.remove();
  document.querySelector('.install-fab')?.remove();
}
