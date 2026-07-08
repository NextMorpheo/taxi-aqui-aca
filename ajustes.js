// ═══════════════════════════════════════════════════════════
// ajustes.js — Pantalla de configuración editable.
// Aquí el chofer ajusta precio de gasolina, meta de fondo,
// tarifas base y la tabla de destinos frecuentes — sin tocar
// código nunca más.
// ═══════════════════════════════════════════════════════════
import { getConfig, guardarConfig, actualizarTarifaDestino, restaurarConfigDefault } from './config.js';
import { estado, guardarEstado } from './state.js';
import { mostrarToast } from './toast.js';
import { modalConfirmar, modalPrompt, modalPromptNumero } from './modal.js';
import { sincronizarTarifasClientes } from './sync-tarifas.js';

export { sincronizarTarifasClientes };

export function pintarAjustes() {
  const cfg = getConfig();
  document.getElementById('aj-precio-gas').value = cfg.precioGasolina;
  document.getElementById('aj-rendimiento').value = estado.rendimiento;
  document.getElementById('aj-capacidad-tanque').value = cfg.capacidadTanque;
  document.getElementById('aj-meta-fondo').value = cfg.metaFondo;
  document.getElementById('aj-banderazo-diurno').value = cfg.banderazoDiurno;
  document.getElementById('aj-banderazo-vespertino').value = cfg.banderazoVespertino;
  document.getElementById('aj-banderazo-nocturno').value = cfg.banderazoNocturno;
  document.getElementById('aj-costo-km').value = cfg.costoPorKm;
  document.getElementById('aj-cargo-min-recogida').value = cfg.cargoMinimoRecogida;
  document.getElementById('aj-km-base-recogida').value = cfg.kmBaseMinimoRecogida;
  document.getElementById('aj-costo-km-extra-recogida').value = cfg.costoPorKmExtraRecogida;
  document.getElementById('aj-sitio-lat').value = cfg.sitioBaseLat;
  document.getElementById('aj-sitio-lon').value = cfg.sitioBaseLon;
  document.getElementById('aj-firebase-apikey').value = cfg.firebaseApiKey || '';
  document.getElementById('aj-firebase-dburl').value = cfg.firebaseDatabaseURL || '';
  document.getElementById('aj-whatsapp').value = cfg.telefonoWhatsApp || '';
  document.getElementById('aj-politicas').value = (cfg.politicasCancelacion || []).join('\n');
  document.getElementById('aj-github-owner').value = cfg.githubOwner || '';
  document.getElementById('aj-github-repo').value = cfg.githubRepo || '';
  document.getElementById('aj-github-token').value = cfg.githubToken || '';
  pintarTablaTarifas();
}

