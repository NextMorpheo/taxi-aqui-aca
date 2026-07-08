// ═══════════════════════════════════════════════════════════
// ui.js — Navegación, toast, reloj y refresco general de pantalla
// ═══════════════════════════════════════════════════════════
import { estado, guardarEstado, calcularUtilidadTurno } from './state.js';
import { getConfig } from './config.js';
import { actualizarBloqueosColectivo } from './colectivo.js';
import { actualizarHistorialGastosUI, actualizarDashboard } from './finanzas.js';
import { mostrarAlertasPreventivas, actualizarHistorialMecanico, renderChecklistForm, actualizarHistorialChecklist } from './mecanico.js';
import { precargarFormularioCombustible, actualizarHistorialCombustible } from './combustible.js';
import { mostrarToast } from './toast.js';
export { mostrarToast };

export function irA(pantalla) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('p-' + pantalla).classList.add('activa');
  document.getElementById('tab-' + pantalla).classList.add('active');
  if (pantalla === 'finanzas') actualizarDashboard();
  if (pantalla === 'mant') {
    renderChecklistForm(); actualizarHistorialMecanico(); actualizarHistorialChecklist();
    precargarFormularioCombustible(); actualizarHistorialCombustible();
  }
}

export function toggleUtilidad() {
  estado.utilidadVisible = !estado.utilidadVisible;
  const el = document.getElementById('utilidad-toggle');
  const utilidad = calcularUtilidadTurno(getConfig().precioGasolina);
  if (estado.utilidadVisible) {
    el.textContent = `$${Math.round(utilidad)}`;
    el.classList.add('revelado');
  } else {
    el.textContent = '$';
    el.classList.remove('revelado');
  }
}

// ── Campos editables con candado (odómetro / gas) ──────────────
export function iniciarEdicionOdo() {
  document.getElementById('vista-odo').style.display = 'none';
  document.getElementById('edit-odo').style.display = 'block';
  document.getElementById('input-odo-edit').value = estado.odo.toFixed(1);
}
export function cancelarEdicionOdo() {
  document.getElementById('vista-odo').style.display = 'block';
  document.getElementById('edit-odo').style.display = 'none';
}
export function confirmarEdicionOdo() {
  const val = parseFloat(document.getElementById('input-odo-edit').value);
  if (!isNaN(val) && val >= 0) {
    estado.odo = val;
    guardarEstado();
    mostrarToast('✅ Odómetro actualizado manualmente');
  }
  cancelarEdicionOdo();
  actualizarUI();
}
export function iniciarEdicionGas() {
  document.getElementById('vista-gas').style.display = 'none';
  document.getElementById('edit-gas').style.display = 'block';
  document.getElementById('input-gas-edit').value = estado.gas.toFixed(1);
}
export function cancelarEdicionGas() {
  document.getElementById('vista-gas').style.display = 'block';
  document.getElementById('edit-gas').style.display = 'none';
}
export function confirmarEdicionGas() {
  const val = parseFloat(document.getElementById('input-gas-edit').value);
  if (!isNaN(val) && val >= 0 && val <= 50) {
    estado.gas = val;
    guardarEstado();
    mostrarToast('✅ Gasolina actualizada manualmente');
  }
  cancelarEdicionGas();
  actualizarUI();
}

export function actualizarReloj() {
  const ahora = new Date();
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  document.getElementById('header-fecha').textContent =
    `${dias[ahora.getDay()]}, ${ahora.getDate()} ${meses[ahora.getMonth()]} | ${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
}

// Refresco general: se llama tras casi cualquier cambio de estado.
export function actualizarUI() {
  const cfg = getConfig();

  document.getElementById('disp-odo').textContent = Math.round(estado.odo).toLocaleString();
  document.getElementById('disp-gas').textContent = estado.gas.toFixed(1) + ' L';
  const gasPct = Math.max(0, Math.min(100, (estado.gas / 50) * 100));
  const gasColor = gasPct > 40 ? '#22c55e' : gasPct > 20 ? '#f59e0b' : '#ef4444';
  document.getElementById('gas-barra').style.width = gasPct + '%';
  document.getElementById('gas-barra').style.background = gasColor;
  document.getElementById('alerta-gas').style.display = estado.gas < 8 ? 'block' : 'none';

  document.getElementById('hud-km').textContent = estado.odoTurno.toFixed(1);
  document.getElementById('hud-gas-uso').textContent = (estado.odoTurno / estado.rendimiento).toFixed(2) + 'L';

  document.getElementById('disp-km-turno').textContent = estado.odoTurno.toFixed(1) + ' km';
  document.getElementById('disp-rend').textContent = estado.rendimiento.toFixed(1);
  if (estado.utilidadVisible) { toggleUtilidad(); toggleUtilidad(); }

  const gastoGas = (estado.odoTurno / estado.rendimiento) * cfg.precioGasolina;
  document.getElementById('fin-ingresos').textContent = '$' + estado.ganancia;
  document.getElementById('fin-gas').textContent = '-$' + Math.round(gastoGas);
  document.getElementById('fin-mant').textContent = '-$' + estado.gastos;
  document.getElementById('fin-utilidad').textContent = '$' + Math.round(estado.ganancia - gastoGas - estado.gastos);

  const btn = document.getElementById('btn-maestro'), btnP = document.getElementById('btn-pausa');
  if (estado.laborando) {
    btn.textContent = '🛑 FINALIZAR LABORES'; btn.className = 'btn btn-rojo';
    btnP.style.display = 'block'; btnP.textContent = estado.pausado ? '▶️ REANUDAR GPS' : '⏸️ PAUSAR GPS (BAJADA)';
  } else {
    btn.textContent = '🚀 INICIAR LABORES'; btn.className = 'btn btn-verde'; btnP.style.display = 'none';
  }

  actualizarBloqueosColectivo();
  actualizarHistorialGastosUI();
  mostrarAlertasPreventivas();
}
