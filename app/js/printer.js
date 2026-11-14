// Impresión de tickets ESC/POS (USB / Bluetooth / WiFi) y respaldo por el navegador.
// Formato compatible con impresoras térmicas de 58 mm (32 caracteres) y 80 mm (48).
import { money, esc } from './ui.js';
import { state } from './store.js';

const LS_USB = 'zoco.printer.usb';
const LS_BT = 'zoco.printer.bt';
const LS_WIFI = 'zoco.printer.wifi';
const LS_PAPER = 'zoco.printer.paper';
const LS_WIN = 'zoco.printer.win';

/** Ancho de papel en caracteres: 58mm = 32, 80mm = 48 */
export function paperWidth() {
  const v = localStorage.getItem(LS_PAPER);
  return v === '80' ? 48 : 32;
}
export function setPaperWidth(mm) {
  localStorage.setItem(LS_PAPER, String(mm));
}
export function paperMm() {
  return paperWidth() === 48 ? 80 : 58;
}

export function printerStatus() {
  return {
    usb: !!localStorage.getItem(LS_USB),
    bt: !!localStorage.getItem(LS_BT),
    wifi: localStorage.getItem(LS_WIFI) || '',
    win: localStorage.getItem(LS_WIN) || '',
    paper: paperMm(),
  };
}

/* ---------- utilidades ---------- */
// ESC/POS no maneja UTF-8: se quitan acentos para que no salgan símbolos raros
const plain = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7EñÑ]/g, '');
const fit = (s, n) => {
  const t = plain(s);
  return t.length > n ? t.slice(0, n - 1) + '.' : t;
};
const padR = (s, n) => { const t = plain(s); return t.length >= n ? t.slice(0, n) : t + ' '.repeat(n - t.length); };
const padL = (s, n) => { const t = plain(s); return t.length >= n ? t.slice(-n) : ' '.repeat(n - t.length) + t; };


/** Datos editables del ticket (Configuración → Ticket) */
function T() {
  const t = state.settings?.ticket || {};
  return {
    name: (t.name || state.company?.name || 'MI TIENDA').toString(),
    line1: (t.line1 || '').toString(),
    phone: (t.phone || '').toString(),
    taxId: (t.taxId || '').toString(),
    footer: (t.footer || '').toString(),
    footerEnd: (t.footerEnd || '').toString(),
    showBrand: t.showBrand !== false,
  };
}
/* ---------- Texto del ticket (vista previa y respaldo navegador) ---------- */
export function ticketText(sale) {
  const W = paperWidth();
  const d = new Date(sale.date);
  const L = [];
  const center = (s) => {
    const t = plain(s);
    const left = Math.max(0, Math.floor((W - t.length) / 2));
    L.push(' '.repeat(left) + t);
  };
  const line = (s = '') => L.push(s);
  const pair = (a, b) => {
    const aa = plain(a), bb = plain(b);
    const space = Math.max(1, W - aa.length - bb.length);
    L.push(aa + ' '.repeat(space) + bb);
  };
  const rule = () => L.push('-'.repeat(W));

  const tk = T();
  center(tk.name.toUpperCase());
  if (tk.line1) center(tk.line1);
  if (tk.taxId) center('RFC ' + tk.taxId);
  center(sale.branchName || '');
  if (tk.phone) center('Tel ' + tk.phone);
  line();
  pair('Ticket #' + sale.code, d.toLocaleDateString('es-MX'));
  pair(d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }), 'Vend: ' + (sale.user || ''));
  if (sale.customer && sale.customer !== '-') line('Cliente: ' + fit(sale.customer, W - 9));
  rule();

  (sale.items || []).forEach((i) => {
    const sizeTxt = i.size && i.size !== 'Único' ? 'T.' + i.size : '';
    const qty = i.qty + 'x ';
    const amount = money(i.price * i.qty);
    const oneLine = qty.length + plain(i.name).length + (sizeTxt ? sizeTxt.length + 1 : 0) + amount.length + 1;
    if (oneLine <= W) {
      const left = qty + plain(i.name) + (sizeTxt ? ' ' + sizeTxt : '');
      line(padR(left, W - amount.length) + amount);
    } else {
      line(qty + fit(i.name, W - qty.length));
      const left2 = sizeTxt ? '   ' + sizeTxt : '';
      line(padR(left2, W - amount.length) + amount);
    }
  });

  rule();
  pair('Subtotal', money(sale.subtotal));
  if (sale.discount) pair('Descuento', '-' + money(sale.discount));
  line('='.repeat(W));
  pair('TOTAL', money(sale.total));
  const mName = { cash: 'Efectivo', debit: 'Debito', credit: 'Credito', other: 'Otro', split: 'Mixto', credit_sale: 'Credito cliente' };
  pair('Pago', mName[sale.method] || sale.method || '');
  if (sale.method === 'cash') {
    pair('Recibido', money(sale.received));
    pair('Cambio', money(sale.change));
  }
  if (sale.refunded) pair('Devuelto', '-' + money(sale.refunded));
  line();
  if (tk.footer) center(tk.footer);
  if (tk.footerEnd) center(tk.footerEnd);
  if (tk.showBrand) center('ZoCo POS');
  return L.join('\n');
}

