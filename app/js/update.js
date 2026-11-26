// Aviso flotante de actualización + botón flotante de notificaciones
import { subscribePush } from './notify.js';
import { reactMascot, mascotAsset, playMascotGreeting } from './mascot.js';

const SEEN = 'zoco.version.seen';

function card(html, cls = '') {
  const el = document.createElement('div');
  el.className = 'float-card ' + cls;
  el.innerHTML = html;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  return el;
}

const closeCard = (el) => {
  el.classList.remove('in');
  setTimeout(() => el.remove(), 220);
};

/* ---------- Actualización ---------- */
export async function checkUpdate() {
  try {
    const r = await fetch('/version.json?x=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const v = await r.json();
    const seen = localStorage.getItem(SEEN);
    if (seen === v.version) return;
    showUpdateCard(v);
  } catch {}
}

export function showUpdateCard(v) {
  if (document.getElementById('upd-card')) return;
  const el = card(`
    <button class="fc-x" aria-label="Cerrar">✕</button>
    <div class="fc-top">
      <div class="fc-ico fc-mascot-update"><img data-zoco-mascot-img src="${mascotAsset()}" alt="Mascota ZoCo"></div>
      <div class="fc-txt"><b>Hay una actualización</b><span>Versión ${v.version} · ${v.date}</span></div>
    </div>
    <ul class="fc-notes">${(v.notes || []).slice(0, 5).map((n) => `<li>${n}</li>`).join('')}</ul>
    <div class="fc-actions">
      <button class="btn orange" id="upd-go">Actualizar ahora</button>
      <button class="btn ghost" id="upd-later">Después</button>
    </div>
  `);
  el.id = 'upd-card';
  playMascotGreeting(el);
  reactMascot('excited');
  el.querySelector('.fc-x').onclick = () => { localStorage.setItem(SEEN, v.version); closeCard(el); };
  el.querySelector('#upd-later').onclick = () => { localStorage.setItem(SEEN, v.version); closeCard(el); };
  el.querySelector('#upd-go').onclick = () => applyUpdate(v.version);
}

async function applyUpdate(version) {
  const btn = document.querySelector('#upd-go');
  if (btn) { btn.textContent = 'Actualizando…'; btn.disabled = true; }
  try {
    try { localStorage.setItem(SEEN, version); } catch {}
    try { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } catch {}
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.update();
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  } catch {}
  location.reload();
}

/* ---------- Botón flotante de notificaciones ---------- */
export function initNotifPill() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  if (localStorage.getItem('zoco.notifpill.hidden')) return;

  const el = card(`
    <button class="fc-x" aria-label="Cerrar">✕</button>
    <div class="fc-top">
      <div class="fc-ico fc-mascot-update"><img data-zoco-mascot-img src="${mascotAsset()}" alt="Mascota ZoCo"></div>
      <div class="fc-txt"><b>Activa los avisos</b><span>Entérate de cada venta al instante</span></div>
    </div>
    <div class="fc-actions">
      <button class="btn orange" id="pill-on">Activar</button>
    </div>
  `, 'pill');
  el.id = 'notif-pill';
  playMascotGreeting(el);

  el.querySelector('.fc-x').onclick = () => { localStorage.setItem('zoco.notifpill.hidden', '1'); closeCard(el); };
  el.querySelector('#pill-on').onclick = async () => {
    const b = el.querySelector('#pill-on');
    b.textContent = 'Activando…';
    const r = await subscribePush();
    if (r.ok) { b.textContent = '✅ Listo'; setTimeout(() => closeCard(el), 900); }
    else { b.textContent = 'No se pudo'; setTimeout(() => closeCard(el), 1200); }
  };
}

/* ---------- Detecta cuando el service worker tiene versión nueva ---------- */
export function watchServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          fetch('/version.json?x=' + Date.now()).then((r) => r.json()).then(showUpdateCard).catch(() => {});
        }
      });
    });
  });
}

/** Vigila cambios sin que el usuario recargue: cada 45s y al volver a la app. */
export function startUpdateWatcher() {
  const tick = async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.update().catch(() => {});
    } catch {}
    checkUpdate();
  };
  tick();
  setInterval(tick, 45000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
  window.addEventListener('focus', () => tick());
  window.addEventListener('online', () => tick());
}