// Registro global de cámaras: apaga el hardware de verdad (LED incluido)
const streams = new Set();

function kill(stream) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((t) => {
      try { t.enabled = false; } catch {}
      try { t.stop(); } catch {}
    });
  } catch {}
}

export function registerCam(stream) {
  stopAllCams();          // apaga cualquier cámara anterior (aunque sea huérfana)
  streams.add(stream);
  return stream;
}

export function dropCam(stream) {
  if (!stream) return;
  streams.delete(stream);
  kill(stream);
}

export function stopAllCams() {
  for (const s of Array.from(streams)) kill(s);
  streams.clear();
  // Red de seguridad: cualquier <video> con cámara en el documento
  try {
    document.querySelectorAll('video').forEach((v) => {
      const s = v.srcObject;
      if (s && typeof s.getTracks === 'function') { kill(s); v.srcObject = null; }
    });
  } catch {}
}

export function hasCam() {
  return streams.size > 0;
}

export function camCount() {
  return streams.size;
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', stopAllCams);
  window.addEventListener('beforeunload', stopAllCams);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopAllCams();
  });
}
