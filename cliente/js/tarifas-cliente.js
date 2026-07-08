import { haversine } from './gps-cliente.js';

let tarifas = null;

export async function cargarTarifasPublicas() {
  try {
    const res = await fetch('../tarifas.json');
    tarifas = await res.json();
  } catch (e) {
    
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
