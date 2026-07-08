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
    return null; 
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
  } catch (e) { 
 }
}
