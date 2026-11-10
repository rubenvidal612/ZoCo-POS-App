// Huella / Face ID con WebAuthn (solo este dispositivo)
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = t + '='.repeat((4 - (t.length % 4)) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
};

export function biometricSupported() {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

export async function enrollBiometric(user) {
  if (!biometricSupported()) throw new Error('Este dispositivo no soporta huella');
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'ZoCo POS', id: location.hostname },
      user: {
        id: new TextEncoder().encode(user.id),
        name: user.email || user.id,
        displayName: user.name || user.id,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
      attestation: 'none',
    },
  });
  return {
    id: b64(cred.rawId),
    created: new Date().toISOString(),
    device: navigator.platform || 'dispositivo',
  };
}

export async function verifyBiometric(user) {
  if (!user?.webauthn?.id) throw new Error('Este empleado no tiene huella registrada');
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const res = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: unb64(user.webauthn.id), type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  return !!res;
}
