// ═══════════════════════════════════════════════════════════
// combustible.js — Bitácora de carga de gasolina, igual a la
// hoja "GASOLINA" del Excel: km recorridos, litros gastados,
// nivel de tanque, rendimiento real y alerta de mantenimiento
// (misma lógica que la columna "Mantenimiento" del Excel:
// >=5000 km desde el último servicio = urgente, >=4500 = próximo).
// ═══════════════════════════════════════════════════════════
import { idbSet, idbGetAll, idbDelete } from './db.js';
import { estado, guardarEstado } from './state.js';
import { getConfig } from './config.js';
import { mostrarToast } from './toast.js';

let combustibleEditandoId = null;

function $(id) { return document.getElementById(id); }

async function ultimoRegistro() {
  const registros = await idbGetAll('ia_combustible');
  registros.sort((a, b) => b.timestamp - a.timestamp);
  return registros[0] || null;
}

function calcularAlertaMantenimiento(kmActual) {
  // Usa el km real de servicio más reciente registrado en el checklist,
  // si no hay ninguno usa 0 (igual que el Excel referenciaba una celda fija).
  const kms = Object.values(estado.ultimoServicioPorItem || {});
  const ultimoServicioKm = kms.length ? Math.max(...kms) : 0;
  const diff = kmActual - ultimoServicioKm;
  if (diff >= 5000) return { texto: '¡SERVICIO URGENTE!', clase: 'alerta-mant-urgente' };
  if (diff >= 4500) return { texto: 'Próximo al mantenimiento', clase: 'alerta-mant-proximo' };
  return { texto: 'OK', clase: 'alerta-mant-ok' };
}

export async function precargarFormularioCombustible() {
  const ultimo = await ultimoRegistro();
  const kmInicialSugerido = ultimo ? ultimo.kmActual : estado.odo;
  $('gas-km-inicial').value = kmInicialSugerido;
  $('gas-costo-lt').value = getConfig().precioGasolina;
  if (ultimo?.estacion) $('gas-estacion').value = ultimo.estacion;
}

export async function guardarCarga() {
  const kmInicial = parseFloat($('gas-km-inicial').value);
  const kmActual = parseFloat($('gas-km-actual').value);
  const ltCargados = parseFloat($('gas-litros').value);
  const costoXLt = parseFloat($('gas-costo-lt').value) || getConfig().precioGasolina;
  const estacion = $('gas-estacion').value.trim();
  const bomba = $('gas-bomba').value.trim();

  if (isNaN(kmActual) || isNaN(kmInicial) || kmActual <= kmInicial) {
    mostrarToast('⚠️ Revisa el km inicial y actual'); return;
  }
  if (isNaN(ltCargados) || ltCargados <= 0) { mostrarToast('⚠️ Ingresa los litros cargados'); return; }

  const capacidad = getConfig().capacidadTanque;
  const ultimo = await ultimoRegistro();
  const tanqueAnterior = ultimo ? ultimo.tanqueLt : capacidad;
  const rendimientoUsado = estado.rendimiento || 11;

  const kmRecorridos = kmActual - kmInicial;
  const ltGastados = Math.round((kmRecorridos / rendimientoUsado) * 100) / 100;
  const monto = Math.round(ltCargados * costoXLt * 100) / 100;
  let tanqueLt = Math.round(tanqueAnterior - ltGastados + ltCargados);
  tanqueLt = Math.max(0, Math.min(capacidad, tanqueLt));
  const lleno = tanqueLt >= capacidad * 0.95;

  // Recalibra el rendimiento real solo si esta carga y la anterior fueron
  // "tanque lleno" (mismo método que el Excel: medir entre dos llenados).
  let rendimientoNuevo = rendimientoUsado;
  if (lleno && ultimo?.lleno && ltCargados > 0) {
    rendimientoNuevo = Math.round((kmRecorridos / ltCargados) * 100) / 100;
  }

  const autonomiaRestante = Math.round(tanqueLt * rendimientoNuevo);
  const kmEstimadoVacio = kmActual + autonomiaRestante;
  const alerta = calcularAlertaMantenimiento(kmActual);

  const registro = {
    fecha: new Date().toLocaleDateString('es-MX'), timestamp: Date.now(),
    kmInicial, kmActual, kmRecorridos, ltGastados, ltCargados, costoXLt, monto,
    tanqueLt, lleno, estacion, bomba, rendimiento: rendimientoNuevo,
    autonomiaRestante, kmEstimadoVacio, alertaTexto: alerta.texto, alertaClase: alerta.clase,
  };

  if (combustibleEditandoId) {
    registro.id = combustibleEditandoId;
    registro.timestamp = (await idbGetAll('ia_combustible')).find(r => r.id === combustibleEditandoId)?.timestamp || Date.now();
    registro.fecha = (await idbGetAll('ia_combustible')).find(r => r.id === combustibleEditandoId)?.fecha || registro.fecha;
    await idbSet('ia_combustible', combustibleEditandoId, registro);
    mostrarToast('✅ Carga actualizada');
    cancelarEdicionCombustible();
  } else {
    registro.id = `gas_${Date.now()}`;
    await idbSet('ia_combustible', registro.id, registro);
    mostrarToast('✅ Carga guardada en bitácora');
    $('gas-litros').value = ''; $('gas-bomba').value = '';
  }

  // Sincroniza con el estado global (turno / finanzas usan estos valores)
  estado.gas = tanqueLt;
  estado.odo = kmActual;
  estado.rendimiento = rendimientoNuevo;
  await guardarEstado();
  window.dispatchEvent(new CustomEvent('taxi:refrescar-ui'));

  await precargarFormularioCombustible();
  actualizarHistorialCombustible();
}

