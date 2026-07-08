// ═══════════════════════════════════════════════════════════
// main.js — Punto de entrada. Inicializa la app, conecta los
// módulos entre sí y expone las funciones que el HTML necesita
// vía onclick="" (para no reescribir 40+ atributos del markup
// en esta primera pasada de modularización).
// ═══════════════════════════════════════════════════════════
import { depurarSemanal } from './db.js';
import { cargarConfig } from './config.js';
import { estado, cargarEstado } from './state.js';
import * as ui from './ui.js';
import * as gps from './gps.js';
import * as turno from './turno.js';
import * as colectivo from './colectivo.js';
import * as cotizador from './cotizador.js';
import * as mecanico from './mecanico.js';
import * as combustible from './combustible.js';
import * as finanzas from './finanzas.js';
import * as exportar from './exportar.js';
import * as ajustes from './ajustes.js';
import { iniciarTransmisionUbicacion } from './live-tracking.js';

// ── Exponer al scope global para los onclick="" del HTML ──────
Object.assign(window, {
  irA: ui.irA,
  toggleUtilidad: ui.toggleUtilidad,
  iniciarEdicionOdo: ui.iniciarEdicionOdo,
  confirmarEdicionOdo: ui.confirmarEdicionOdo,
  cancelarEdicionOdo: ui.cancelarEdicionOdo,
  iniciarEdicionGas: ui.iniciarEdicionGas,
  confirmarEdicionGas: ui.confirmarEdicionGas,
  cancelarEdicionGas: ui.cancelarEdicionGas,

  toggleTurno: turno.toggleTurno,
  togglePausa: turno.togglePausa,

  pax: colectivo.pax,
  cobrar: colectivo.cobrar,

  setDest: cotizador.setDest,
  calcularTarifa: cotizador.calcularTarifa,
  recalcularConKmReal: cotizador.recalcularConKmReal,
  revelarPrecio: cotizador.revelarPrecio,
  confirmarServicio: cotizador.confirmarServicio,
  abrirGoogleMaps: cotizador.abrirGoogleMaps,
  registrarUbicacionActual: cotizador.registrarUbicacionActual,

  mostrarDiagnostico: mecanico.mostrarDiagnostico,
  guardarServicioMecanico: mecanico.guardarServicioMecanico,
  guardarChecklist: mecanico.guardarChecklist,
  editarChecklist: mecanico.editarChecklist,
  cancelarEdicionChecklist: mecanico.cancelarEdicionChecklist,
  borrarChecklist: mecanico.borrarChecklist,

  guardarCarga: combustible.guardarCarga,
  editarCarga: combustible.editarCarga,
  cancelarEdicionCombustible: combustible.cancelarEdicionCombustible,
  borrarCarga: combustible.borrarCarga,

  registrarGasto: finanzas.registrarGasto,
  buscarPorRango: finanzas.buscarPorRango,
  apartarAhorro: finanzas.apartarAhorro,

  exportarCSV: exportar.exportarCSV,
  exportarPDF: exportar.exportarPDF,
  compartirBitacora: exportar.compartirBitacora,

  guardarAjustesGenerales: ajustes.guardarAjustesGenerales,
  agregarTarifaDestino: ajustes.agregarTarifaDestino,
  restaurarAjustes: ajustes.restaurarAjustes,
  usarUbicacionComoSitioBase: ajustes.usarUbicacionComoSitioBase,
  sincronizarTarifasClientes: ajustes.sincronizarTarifasClientes,
});

// Cualquier módulo puede pedir un refresco general de UI sin
// tener que importar ui.js directamente (evita ciclos de import).
window.addEventListener('taxi:refrescar-ui', () => ui.actualizarUI());

// Navegación: si entran a Ajustes, pintar los valores actuales
const irAOriginal = ui.irA;
window.irA = function (pantalla) {
  irAOriginal(pantalla);
  if (pantalla === 'ajustes') ajustes.pintarAjustes();
};

// ═══════════════════════════════════════════════
// INICIO DE LA APP
// ═══════════════════════════════════════════════
(async function iniciar() {
  await cargarConfig();
  await cargarEstado();
  ui.actualizarUI();
  ui.actualizarReloj();
  setInterval(ui.actualizarReloj, 30000);
  gps.iniciarGPS();
  await depurarSemanal();
  setInterval(depurarSemanal, 60 * 60 * 1000);
  if (estado.laborando) { turno.iniciarCronometro(); iniciarTransmisionUbicacion(); }
})();

// ═══════════════════════════════════════════════
// PWA — Service Worker + prompt de instalación
// ═══════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => console.log('[PWA] Service Worker registrado:', reg.scope))
      .catch(err => console.warn('[PWA] Error SW:', err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => ui.mostrarToast('📲 Menú del navegador → "Instalar app"'), 2000);
});
