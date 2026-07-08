// ═══════════════════════════════════════════════════════════
// gps-cliente.js — Ubicación del cliente y distancia real al destino
// ═══════════════════════════════════════════════════════════
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function obtenerUbicacionCliente() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Sin GPS en este dispositivo')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

export async function geocodificarDestino(destino) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destino + ', Acapulco, Guerrero')}&limit=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (data?.[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  return null;
}

export async function calcularKmReal(origen, destino) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origen.lon},${origen.lat};${destino.lon},${destino.lat}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    if (data.routes?.[0]) {
      return { km: data.routes[0].distance / 1000, minutos: Math.ceil(data.routes[0].duration / 60), real: true };
    }
  } catch (e) { /* sin internet: se usa la estimación de línea recta */ }
  const kmEstimado = haversine(origen.lat, origen.lon, destino.lat, destino.lon) * 1.35;
  return { km: kmEstimado, minutos: Math.ceil(kmEstimado * 3), real: false };
}
