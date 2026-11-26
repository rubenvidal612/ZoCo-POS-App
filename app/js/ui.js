import { mascotAsset, playMascotGreeting } from './mascot.js';
// Utilidades de UI compartidas
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const money = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(Number(n) || 0);

export const num = (n) => new Intl.NumberFormat('es-MX').format(Number(n) || 0);

export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let noticeCount = 0;
const noticeMascot = (mood = 'happy') => '<span class="zoco-notice-mascot ' + mood + '" aria-hidden="true"><img data-zoco-mascot-img src="' + mascotAsset() + '" alt=""></span>';
export function toast(msg, ms = 2200) {
  const root = $('#toast-root');
  const mood = ['happy','excited','curious'][noticeCount++ % 3];
  const node = el(`<div class="toast zoco-mascot-toast">${noticeMascot(mood)}<span>${esc(msg)}</span></div>`);
  root.appendChild(node);
  playMascotGreeting(node);
  setTimeout(() => { node.style.opacity = '0'; node.style.transition = 'opacity .2s'; setTimeout(() => node.remove(), 220); }, ms);
}

/** Abre un modal. Devuelve {root, close}. */
export function modal({ title = '', body = '', foot = '', wide = false, onClose }) {
  const root = $('#modal-root');
  const ov = el(`
    <div class="overlay">
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="icon-btn" data-close aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body">${body}</div>
        ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
      </div>
    </div>`);
  const close = () => { ov.remove(); onClose?.(); };
  ov.addEventListener('click', (e) => {
    if (e.target === ov || e.target.closest('[data-close]')) close();
  });
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  root.appendChild(ov);
  setTimeout(() => ov.querySelector('input,select,textarea,button')?.focus?.(), 30);
  return { root: ov, close, body: ov.querySelector('.modal-body'), footEl: ov.querySelector('.modal-foot') };
}

export function confirmDialog({ title, message, okText = 'Confirmar', danger = false, requireReason = false }) {
  return new Promise((resolve) => {
    const m = modal({
      title,
      body: `
        <div class="zoco-notice-message">${noticeMascot(danger ? 'concerned' : 'happy')}<p style="margin:0 0 14px;color:var(--text-2);line-height:1.5">${esc(message)}</p></div>
        ${requireReason ? `<div class="field"><label>Motivo</label>
          <select id="cf-reason">
            <option value="Error de captura">Error de captura</option>
            <option value="Devolución del cliente">Devolución del cliente</option>
            <option value="Producto dañado">Producto dañado</option>
            <option value="Prueba">Prueba</option>
            <option value="Otro">Otro</option>
          </select></div>` : ''}`,
      foot: `<button class="btn ghost sm" data-cf-no>Cancelar</button>
             <button class="btn ${danger ? 'danger' : ''} sm" data-cf-yes>${esc(okText)}</button>`,
    });
    m.root.querySelector('[data-cf-no]').onclick = () => { m.close(); resolve(false); };
    m.root.querySelector('[data-cf-yes]').onclick = () => {
      const reason = m.root.querySelector('#cf-reason')?.value || null;
      m.close(); resolve(reason ?? true);
    };
  });
}

/**
 * Lee una imagen del usuario y la deja SIEMPRE ligera.
 * - Máximo 900px de lado (antes 1200)
 * - WebP/JPEG con calidad 0.7
 * - Si aún pesa más de `maxBytes` (90 KB), baja calidad y tamaño en pasos
 * Devuelve { dataUrl, width, height, bytes }.
 */
export function readImageCompressed(file, maxSize = 900, quality = 0.7, maxBytes = 90 * 1024) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let side = maxSize;
        let q = quality;
        let out = '';
        let cw = 0, ch = 0;
        for (let intento = 0; intento < 6; intento++) {
          const scale = Math.min(1, side / Math.max(img.width, img.height));
          cw = Math.max(1, Math.round(img.width * scale));
          ch = Math.max(1, Math.round(img.height * scale));
          const cv = document.createElement('canvas');
          cv.width = cw; cv.height = ch;
          const ctx = cv.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, cw, ch);
          out = cv.toDataURL('image/webp', q);
          if (out.indexOf('data:image/webp') !== 0) out = cv.toDataURL('image/jpeg', q);
          const bytes = Math.round(out.length * 0.75);
          if (bytes <= maxBytes) break;
          // todavía pesa: primero baja calidad, luego reduce tamaño
          if (q > 0.45) q = Math.max(0.45, q - 0.1);
          else side = Math.max(320, Math.round(side * 0.8));
        }
        resolve({ dataUrl: out, width: cw, height: ch, bytes: Math.round(out.length * 0.75) });
      } catch (e) { reject(new Error('No se pudo comprimir la imagen')); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}
/** Comprime un dataURL de imagen a JPEG del tamaño indicado (para fotos ligeras). */
export function compressDataUrl(dataUrl, maxSize = 320, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** Toma un frame del video (cámara) y lo devuelve comprimido. */
export function captureVideoFrame(video, maxSize = 320, quality = 0.6) {
  try {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, maxSize / Math.max(w, h));
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * scale);
    cv.height = Math.round(h * scale);
    cv.getContext('2d').drawImage(video, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', quality);
  } catch { return null; }
}
export const pad = (n) => String(n).padStart(2, '0');
