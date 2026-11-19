// Verifica que el S256 de ZoCo coincida con el vector RFC 7636
import crypto from 'node:crypto';

function b64url(bytes) {
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return Buffer.from(s, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const hash = crypto.createHash('sha256').update(verifier).digest();
const challenge = b64url(hash);
const expected = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

console.log('generado:', challenge);
console.log('esperado:', expected);
console.log('COINCIDE:', challenge === expected);