export async function editarCarga(id) {
  const r = (await idbGetAll('ia_combustible')).find(x => x.id === id);
  if (!r) return;
  combustibleEditandoId = id;
  $('gas-km-inicial').value = r.kmInicial;
  $('gas-km-actual').value = r.kmActual;
  $('gas-litros').value = r.ltCargados;
  $('gas-costo-lt').value = r.costoXLt;
  $('gas-estacion').value = r.estacion || '';
  $('gas-bomba').value = r.bomba || '';
  const btn = $('btn-guardar-combustible');
  if (btn) { btn.textContent = '💾 GUARDAR CAMBIOS'; btn.classList.add('btn-editando'); }
  const cancelar = $('btn-cancelar-edicion-combustible');
  if (cancelar) cancelar.style.display = 'block';
  $('gas-km-inicial').scrollIntoView({ behavior: 'smooth' });
}

export function cancelarEdicionCombustible() {
  combustibleEditandoId = null;
  $('gas-km-actual').value = ''; $('gas-litros').value = ''; $('gas-bomba').value = '';
  const btn = $('btn-guardar-combustible');
  if (btn) { btn.textContent = '⛽ GUARDAR CARGA'; btn.classList.remove('btn-editando'); }
  const cancelar = $('btn-cancelar-edicion-combustible');
  if (cancelar) cancelar.style.display = 'none';
  precargarFormularioCombustible();
}

export async function borrarCarga(id) {
  if (!confirm('¿Borrar esta carga de combustible? No se puede deshacer.')) return;
  await idbDelete('ia_combustible', id);
  mostrarToast('🗑️ Carga borrada');
  actualizarHistorialCombustible();
}

export async function actualizarHistorialCombustible() {
  const registros = await idbGetAll('ia_combustible');
  registros.sort((a, b) => b.timestamp - a.timestamp);
  const cont = $('historial-combustible');
  if (!cont) return;

  if (registros.length === 0) {
    cont.innerHTML = '<div style="font-size:12px;color:#64748b;font-family:monospace;padding:11px 0;text-align:center">Sin cargas registradas</div>';
    return;
  }

  const ultima = registros[0];
  const badge = $('badge-alerta-mant');
  if (badge) {
    badge.textContent = ultima.alertaTexto === 'OK' ? '✅ Mantenimiento al día' : `⚠️ ${ultima.alertaTexto}`;
    badge.className = `alerta-mant-badge ${ultima.alertaClase}`;
  }

  cont.innerHTML = registros.slice(0, 15).map(r => `
    <div class="hist-item">
      <div class="hist-header">
        <strong>${r.ltCargados} L · $${r.monto}</strong>
        <span style="color:#94a3b8;font-family:monospace;font-size:11px">${r.fecha} · ${Math.round(r.kmActual).toLocaleString()} km</span>
      </div>
      <div style="color:#94a3b8;font-size:11px;margin-top:4px">
        ${r.estacion || 'Sin estación'} ${r.bomba ? `· Bomba ${r.bomba}` : ''} · Tanque: ${r.tanqueLt}L ${r.lleno ? '(lleno)' : ''} · Rinde ${r.rendimiento} km/L
      </div>
      <div style="display:flex;gap:8px;margin-top:7px">
        <button class="btn-mini" onclick="editarCarga('${r.id}')">✏️ Editar</button>
        <button class="btn-mini btn-mini-rojo" onclick="borrarCarga('${r.id}')">🗑️ Borrar</button>
      </div>
    </div>
  `).join('');
}
