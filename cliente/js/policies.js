// ═══════════════════════════════════════════════════════════
// policies.js — Modal de políticas de cancelación.
// Se muestra antes de cada solicitud (gating: hay que aceptar
// para continuar) y también disponible como consulta libre.
// ═══════════════════════════════════════════════════════════
import { getPoliticas } from './tarifas-cliente.js';

export function mostrarPoliticas({ soloLectura = false } = {}) {
  return new Promise((resolve) => {
    const politicas = getPoliticas();
    const overlay = document.createElement('div');
    overlay.className = 'pol-overlay';
    overlay.innerHTML = `
      <div class="pol-box">
        <div class="pol-titulo">📋 Política de cancelaciones</div>
        <div class="pol-lista">
          ${politicas.map((p, i) => `<div class="pol-item"><strong>${i + 1}.</strong> ${p}</div>`).join('')}
        </div>
        <button class="pol-btn">${soloLectura ? 'Cerrar' : 'Entiendo y acepto'}</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.pol-btn').onclick = () => {
      overlay.remove();
      resolve(true);
    };
  });
}
