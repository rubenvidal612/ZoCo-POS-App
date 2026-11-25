// Valida el arnés: descarga un QR generado por servicio externo y lo decodifica con jsQR.
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

const texto = 'https://zoco-pos.vercel.app/orden?c=co-7782b4b1&f=LAV-0001&k=4821';
const url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=' + encodeURIComponent(texto);
const r = await fetch(url);
const buf = Buffer.from(await r.arrayBuffer());
const png = PNG.sync.read(buf);
const leido = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
console.log('externo decodificado:', leido ? JSON.stringify(leido.data) : 'NULL');
console.log('coincide:', leido && leido.data === texto);
