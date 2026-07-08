// ═══════════════════════════════════════════════════════════
// live-tracking.js — Transmite tu ubicación en vivo a Firebase
// Realtime Database mientras estás laborando, para que la app
// de clientes muestre "tu taxi está a X km" con datos reales.
// Usa las APIs REST de Firebase directo con fetch(), sin SDK.
// ═══════════════════════════════════════════════════════════
import { estado } from './state.js';
import { getConfig } from './config.js';

let intervalo = null;
let idToken = null;
let idTokenExpira = 0; // timestamp (ms) en que caduca el idToken

// Inicia sesión anónima en Firebase Auth y devuelve un idToken vigente.
// Se reutiliza mientras no esté por caducar (los tokens duran 1 hora).
async function obtenerIdToken(apiKey) {
  if (idToken && Date.now() < idTokenExpira) return idToken;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInAnonymously?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error(`Auth anónima falló (${res.status})`);
  const data = await res.json();
  idToken = data.idToken;
  // Refrescamos 5 min antes de que caduque, por margen de seguridad.
  idTokenExpira = Date.now() + (parseInt(data.expiresIn, 10) - 300) * 1000;
  return idToken;
}

async function enviarUbicacion() {
  const cfg = getConfig();
  if (!cfg.firebaseApiKey || !cfg.firebaseDatabaseURL) return;

  try {
    const token = await obtenerIdToken(cfg.firebaseApiKey);
    await fetch(`${cfg.firebaseDatabaseURL}/chofer_ubicacion.json?auth=${token}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: estado.lat, lon: estado.lon,
        laborando: estado.laborando, actualizado_en: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.warn('[live-tracking] no se pudo enviar ubicación', e);
    idToken = null; // por si el error fue de auth, forzar reintento de login la próxima vez
  }
}

export function iniciarTransmisionUbicacion() {
  if (intervalo) return;
  enviarUbicacion();
  intervalo = setInterval(enviarUbicacion, 15000); // cada 15 segundos
}

export function detenerTransmisionUbicacion() {
  if (intervalo) { clearInterval(intervalo); intervalo = null; }
  enviarUbicacion(); // una última actualización marcando laborando:false
}
