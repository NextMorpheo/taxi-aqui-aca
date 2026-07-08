// ═══════════════════════════════════════════════════════════
// tarifas-cliente.js — Cálculo del precio que ve el cliente.
//
// Fórmula:
//   1) tarifa "normal" — igual que cotizador.js en la app del chofer:
//      banderazo según hora + (km ida × 2, por el viaje de vuelta vacío)
//      × costo por km, con recargo de fin de semana, y el MAYOR contra
//      la tarifa fija de la tabla si el destino está en ella.
//      (NO se usa la tarifa "especial"/premium — esa es solo para uso
//      interno del chofer, aquí se busca atraer clientes, no maximizar.)
//   2) + cargo por ir a recogerlo: mínimo $30 (cubre los primeros 5 km
//      desde el sitio/base del chofer hasta donde está el cliente), y
//      +$5 extra por cada km adicional si está más lejos.
//   3) redondeado hacia arriba al siguiente múltiplo de $10
//
// Nota: el recargo por lluvia de la app principal NO se replica aquí
// porque depende de que el chofer lo marque manualmente en su celular
// y no hay forma de sincronizar eso sin un servidor. Si llueve, el
// chofer puede ajustar el monto directo con el cliente al llegar —
// el precio que se muestra siempre es de referencia y negociable.
// ═══════════════════════════════════════════════════════════
import { haversine } from './gps-cliente.js';

let tarifas = null;

export async function cargarTarifasPublicas() {
  try {
    const res = await fetch('../tarifas.json');
    tarifas = await res.json();
  } catch (e) {
    // Respaldo si no hay conexión al archivo (debería estar cacheado por el SW)
    tarifas = {
      banderazoDiurno: 100, banderazoVespertino: 125, banderazoNocturno: 150,
      costoPorKm: 3, recargoFinDeSemana: 0.15,
      cargoMinimoRecogida: 30, kmBaseMinimoRecogida: 5, costoPorKmExtraRecogida: 5,
      sitioBaseLat: 16.8534, sitioBaseLon: -99.8237,
      tablaTarifas: {}, telefonoWhatsApp: ''
    };
  }
  return tarifas;
}

export function getTarifasPublicas() {
  return tarifas;
}

export function getPoliticas() {
  return tarifas?.politicasCancelacion || [];
}

function normalizar(str) {
  return str.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function buscarEnTabla(destino) {
  const key = normalizar(destino);
  if (tarifas.tablaTarifas[key]) return tarifas.tablaTarifas[key];
  for (const [k, v] of Object.entries(tarifas.tablaTarifas)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return 0;
}

function calcularCargoRecogida(ubicacionCliente, ubicacionChoferEnVivo) {
  const { cargoMinimoRecogida, kmBaseMinimoRecogida, costoPorKmExtraRecogida, sitioBaseLat, sitioBaseLon } = tarifas;
  const origen = ubicacionChoferEnVivo || { lat: sitioBaseLat, lon: sitioBaseLon };
  if (!ubicacionCliente || origen.lat == null || origen.lon == null) return cargoMinimoRecogida || 0;

  const kmDesdeOrigen = haversine(origen.lat, origen.lon, ubicacionCliente.lat, ubicacionCliente.lon);
  if (kmDesdeOrigen <= kmBaseMinimoRecogida) return cargoMinimoRecogida;
  return cargoMinimoRecogida + (kmDesdeOrigen - kmBaseMinimoRecogida) * costoPorKmExtraRecogida;
}

export function calcularPrecioCliente(destino, kmIda, ubicacionCliente, ubicacionChoferEnVivo) {
  const { banderazoDiurno, banderazoVespertino, banderazoNocturno, costoPorKm, recargoFinDeSemana } = tarifas;

  const hora = new Date().getHours();
  let banderazo = banderazoDiurno;
  if (hora >= 20 && hora < 22) banderazo = banderazoVespertino;
  else if (hora >= 22 || hora < 5) banderazo = banderazoNocturno;

  const kmTotales = kmIda * 2; // ida y vuelta, igual que la app principal
  const costoKm = kmTotales * costoPorKm;
  let subtotal = banderazo + costoKm;

  const dia = new Date().getDay();
  if (dia === 0 || dia === 6) subtotal *= (1 + recargoFinDeSemana);

  const precioDestino = buscarEnTabla(destino);
  const precioBase = Math.max(subtotal, precioDestino);
  const cargoRecogida = calcularCargoRecogida(ubicacionCliente, ubicacionChoferEnVivo);
  const precioConRecogida = precioBase + cargoRecogida;

  return {
    precio: Math.ceil(precioConRecogida / 10) * 10,
    precioDistancia: Math.round(subtotal),
    precioDestino,
    cargoRecogida: Math.round(cargoRecogida),
    usandoUbicacionEnVivo: !!ubicacionChoferEnVivo,
    usandoTarifaFija: precioDestino >= subtotal && precioDestino > 0
  };
}
