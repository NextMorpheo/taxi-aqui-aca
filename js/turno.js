// ═══════════════════════════════════════════════════════════
// turno.js — Inicio/cierre de turno, pausa y cronómetro
// ═══════════════════════════════════════════════════════════
import { estado, guardarEstado, calcularUtilidadTurno } from './state.js';
import { getConfig } from './config.js';
import { actualizarUI, mostrarToast } from './ui.js';
import { modalConfirmar, modalAlerta } from './modal.js';
import { calcularSugerenciaAhorro, apartarMontoFondo } from './finanzas.js';
import { backupDiario } from './exportar.js';
import { iniciarTransmisionUbicacion, detenerTransmisionUbicacion } from './live-tracking.js';

let segundosCrono = 0;
let cronInterval = null;

export function iniciarCronometro() {
  segundosCrono = 0;
  cronInterval = setInterval(() => {
    segundosCrono++;
    const h = Math.floor(segundosCrono / 3600).toString().padStart(2, '0');
    const m = Math.floor((segundosCrono % 3600) / 60).toString().padStart(2, '0');
    const s = (segundosCrono % 60).toString().padStart(2, '0');
    document.getElementById('hud-crono').textContent = `${h}:${m}:${s}`;
  }, 1000);
}

export function detenerCronometro() {
  clearInterval(cronInterval); segundosCrono = 0;
  document.getElementById('hud-crono').textContent = '00:00:00';
}

export async function toggleTurno() {
  if (estado.laborando) {
    const confirmado = await modalConfirmar('¿Cerrar turno?\nSe guardará el resumen.');
    if (!confirmado) return;
    await cerrarTurno();
  } else {
    estado.laborando = true;
    estado.inicioTurno = new Date().toISOString();
    estado.odoTurno = 0; estado.ganancia = 0; estado.gastos = 0; estado.logColectivo = [];
    iniciarCronometro();
    iniciarTransmisionUbicacion();
  }
  actualizarUI(); guardarEstado();
}

export async function cerrarTurno() {
  const utilidad = calcularUtilidadTurno(getConfig().precioGasolina);

  await backupDiario();

  const sug = calcularSugerenciaAhorro(utilidad);
  if (sug.montoSugerido > 0) {
    const aceptar = await modalConfirmar(`Turno terminado.\nUtilidad: $${Math.round(utilidad)}\n\n${sug.mensaje}\n\n¿Apartar $${sug.montoSugerido}?`);
    if (aceptar) await apartarMontoFondo(sug.montoSugerido);
  } else {
    await modalAlerta(`Turno terminado.\nUtilidad: $${Math.round(utilidad)}`);
  }
  detenerCronometro();
  detenerTransmisionUbicacion();
  estado.laborando = false; estado.pausado = false;
}

export function togglePausa() {
  estado.pausado = !estado.pausado;
  actualizarUI(); guardarEstado();
}
