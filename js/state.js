// ═══════════════════════════════════════════════════════════
// state.js — Estado global de la app + persistencia
// ═══════════════════════════════════════════════════════════
import { idbGet, idbSet } from './db.js';

export const estado = {
  odo: 519134.0, gas: 29.0, rendimiento: 11.0,
  laborando: false, pausado: false, odoTurno: 0.0,
  pasajeros: 0, ganancia: 0, gastos: 0,
  lat: 16.7900, lon: -99.8250, lluvia: false,
  historialGastos: [], logColectivo: [],
  inicioTurno: null, utilidadVisible: false,
  ultimoServicioPorItem: {}
};

export async function cargarEstado() {
  try {
    const saved = await idbGet('estado', 'principal');
    if (saved) Object.assign(estado, saved);
  } catch (e) { console.warn('[state] no se pudo cargar estado guardado', e); }
}

export async function guardarEstado() {
  try { await idbSet('estado', 'principal', estado); } catch (e) { console.warn('[state] no se pudo guardar', e); }
}

// Utilidad neta del turno actual, usando SIEMPRE el mismo precio de
// gasolina (viene de config.js). Antes había 3 valores distintos
// hardcodeados ($27.87 / $28.20) en distintas funciones — ya no.
export function calcularUtilidadTurno(precioGasolina) {
  const gastoGas = (estado.odoTurno / estado.rendimiento) * precioGasolina;
  return estado.ganancia - gastoGas - estado.gastos;
}