/* ---------- ESC/POS ---------- */
export function buildEscPos(sale) {
  const enc = new TextEncoder();
  const chunks = [];
  const push = (arr) => chunks.push(new Uint8Array(arr));
  const cmd = (...b) => push(b);
  const text = (s) => { chunks.push(enc.encode(plain(s) + '\n')); };

  cmd(0x1b, 0x40);                       // init
  cmd(0x1b, 0x61, 0x01);                 // center
  cmd(0x1b, 0x45, 0x01);                 // bold on
  cmd(0x1d, 0x21, 0x11);                 // doble alto + ancho (título)
  const tk = T();
  text(tk.name.toUpperCase());
  cmd(0x1d, 0x21, 0x00);
  cmd(0x1b, 0x45, 0x00);                 // bold off
  if (tk.line1) text(tk.line1);
  if (tk.taxId) text('RFC ' + tk.taxId);
  text(sale.branchName || '');
  if (tk.phone) text('Tel ' + tk.phone);
  cmd(0x1b, 0x61, 0x00);                 // left

  const body = ticketText(sale).split('\n');
  // quita las líneas del encabezado que ya se imprimieron arriba
  const skip = 2 + (tk.line1 ? 1 : 0) + (tk.taxId ? 1 : 0) + (tk.phone ? 1 : 0);
  body.slice(skip).forEach((l) => text(l));

  cmd(0x1b, 0x64, 0x03);                 // feed 3 líneas
  cmd(0x1d, 0x56, 0x42, 0x00);           // corte parcial
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

/* ---------- USB ---------- */
export async function connectUsbPrinter() {
  if (!('usb' in navigator)) throw new Error('Este navegador no soporta WebUSB');
  const device = await navigator.usb.requestDevice({ filters: [{ classCode: 7 }] });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration.interfaces.find((i) => i.alternate.interfaceClass === 7) || device.configuration.interfaces[0];
  await device.claimInterface(iface.interfaceNumber);
  localStorage.setItem(LS_USB, JSON.stringify({ vendorId: device.vendorId, productId: device.productId }));
  return device;
}

async function sendUsb(bytes) {
  const saved = JSON.parse(localStorage.getItem(LS_USB) || 'null');
  if (!saved) throw new Error('Conecta la impresora USB primero');
  const devices = await navigator.usb.getDevices();
  const device = devices.find((d) => d.vendorId === saved.vendorId && d.productId === saved.productId);
  if (!device) throw new Error('Impresora USB no encontrada');
  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration.interfaces.find((i) => i.alternate.interfaceClass === 7) || device.configuration.interfaces[0];
  const alt = iface.alternate || iface.alternates[0];
  try { await device.claimInterface(iface.interfaceNumber); } catch {}
  const ep = alt.endpoints.find((e) => e.direction === 'out');
  if (!ep) throw new Error('La impresora no tiene salida USB');
  return device.transferOut(ep.endpointNumber, bytes);
}

/* ---------- Bluetooth ---------- */
export async function connectBluetoothPrinter() {
  if (!('bluetooth' in navigator)) throw new Error('Este navegador no soporta Web Bluetooth');
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'],
  });
  const server = await device.gatt.connect();
  localStorage.setItem(LS_BT, JSON.stringify({ id: device.id, name: device.name || 'Impresora' }));
  return { device, server };
}

