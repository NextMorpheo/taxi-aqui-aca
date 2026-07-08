// ═══════════════════════════════════════════════════════════
// live-tracking-cliente.js — Lee la ubicación en vivo del chofer
// desde Supabase (API REST directa, sin librerías).
// ═══════════════════════════════════════════════════════════

// Se considera "en vivo" solo si se actualizó hace menos de 2 minutos
// (si no, el chofer no está transmitiendo — celular apagado, sin turno, etc.)
const MAX_ANTIGUEDAD_MS = 2 * 60 * 1000;

export async function obtenerUbicacionChoferEnVivo(tarifas) {
  if (!tarifas?.supabaseUrl || !tarifas?.supabaseAnonKey) return null;

  try {
    const res = await fetch(`${tarifas.supabaseUrl}/rest/v1/chofer_ubicacion?id=eq.1&select=lat,lon,laborando,actualizado_en`, {
      headers: {
        apikey: tarifas.supabaseAnonKey,
        Authorization: `Bearer ${tarifas.supabaseAnonKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const fila = data?.[0];
    if (!fila || !fila.laborando) return null;

    const antiguedad = Date.now() - new Date(fila.actualizado_en).getTime();
    if (antiguedad > MAX_ANTIGUEDAD_MS) return null;

    return { lat: fila.lat, lon: fila.lon };
  } catch (e) {
    return null; // sin internet, Supabase caído, etc. — se usa el respaldo (sitio base)
  }
}

export async function registrarViajeSolicitado(tarifas, { destino, precio, km, cliente }) {
  if (!tarifas?.supabaseUrl || !tarifas?.supabaseAnonKey) return;
  try {
    await fetch(`${tarifas.supabaseUrl}/rest/v1/viajes`, {
      method: 'POST',
      headers: {
        apikey: tarifas.supabaseAnonKey,
        Authorization: `Bearer ${tarifas.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destino, precio, km,
        cliente_lat: cliente?.lat, cliente_lon: cliente?.lon,
      }),
    });
  } catch (e) { /* no crítico si falla, el viaje ya se mandó por WhatsApp */ }
}