export async function guardarAjustesGenerales() {
  const nuevoRendimiento = parseFloat(document.getElementById('aj-rendimiento').value);
  if (!isNaN(nuevoRendimiento) && nuevoRendimiento > 0) {
    estado.rendimiento = nuevoRendimiento;
    await guardarEstado();
  }

  await guardarConfig({
    precioGasolina: parseFloat(document.getElementById('aj-precio-gas').value) || getConfig().precioGasolina,
    capacidadTanque: parseFloat(document.getElementById('aj-capacidad-tanque').value) || getConfig().capacidadTanque,
    metaFondo: parseFloat(document.getElementById('aj-meta-fondo').value) || getConfig().metaFondo,
    banderazoDiurno: parseFloat(document.getElementById('aj-banderazo-diurno').value) || getConfig().banderazoDiurno,
    banderazoVespertino: parseFloat(document.getElementById('aj-banderazo-vespertino').value) || getConfig().banderazoVespertino,
    banderazoNocturno: parseFloat(document.getElementById('aj-banderazo-nocturno').value) || getConfig().banderazoNocturno,
    costoPorKm: parseFloat(document.getElementById('aj-costo-km').value) || getConfig().costoPorKm,
    cargoMinimoRecogida: parseFloat(document.getElementById('aj-cargo-min-recogida').value) ?? getConfig().cargoMinimoRecogida,
    kmBaseMinimoRecogida: parseFloat(document.getElementById('aj-km-base-recogida').value) || getConfig().kmBaseMinimoRecogida,
    costoPorKmExtraRecogida: parseFloat(document.getElementById('aj-costo-km-extra-recogida').value) ?? getConfig().costoPorKmExtraRecogida,
    sitioBaseLat: parseFloat(document.getElementById('aj-sitio-lat').value) || getConfig().sitioBaseLat,
    sitioBaseLon: parseFloat(document.getElementById('aj-sitio-lon').value) || getConfig().sitioBaseLon,
    firebaseApiKey: document.getElementById('aj-firebase-apikey').value.trim(),
    firebaseDatabaseURL: document.getElementById('aj-firebase-dburl').value.trim().replace(/\/$/, ''),
    telefonoWhatsApp: document.getElementById('aj-whatsapp').value.trim() || getConfig().telefonoWhatsApp,
    politicasCancelacion: document.getElementById('aj-politicas').value.split('\n').map(l => l.trim()).filter(Boolean),
    githubOwner: document.getElementById('aj-github-owner').value.trim(),
    githubRepo: document.getElementById('aj-github-repo').value.trim() || getConfig().githubRepo,
    githubToken: document.getElementById('aj-github-token').value.trim(),
  });

  mostrarToast('✅ Ajustes guardados');
  window.dispatchEvent(new CustomEvent('taxi:refrescar-ui'));
}

export async function usarUbicacionComoSitioBase() {
  document.getElementById('aj-sitio-lat').value = estado.lat.toFixed(5);
  document.getElementById('aj-sitio-lon').value = estado.lon.toFixed(5);
  mostrarToast('📍 Usando tu ubicación actual como sitio base — no olvides GUARDAR AJUSTES');
}

function pintarTablaTarifas() {
  const cfg = getConfig();
  const cont = document.getElementById('aj-lista-tarifas');
  const entradas = Object.entries(cfg.tablaTarifas).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entradas.length) {
    cont.innerHTML = '<div style="font-size:12px;color:#64748b;text-align:center;padding:10px 0">Sin destinos guardados</div>';
    return;
  }
  cont.innerHTML = entradas.map(([nombre, monto]) => `
    <div class="tarifa-row">
      <span>${nombre}</span>
      <span style="display:flex;align-items:center;gap:10px">
        <strong style="color:var(--amarillo)">$${monto}</strong>
        <span class="tarifa-del" data-destino="${nombre.replace(/"/g, '&quot;')}">✕</span>
      </span>
    </div>`).join('');

  cont.querySelectorAll('.tarifa-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await modalConfirmar(`¿Eliminar tarifa de "${btn.dataset.destino}"?`);
      if (!ok) return;
      await actualizarTarifaDestino(btn.dataset.destino, null);
      pintarTablaTarifas();
      mostrarToast('🗑️ Tarifa eliminada');
    });
  });
}

export async function agregarTarifaDestino() {
  const nombre = await modalPrompt('Nombre del destino (ej. HOTEL PRINCESS):');
  if (!nombre || !nombre.trim()) return;
  const monto = await modalPromptNumero(`Precio fijo para "${nombre.trim()}":`, 100);
  if (monto === null || isNaN(monto) || monto <= 0) return;
  await actualizarTarifaDestino(nombre, monto);
  pintarTablaTarifas();
  mostrarToast('✅ Tarifa agregada');
}

export async function restaurarAjustes() {
  const ok = await modalConfirmar('¿Restaurar todos los ajustes a los valores originales de fábrica?\nEsto no borra tu bitácora ni tu historial, solo la configuración.');
  if (!ok) return;
  await restaurarConfigDefault();
  pintarAjustes();
  mostrarToast('✅ Ajustes restaurados');
  window.dispatchEvent(new CustomEvent('taxi:refrescar-ui'));
}
