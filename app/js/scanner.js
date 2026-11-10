// Lector de códigos: pistola (keyboard wedge) + cámara (BarcodeDetector)
let buffer = '';
let lastKey = 0;
let installed = false;
let onCode = null;

/** Instala el listener global. La pistola "teclea" el código y manda Enter. */
export function installScanner(handler) {
  onCode = handler;
  if (installed) return;
  installed = true;
  window.addEventListener('keydown', (e) => {
    const tag = (e.target?.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
    const now = Date.now();
    if (now - lastKey > 160) buffer = '';
    lastKey = now;

    if (e.key === 'Enter') {
      if (buffer.length >= 4) {
        const code = buffer; buffer = '';
        e.preventDefault();
        onCode?.(code);
      }
      return;
    }
    if (!typing && /^[0-9A-Za-z._-]$/.test(e.key)) buffer += e.key;
  });
}

/** Lee un código con la cámara (requiere BarcodeDetector + permiso). */
export async function scanWithCamera() {
  if (!('BarcodeDetector' in window)) throw new Error('Este navegador no soporta escaneo por cámara');
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  const video = document.createElement('video');
  video.srcObject = stream; video.autoplay = true; video.playsInline = true;
  video.style.cssText = 'width:100%;border-radius:14px;background:#000';
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" id="cam-ov">
      <div class="modal" style="width:520px">
        <div class="modal-head"><h3>Escanear código</h3><button class="icon-btn" id="cam-x">✕</button></div>
        <div class="modal-body" id="cam-body"></div>
      </div>
    </div>`;
  const body = document.getElementById('cam-body');
  body.appendChild(video);
  const close = () => { stream.getTracks().forEach((t) => t.stop()); document.getElementById('cam-ov')?.remove(); };
  document.getElementById('cam-x').onclick = close;

  const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'] });
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const codes = await detector.detect(video);
        if (codes.length) { const v = codes[0].rawValue; close(); resolve(v); return; }
      } catch { /* frame no listo */ }
      if (!document.getElementById('cam-ov')) { reject(new Error('cancelado')); return; }
      requestAnimationFrame(tick);
    };
    video.onloadedmetadata = () => requestAnimationFrame(tick);
  });
}
