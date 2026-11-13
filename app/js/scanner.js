// Lector de códigos: pistola (keyboard wedge) + cámara (BarcodeDetector)
import { toast, modal } from './ui.js';
import { registerCam, dropCam } from './camera.js';

/** Instala el lector tipo pistola (teclea el código y da Enter). */
export function installScanner(handler) {
  let buf = '';
  let last = 0;
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
    const now = Date.now();
    if (now - last > 120) buf = '';
    last = now;

    if (e.key === 'Enter') {
      if (buf.length >= 4 && !typing) {
        handler(buf);
        buf = '';
        e.preventDefault();
      }
      return;
    }
    if (e.key.length === 1 && !typing) buf += e.key;
    if (buf.length > 40) buf = buf.slice(-40);
  });
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar', 'qr_code'];

export function cameraScanSupported() {
  return 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/** Abre la cámara y espera un código. Devuelve el texto leído. */
export async function scanWithCamera() {
  if (!('BarcodeDetector' in window)) {
    throw new Error('Este navegador no lee códigos con cámara. Usa Chrome en Android, o la pistola.');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('La cámara requiere HTTPS (abre la app con https://)');
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (e) {
    const msg = e?.name === 'NotAllowedError' ? 'Permiso de cámara denegado'
      : e?.name === 'NotFoundError' ? 'No se encontró cámara'
      : 'No se pudo abrir la cámara';
    throw new Error(msg);
  }
  registerCam('scan', stream);

  let formats = FORMATS;
  try {
    const sup = await window.BarcodeDetector.getSupportedFormats();
    formats = FORMATS.filter((f) => sup.includes(f));
    if (!formats.length) formats = sup;
  } catch {}

  const m = modal({
    title: 'Escanear código',
    body: `
      <div class="scan-wrap">
        <video id="scan-video" playsinline muted autoplay></video>
        <div class="scan-frame"></div>
        <div class="scan-laser"></div>
      </div>
      <div class="hint" id="scan-hint" style="text-align:center;margin-top:10px">
        Acerca el código de barras al recuadro
      </div>`,
    foot: `<button class="btn ghost sm" data-close>Cerrar</button>`,
  });

  const video = m.root.querySelector('#scan-video');
  const hint = m.root.querySelector('#scan-hint');
  video.srcObject = stream;
  await video.play().catch(() => {});

  const detector = new window.BarcodeDetector({ formats });

  const cleanup = () => {
    try { stream.getTracks().forEach((t) => t.stop()); } catch {}
    dropCam('scan');
    m.close();
  };

  return new Promise((resolve, reject) => {
    let done = false;
    const stop = (err) => {
      if (done) return;
      done = true;
      cleanup();
      if (err) reject(err); else resolve(null);
    };

    // si el usuario cierra el modal
    const obs = new MutationObserver(() => {
      if (!document.body.contains(m.root)) stop(new Error('cancelado'));
    });
    obs.observe(document.body, { childList: true, subtree: false });

    let raf = null;
    const tick = async () => {
      if (done) return;
      if (!document.body.contains(m.root)) { stop(new Error('cancelado')); return; }
      try {
        const codes = await detector.detect(video);
        if (codes && codes.length) {
          const value = String(codes[0].rawValue || '').trim();
          if (value) {
            done = true;
            try { navigator.vibrate?.(80); } catch {}
            if (hint) hint.textContent = '✓ ' + value;
            cleanup();
            resolve(value);
            return;
          }
        }
      } catch { /* frame no listo */ }
      raf = setTimeout(tick, 180);
    };

    video.onloadeddata = () => tick();
    setTimeout(tick, 700);
  });
}

/** Versión que avisa por toast y devuelve el código (o null). */
export async function scanWithCameraSoft() {
  try {
    const code = await scanWithCamera();
    return code;
  } catch (e) {
    if (String(e.message) !== 'cancelado') toast(e.message);
    return null;
  }
}