async function sendBluetooth(bytes) {
  const saved = JSON.parse(localStorage.getItem(LS_BT) || 'null');
  if (!saved) throw new Error('Conecta la impresora Bluetooth primero');
  let target = null;
  try {
    if (navigator.bluetooth.getDevices) {
      const list = await navigator.bluetooth.getDevices();
      target = list.find((d) => d.id === saved.id) || null;
    }
  } catch {}
  if (!target) {
    target = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'] });
  }
  if (!target) throw new Error('Selecciona la impresora Bluetooth');
  const server = await target.gatt.connect();
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    for (const ch of chars) {
      if (ch.properties.write || ch.properties.writeWithoutResponse) {
        const CH = 120;
        for (let i = 0; i < bytes.length; i += CH) {
          await ch.writeValue(bytes.slice(i, i + CH));
        }
        return true;
      }
    }
  }
  throw new Error('No se encontró el canal de escritura');
}

/* ---------- WiFi (TCP 9100 vía servidor local) ---------- */
export function connectWifiPrinter(host, port = 9100) {
  localStorage.setItem(LS_WIFI, `${host}:${port}`);
  return { host, port };
}

async function sendWifi(bytes) {
  const saved = localStorage.getItem(LS_WIFI);
  if (!saved) throw new Error('Configura la impresora WiFi primero');
  const [host, port] = saved.split(':');
  const b64 = btoa(String.fromCharCode(...bytes));
  const r = await fetch('/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, port: Number(port) || 9100, data: b64 }),
  });
  if (!r.ok) throw new Error('El servidor local no pudo imprimir (¿está encendida la PC?)');
  return true;
}


/* ---------- Impresora de Windows (USB, ESC/POS crudo) ---------- */
export function connectWindowsPrinter(name) {
  localStorage.setItem(LS_WIN, name);
  return name;
}

export async function listWindowsPrinters() {
  const r = await fetch('/api/printers');
  if (!r.ok) throw new Error('El servidor local no está corriendo (abre la app desde la PC)');
  const data = await r.json();
  if (!data.ok) throw new Error(data.error || 'No se pudieron listar');
  return data.printers || [];
}

async function sendWindows(bytes) {
  const printer = localStorage.getItem(LS_WIN);
  if (!printer) throw new Error('Elige tu impresora de Windows');
  const b64 = btoa(String.fromCharCode(...bytes));
  const r = await fetch('/api/print-raw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printer, data: b64 }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || 'No se pudo imprimir');
  return true;
}
/* ---------- Respaldo: impresión del navegador (sin ventanas emergentes) ---------- */
function printViaBrowser(sale) {
  const text = ticketText(sale);
  const mm = paperMm();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${esc(sale.code)}</title>
  <style>
    @page { size: ${mm}mm auto; margin: 0; }
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{background:#fff}
    body{font-family:'Courier New',monospace;font-size:${mm === 58 ? '11px' : '12px'};line-height:1.35;padding:4mm;color:#000}
    pre{white-space:pre-wrap;word-break:break-word;font-family:inherit}
  </style></head><body><pre>${esc(text)}</pre></body></html>`;

  let fr = document.getElementById('zoco-print-frame');
  if (fr) fr.remove();
  fr = document.createElement('iframe');
  fr.id = 'zoco-print-frame';
  fr.setAttribute('aria-hidden', 'true');
  fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(fr);

  const doc = fr.contentDocument;
  doc.open(); doc.write(html); doc.close();

  setTimeout(() => {
    try {
      fr.contentWindow.focus();
      fr.contentWindow.print();
    } catch (e) {
      console.warn('print', e);
    }
  }, 250);

  return { ok: true, message: 'Abriendo impresión del navegador (' + mm + ' mm)' };
}
/* ---------- Imprimir ---------- */
export async function printTicket(sale) {
  const st = printerStatus();
  const bytes = buildEscPos(sale);
  const tries = [];
  if (st.win) tries.push(['Windows/' + st.win, () => sendWindows(bytes)]);
  if (st.usb) tries.push(['USB', () => sendUsb(bytes)]);
  if (st.wifi) tries.push(['WiFi', () => sendWifi(bytes)]);
  if (st.bt) tries.push(['Bluetooth', () => sendBluetooth(bytes)]);

  for (const [name, fn] of tries) {
    try {
      await fn();
      return { ok: true, message: `Ticket enviado por ${name}` };
    } catch (e) {
      console.warn('print', name, e);
    }
  }
  if (!tries.length) return printViaBrowser(sale);
  // si todo falló, explica y usa el navegador
  const r = printViaBrowser(sale);
  return { ok: r.ok, message: 'No se pudo conectar la impresora; se abrió el diálogo del navegador' };
}
