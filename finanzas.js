// ═══════════════════════════════════════════════════════════
// finanzas.js — Gastos, fondo de cambio de unidad y dashboard
// ═══════════════════════════════════════════════════════════
import { idbGet, idbSet, idbGetAll } from './db.js';
import { estado, guardarEstado } from './state.js';
import { getConfig } from './config.js';
import { mostrarToast } from './toast.js';
import { modalPromptNumero, modalAlerta } from './modal.js';
import { obtenerAlertasPreventivas } from './mecanico.js';

export async function registrarGasto(tipo) {
  const monto = await modalPromptNumero(`Monto de ${tipo}:`, 0);
  if (monto === null || isNaN(monto) || monto <= 0) return;
  estado.gastos += monto;
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  estado.historialGastos.unshift({ hora, tipo, monto });
  guardarEstado();
  mostrarToast(`✅ Gasto $${monto} registrado`);
  window.dispatchEvent(new CustomEvent('taxi:refrescar-ui'));
}

export function actualizarHistorialGastosUI() {
  const cont = document.getElementById('historial-gastos');
  if (!cont) return;
  if (!estado.historialGastos.length) {
    cont.innerHTML = '<div style="font-size:12px;color:#64748b;font-family:monospace;padding:11px 0;text-align:center">Sin gastos</div>';
    return;
  }
  cont.innerHTML = estado.historialGastos.slice(0, 10).map(g => `
    <div class="fin-row" style="font-size:13px;font-family:monospace">
      <span style="color:#94a3b8">${g.hora} — ${g.tipo}</span>
      <span style="color:#ff6b6b;font-weight:900">-$${g.monto}</span>
    </div>`).join('');
}

export async function actualizarDashboard() {
  document.getElementById('dash-ingresos').textContent = `$${estado.ganancia}`;
  document.getElementById('dash-gastos').textContent = `$${estado.gastos}`;
  const { urgente } = obtenerAlertasPreventivas(estado.odo);
  document.getElementById('dash-mantto').textContent = urgente.length > 0 ? urgente[0].comp : 'Al día';
  await actualizarFondo();
}

export async function buscarPorRango() {
  const desde = document.getElementById('busqueda-desde').value;
  const hasta = document.getElementById('busqueda-hasta').value;
  if (!desde || !hasta) { await modalAlerta('Selecciona ambas fechas.'); return; }
  const registros = await idbGetAll('ia_mantenimiento');
  const filtrados = registros.filter(r => {
    const f = new Date(r.timestamp).toISOString().split('T')[0];
    return f >= desde && f <= hasta;
  });
  await modalAlerta(`${filtrados.length} registros mecánicos entre ${desde} y ${hasta}.\nTotal gastado: $${filtrados.reduce((s, r) => s + (r.costo || 0), 0)}`);
}

// ── Fondo de cambio de unidad ────────────────────────────────
export function calcularSugerenciaAhorro(utilidad) {
  if (utilidad < 200) return { montoSugerido: 0, mensaje: 'Turno ajustado. El fondo espera.' };
  let pct = utilidad > 1200 ? 0.12 : utilidad > 800 ? 0.10 : 0.07;
  const monto = Math.ceil((utilidad * pct) / 10) * 10;
  return { montoSugerido: monto, mensaje: `IA sugiere apartar $${monto} (${Math.round(pct * 100)}%).` };
}

export async function apartarMontoFondo(monto) {
  const meta = getConfig().metaFondo;
  let bd = await idbGet('ia_admin', 'fondo') || { fondo: 0, meta, registros: [] };
  bd.fondo += monto;
  bd.meta = meta; // por si el usuario cambió la meta en Ajustes
  bd.registros.unshift({ fecha: new Date().toLocaleDateString('es-MX'), monto });
  await idbSet('ia_admin', 'fondo', bd);
  await actualizarFondo();
}

export async function apartarAhorro() {
  const utilidad = estado.ganancia - (estado.odoTurno / estado.rendimiento) * getConfig().precioGasolina - estado.gastos;
  const sug = calcularSugerenciaAhorro(utilidad);
  const monto = await modalPromptNumero(`${sug.mensaje}\n\n¿Cuánto apartar?`, sug.montoSugerido);
  if (monto !== null && !isNaN(monto) && monto > 0) {
    await apartarMontoFondo(monto);
    mostrarToast(`✅ $${monto} al fondo`);
  }
}

export async function actualizarFondo() {
  const meta = getConfig().metaFondo;
  const bd = await idbGet('ia_admin', 'fondo') || { fondo: 0, meta, registros: [] };
  const pct = Math.min(100, Math.round((bd.fondo / meta) * 100));
  document.getElementById('fin-fondo').textContent = `$${bd.fondo.toLocaleString()}`;
  document.getElementById('fin-meta').textContent = `de $${meta.toLocaleString()}`;
  document.getElementById('fin-fondo-barra').style.width = pct + '%';
  document.getElementById('dash-fondo').textContent = `$${bd.fondo.toLocaleString()}`;

  if (bd.registros.length >= 3) {
    const promedio = bd.fondo / bd.registros.length;
    const restante = meta - bd.fondo;
    const turnosRest = promedio > 0 ? Math.ceil(restante / promedio) : 0;
    document.getElementById('fin-proyeccion').textContent = bd.fondo >= meta
      ? '🎉 ¡META ALCANZADA!' : turnosRest > 0 ? `~${turnosRest} turnos más` : 'Calculando...';
  }
}
