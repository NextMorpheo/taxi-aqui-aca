// ═══════════════════════════════════════════════════════════
// toast.js — Notificación flotante breve.
// Vive aparte de ui.js para que cualquier módulo pueda mostrar
// un toast sin crear dependencias circulares.
// ═══════════════════════════════════════════════════════════
export function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('mostrar');
  setTimeout(() => t.classList.remove('mostrar'), 2000);
}
