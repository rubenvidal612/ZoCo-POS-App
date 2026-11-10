// Impresión de tickets: ESC/POS por USB o Bluetooth; respaldo: diálogo del navegador.
import { money, esc } from './ui.js';
import { state } from './store.js';

const LS_USB = 'zoco.printer.usb';
const LS_BT = 'zoco.printer.bt';
const LS_WIFI = 'zoco.printer.wifi';

/* ---------- Texto del ticket (para ESC/POS y para preview) ---------- */
export function ticketText(sale) {
  const d = new Date(sale.date);
  const L = [];
  const line = (s = '') => L.push(s);
  const pair = (a, b) => {
    const w = 42;
    const space = Math.max(1, w - a.length - b.length);
    line(a + ' '.repeat(space) + b);
  };
  line(state.company.name.toUpperCase());
  line(sale.branchName);
  if (state.company.legalId) line('RFC ' + state.company.legalId);
  line('------------------------------------------');
  pair('RECIBO #' + sale.code, d.toLocaleDateString('es-MX'));
  line(d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
  if (sale.customer && sale.customer !== '-') line('Cliente: ' + sale.customer);
  line('------------------------------------------');
  sale.items.forEach((i) => {
    line(`${i.qty}x ${i.name}${i.size !== 'Único' ? ' T.' + i.size : ''}`);
    pair('', money(i.price * i.qty));
  });
  line('------------------------------------------');
  pair('Subtotal', money(sale.subtotal));
  if (sale.discount) pair('Descuento', '-' + money(sale.discount));
  pair('TOTAL', money(sale.total));
  pair('Pagó', money(sale.received));
  if (sale.method === 'cash') pair('Cambio', money(sale.change));
  line('------------------------------------------');
  line('Gracias por su compra');
  line('ZoCo POS');
  return L.join('\n');
}

/* ---------- ESC/POS ---------- */
export function buildEscPos(sale) {
  const enc = new TextEncoder();
  const chunks = [];
  const cmd = (...bytes) => chunks.push(new Uint8Array(bytes));
  const text = (s) => chunks.push(enc.encode(s + '\n'));

  cmd(0x1b, 0x40);              // init
  cmd(0x1b, 0x61, 0x01);        // center
  cmd(0x1b, 0x21, 0x10);        // double height
  text(state.company.name.toUpperCase());
  cmd(0x1b, 0x21, 0x00);
  text(sale.branchName);
  cmd(0x1b, 0x61, 0x00);        // left
  ticketText(sale).split('\n').slice(3).forEach((l) => text(l));
  cmd(0x0a, 0x0a, 0x0a);
  cmd(0x1d, 0x56, 0x42, 0x00);  // cut

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
  if (!saved || !navigator.usb) return false;
  const devices = await navigator.usb.getDevices();
  const dev = devices.find((d) => d.vendorId === saved.vendorId && d.productId === saved.productId);
  if (!dev) return false;
  if (!dev.opened) await dev.open();
  if (dev.configuration === null) await dev.selectConfiguration(1);
  const iface = dev.configuration.interfaces.find((i) => i.alternate.interfaceClass === 7) || dev.configuration.interfaces[0];
  const ep = iface.alternate.endpoints.find((e) => e.direction === 'out');
  if (!ep) return false;
  try { await dev.claimInterface(iface.interfaceNumber); } catch { /* ya reclamada */ }
  await dev.transferOut(ep.endpointNumber, bytes);
  return true;
}

/* ---------- Bluetooth ---------- */
export async function connectBluetoothPrinter() {
  if (!('bluetooth' in navigator)) throw new Error('Este navegador no soporta Web Bluetooth');
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'],
  });
  localStorage.setItem(LS_BT, JSON.stringify({ id: device.id, name: device.name || 'Impresora BT' }));
  return device;
}

async function sendBluetooth(bytes) {
  const saved = JSON.parse(localStorage.getItem(LS_BT) || 'null');
  if (!saved || !navigator.bluetooth) return false;
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'],
  });
  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    for (const ch of chars) {
      if (ch.properties.write || ch.properties.writeWithoutResponse) {
        const CH = 200;
        for (let i = 0; i < bytes.length; i += CH) {
          await ch.writeValue(bytes.slice(i, i + CH));
        }
        await server.disconnect();
        return true;
      }
    }
  }
  await server.disconnect();
  return false;
}

/* ---------- Respaldo: diálogo del navegador ---------- */
function printViaBrowser(sale) {
  const text = ticketText(sale);
  const w = window.open('', '_blank', 'width=380,height=640');
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><title>Ticket ${esc(sale.code)}</title>
    <style>
      body{font-family:ui-monospace,Consolas,monospace;font-size:12px;white-space:pre;padding:12px}
      @media print{ @page{ margin:4mm } }
    </style></head><body>${esc(text)}
    <script>window.onload=()=>{setTimeout(()=>window.print(),150)}<\/script>
    </body></html>`);
  w.document.close();
  return true;
}

/* ---------- WiFi (TCP 9100 vía agente local) ---------- */
export function connectWifiPrinter(host, port = 9100) {
  localStorage.setItem(LS_WIFI, JSON.stringify({ host, port }));
}

async function sendWifi(bytes) {
  const saved = JSON.parse(localStorage.getItem(LS_WIFI) || 'null');
  if (!saved || !saved.host) return false;
  const r = await fetch('/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host: saved.host, port: saved.port || 9100, data: b64(bytes) }),
  });
  return r.ok;
}
function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

/* ---------- API principal ---------- */
export async function printTicket(sale) {
  const bytes = buildEscPos(sale);
  try { if (await sendWifi(bytes)) return { ok: true, message: 'Ticket enviado a la impresora WiFi' }; } catch (e) { console.warn('WiFi print', e); }
  try { if (await sendUsb(bytes)) return { ok: true, message: 'Ticket enviado a la impresora USB' }; } catch (e) { console.warn('USB print', e); }
  try { if (await sendBluetooth(bytes)) return { ok: true, message: 'Ticket enviado a la impresora Bluetooth' }; } catch (e) { console.warn('BT print', e); }
  if (printViaBrowser(sale)) return { ok: true, message: 'Abriendo diálogo de impresión…' };
  return { ok: false, message: 'No se pudo imprimir' };
}

export function printerStatus() {
  const usb = JSON.parse(localStorage.getItem(LS_USB) || 'null');
  const bt = JSON.parse(localStorage.getItem(LS_BT) || 'null');
  const wifi = JSON.parse(localStorage.getItem(LS_WIFI) || 'null');
  return {
    usb: usb ? 'Conectada' : 'Sin conectar',
    bt: bt ? (bt.name || 'Conectada') : 'Sin conectar',
    wifi: wifi ? (wifi.host + ':' + wifi.port) : 'Sin configurar',
  };
}
