// ═══════════════════════════════════════════════════════════
// gps.js — Geolocalización y utilidades de distancia
// ═══════════════════════════════════════════════════════════
import { estado, guardarEstado } from './state.js';
import { actualizarUI } from './ui.js';

let posAnterior = null;

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function iniciarGPS() {
  if (!navigator.geolocation) {
    const txt = document.getElementById('gps-status-text');
    if (txt) txt.textContent = 'Sin GPS';
    return;
  }
  navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude, speed } = pos.coords;
    const kmh = speed ? Math.round(speed * 3.6) : 0;
    document.getElementById('hud-vel').textContent = `${kmh} km/h`;

    if (estado.laborando && !estado.pausado && posAnterior) {
      const dist = haversine(posAnterior.lat, posAnterior.lon, latitude, longitude);
      // Umbral de 8m para filtrar el ruido/jitter típico del GPS en reposo.
      if (dist > 0.003) {
        estado.odo += dist;
        estado.odoTurno += dist;
        estado.gas = Math.max(0, estado.gas - dist / estado.rendimiento);
        actualizarUI();
        guardarEstado();
      }
    }
    estado.lat = latitude; estado.lon = longitude;
    posAnterior = { lat: latitude, lon: longitude };

    const miPos = document.getElementById('mi-posicion');
    if (miPos) miPos.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    document.getElementById('gps-status-text').textContent = 'GPS ✓';
  }, () => {
    document.getElementById('gps-status-text').textContent = 'Sin GPS';
  }, { enableHighAccuracy: true, maximumAge: 2000 });
}
