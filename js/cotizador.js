// ═══════════════════════════════════════════════════════════
// cotizador.js — Cálculo de tarifas (GPS real + tabla ACATAXI)
// ═══════════════════════════════════════════════════════════
import { idbSet, idbGetAll } from './db.js';
import { estado, guardarEstado } from './state.js';
import { getConfig } from './config.js';
import { mostrarToast } from './toast.js';
import { modalAlerta } from './modal.js';
import { haversine } from './gps.js';
import { irA } from './ui.js';
import { backupDiario } from './exportar.js';

let coordDestino = null;
let preciosCalculados = { minimo: 0, normal: 0, especial: 0 };
let kmIdaActual = 0;

function normalizar(str) {
  return str.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function buscarEnTabla(destino) {
  const tabla = getConfig().tablaTarifas;
  const key = normalizar(destino);
  if (tabla[key]) return tabla[key];
  for (const [k, v] of Object.entries(tabla)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return 0;
}

export async function buscarEnRutasPropias(destino) {
  const rutas = await idbGetAll('rutas');
  const q = normalizar(destino).toLowerCase();
  return rutas.find(r => {
    const n = normalizar(r.nombre).toLowerCase();
    return n.includes(q) || q.includes(n);
  });
}

export function setDest(nombre) {
  document.getElementById('input-dest').value = nombre;
  calcularTarifa();
}

export async function registrarUbicacionActual() {
  const { modalPrompt } = await import('./modal.js');
  const nombre = await modalPrompt('Nombre de esta ubicación (colonia, hotel, condominio...):');
  if (!nombre || !nombre.trim()) return;

  const ruta = {
    id: `ruta_${Date.now()}`,
    nombre: nombre.trim(),
    lat: estado.lat,
    lng: estado.lon,
    fecha: new Date().toISOString()
  };

  await idbSet('rutas', ruta.id, ruta);
  mostrarToast(`📌 "${nombre}" guardada en rutas`);
  await backupDiario();
}

export async function exportarRutasJSON() {
  const rutas = await idbGetAll('rutas');
  const blob = new Blob([JSON.stringify(rutas, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rutas.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function calcularTarifa() {
  const dest = document.getElementById('input-dest').value.trim();
  if (!dest) { await modalAlerta('Escribe un destino primero.'); return; }

  document.getElementById('resultado-ia').style.display = 'none';
  document.getElementById('ia-loading').style.display = 'block';
  document.getElementById('ia-loading-msg').textContent = '📡 Buscando coordenadas...';

  let destLat = 16.8532, destLng = -99.8237;

  const rutaPropia = await buscarEnRutasPropias(dest);
  if (rutaPropia) {
    destLat = rutaPropia.lat; destLng = rutaPropia.lng;
    document.getElementById('ia-loading-msg').textContent = '✅ Ubicación de tu historial propio';
  } else {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dest + ', Acapulco, Guerrero')}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.[0]) { destLat = parseFloat(data[0].lat); destLng = parseFloat(data[0].lon); }
    } catch (e) { /* sin internet o Nominatim caído: se usa el punto por defecto */ }
  }

  coordDestino = { lat: destLat, lng: destLng };

  document.getElementById('ia-loading-msg').textContent = '🛰️ Calculando ruta real...';
  let kmIda = 0, usandoOSRM = false, durMin = 0;
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${estado.lon},${estado.lat};${destLng},${destLat}?overview=false`;
    const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    if (data.routes?.[0]) {
      kmIda = data.routes[0].distance / 1000;
      durMin = Math.ceil(data.routes[0].duration / 60);
      usandoOSRM = true;
    }
  } catch (e) {
    kmIda = haversine(estado.lat, estado.lon, destLat, destLng) * 1.35;
    durMin = Math.ceil(kmIda * 3);
  }

  kmIdaActual = kmIda;
  generarPrecios(dest, kmIda, usandoOSRM, durMin);
}

export function generarPrecios(dest, kmIda, usandoOSRM, durMin) {
  const cfg = getConfig();
  const hora = new Date().getHours();
  let banderazo = cfg.banderazoDiurno, horLabel = 'Diurno';
  if (hora >= 20 && hora < 22) { banderazo = cfg.banderazoVespertino; horLabel = 'Vespertino'; }
  else if (hora >= 22 || hora < 5) { banderazo = cfg.banderazoNocturno; horLabel = 'Nocturno'; }

  const kmTotales = kmIda * 2;
  const costoKm = kmTotales * cfg.costoPorKm;
  let subtotal = banderazo + costoKm;

  const desglose = [
    `Banderazo ${horLabel}: $${banderazo}`,
    `${usandoOSRM ? '✅ OSRM Real' : '⚠️ Estimado'}: ${kmIda.toFixed(1)}km × 2 = ${kmTotales.toFixed(1)}km × $${cfg.costoPorKm} = $${costoKm.toFixed(0)}`,
    `Duración estimada: ${durMin} min`,
  ];

  if (estado.lluvia) { subtotal *= (1 + cfg.recargoLluvia); desglose.push(`Lluvia (+${Math.round(cfg.recargoLluvia * 100)}%)`); }
  const dia = new Date().getDay();
  if (dia === 0 || dia === 6) { subtotal *= (1 + cfg.recargoFinDeSemana); desglose.push(`Fin de semana (+${Math.round(cfg.recargoFinDeSemana * 100)}%)`); }

  const tarifaTabla = buscarEnTabla(dest);
  let precioNormal = Math.max(subtotal, tarifaTabla);
  if (tarifaTabla > 0) {
    desglose.push(tarifaTabla >= subtotal
      ? `Tabla ACATAXI: $${tarifaTabla}` : `GPS: $${subtotal.toFixed(0)}`);
  }

  const gasReal = (kmTotales / estado.rendimiento) * cfg.precioGasolina;
  const mantEst = precioNormal * 0.10;
  const gananciaMin = hora >= 22 || hora < 5 ? 70 : hora >= 20 ? 55 : 40;

  preciosCalculados.minimo = Math.ceil(Math.max(gasReal + mantEst + gananciaMin, precioNormal * 0.7) / 10) * 10;
  preciosCalculados.normal = Math.ceil(precioNormal / 10) * 10;
  preciosCalculados.especial = Math.ceil((precioNormal + 75) / 10) * 10;

  document.getElementById('ia-desglose').innerHTML = desglose.map(m => `• ${m}`).join('<br>') +
    `<br>• Gas real: $${gasReal.toFixed(0)} | Mant: $${mantEst.toFixed(0)}`;
  document.getElementById('ia-status-msg').textContent = `✅ ${usandoOSRM ? 'Km real OSRM' : 'Estimado'}: ${kmIda.toFixed(1)} km`;

  document.getElementById('eta-mi-posicion').textContent = `${estado.lat.toFixed(5)}, ${estado.lon.toFixed(5)}`;
  document.getElementById('eta-tiempo').textContent = `${durMin} min`;

  ['minimo', 'normal', 'especial'].forEach(t => {
    document.getElementById(`val-${t}-oculto`).textContent = '$';
    document.getElementById(`val-${t}-oculto`).classList.remove('revelado');
  });

  document.getElementById('input-monto-real').value = preciosCalculados.normal;
  document.getElementById('input-km-real').value = '';

  document.getElementById('ia-loading').style.display = 'none';
  document.getElementById('resultado-ia').style.display = 'block';
}

export function recalcularConKmReal() {
  const kmReal = parseFloat(document.getElementById('input-km-real').value);
  if (isNaN(kmReal) || kmReal <= 0) { modalAlerta('Ingresa un km válido.'); return; }
  const dest = document.getElementById('input-dest').value;
  kmIdaActual = kmReal;
  generarPrecios(dest, kmReal, true, Math.ceil(kmReal * 3));
  mostrarToast('↻ Recalculado con km real');
}

export function revelarPrecio(tipo) {
  const el = document.getElementById(`val-${tipo}-oculto`);
  if (el.classList.contains('revelado')) {
    el.textContent = '$'; el.classList.remove('revelado');
  } else {
    el.textContent = `$${preciosCalculados[tipo]}`; el.classList.add('revelado');
  }
}

async function registrarResultadoTarifa(destino, km, min, norm, esp, cobrado) {
  const key = destino.toUpperCase().trim();
  const { idbGet } = await import('./db.js');
  let reg = await idbGet('ia_tarifas', key) || { veces: 0, cobrados: [] };
  reg.veces++;
  reg.cobrados.push(cobrado);
  reg.promedio = Math.round(reg.cobrados.reduce((s, v) => s + v, 0) / reg.cobrados.length);
  await idbSet('ia_tarifas', key, reg);
}

export async function confirmarServicio() {
  const monto = parseFloat(document.getElementById('input-monto-real').value);
  if (isNaN(monto) || monto <= 0) { await modalAlerta('Ingresa el monto real cobrado.'); return; }

  estado.ganancia += monto;
  await registrarResultadoTarifa(
    document.getElementById('input-dest').value,
    kmIdaActual * 2, preciosCalculados.minimo, preciosCalculados.normal,
    preciosCalculados.especial, monto
  );
  mostrarToast(`✅ +$${monto} registrado`);
  document.getElementById('resultado-ia').style.display = 'none';
  document.getElementById('input-dest').value = '';
  guardarEstado();
  window.dispatchEvent(new CustomEvent('taxi:refrescar-ui'));
  irA('inicio');
}

export function abrirGoogleMaps() {
  if (!coordDestino) return;
  window.open(`https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${coordDestino.lat},${coordDestino.lng}`, '_blank');
}
