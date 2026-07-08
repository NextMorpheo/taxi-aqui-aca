// ═══════════════════════════════════════════════════════════
// colectivo.js — Pasajeros a bordo y cobro rápido
// ═══════════════════════════════════════════════════════════
import { estado, guardarEstado } from './state.js';

function tono(freq, duracion) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracion);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duracion);
  } catch (e) { /* Web Audio no disponible: silencioso, no rompe la app */ }
}
function timbreSubir() { tono(880, 0.15); }
function timbreCobrar() { tono(880, 0.1); setTimeout(() => tono(880, 0.1), 150); }

export function actualizarBloqueosColectivo() {
  const btnSubir = document.getElementById('btn-subir');
  if (btnSubir) btnSubir.disabled = estado.pasajeros >= 5;
  document.querySelectorAll('#grid-cobro .btn-cobro').forEach(b => {
    b.disabled = estado.pasajeros === 0;
  });
}

export function pax(delta) {
  if (delta > 0 && estado.pasajeros >= 5) return;
  estado.pasajeros = Math.max(0, Math.min(5, estado.pasajeros + delta));
  if (delta > 0) timbreSubir();
  document.getElementById('disp-pax').textContent = `${estado.pasajeros} / 5`;
  actualizarBloqueosColectivo();
  guardarEstado();
}

export function cobrar(monto) {
  if (estado.pasajeros === 0) return;
  estado.ganancia += monto;
  estado.pasajeros--;
  timbreCobrar();
  document.getElementById('disp-pax').textContent = `${estado.pasajeros} / 5`;
  const hora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  estado.logColectivo.unshift({ hora, monto });
  actualizarBloqueosColectivo();
  actualizarLogColectivo();
  guardarEstado();
  // actualizarUI general la dispara quien importe este módulo desde main.js
  window.dispatchEvent(new CustomEvent('taxi:refrescar-ui'));
}

export function actualizarLogColectivo() {
  const log = estado.logColectivo;
  const total = log.reduce((s, i) => s + i.monto, 0);
  document.getElementById('disp-total-col').textContent = `Total: $${total}`;
  const cont = document.getElementById('log-colectivo');
  if (log.length === 0) {
    cont.innerHTML = '<div style="text-align:center;color:#64748b;font-size:12px;padding:20px;font-family:monospace">Sin registros aún</div>';
    return;
  }
  cont.innerHTML = log.map(i => `
    <div class="log-item"><span class="log-hora">⏱ ${i.hora}</span><span class="log-monto">+$${i.monto}</span></div>
  `).join('');
}
