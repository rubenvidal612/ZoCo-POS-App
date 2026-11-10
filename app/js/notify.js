// Notificaciones: locales + Web Push real (VAPID)
import { state } from './store.js';

const b64ToU8 = (base64) => {
  const pad = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(pad.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function requestNotifyPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

/** Suscribe este dispositivo a Web Push (funciona con la app cerrada). */
export async function subscribePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, error: 'Este navegador no soporta push' };
    }
    const perm = await requestNotifyPermission();
    if (perm !== 'granted') return { ok: false, error: 'Permiso de notificaciones denegado' };

    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch('/api/push/key').then((r) => r.json());
    if (!keyRes?.key) return { ok: false, error: 'El servidor no tiene llave VAPID' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToU8(keyRes.key),
      });
    }
    const json = sub.toJSON();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        company: state.currentCompany || 'default',
        userId: state.user?.id,
        role: state.user?.role,
      }),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

export function notifySale(sale) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const title = '💰 Nueva venta ' + (sale.code || '');
    const body = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(sale.total)
      + ' · ' + (sale.user || '') + ' · ' + (sale.items?.length || 0) + ' artículo(s)';
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, { body, icon: '/zoco-192.png', badge: '/zoco-192.png', tag: sale.id }));
    } else {
      new Notification(title, { body, icon: '/zoco-192.png' });
    }
    return true;
  } catch { return false; }
}
