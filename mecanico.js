// ═══════════════════════════════════════════════════════════
// mecanico.js — Diagnóstico por síntomas, alertas preventivas
// e historial de servicios mecánicos.
// ═══════════════════════════════════════════════════════════
import { idbSet, idbGetAll, idbDelete } from './db.js';
import { estado, guardarEstado } from './state.js';
import { mostrarToast } from './toast.js';

export const SINTOMAS_DATA = {
  brinca_rebota: {
    titulo: '🚗 Brinca o rebota mucho', causas: [
      { comp: 'Amortiguadores desgastados', prob: 'alta', costo: '$800-$1,800', urg: 'Pronto', puede: true, desc: 'Causa más común en Acapulco. Desgaste 40-60k km.' },
      { comp: 'Resortes fatigados', prob: 'media', costo: '$600-$1,400', urg: 'Pronto', puede: true, desc: 'Si el carro se ve más bajo de un lado.' },
      { comp: 'Bujes de horquilla', prob: 'media', costo: '$300-$700', urg: 'Pronto', puede: true, desc: 'Se endurecen con el calor. Ruido seco en topes.' },
    ]
  },
  gasta_mucho_gasolina: {
    titulo: '⛽ Gasta más gasolina', causas: [
      { comp: 'Bujías desgastadas', prob: 'alta', costo: '$200-$500', urg: 'Pronto', puede: true, desc: 'Cambiar cada 20,000 km.' },
      { comp: 'Sensor MAF sucio', prob: 'alta', costo: '$100-$1,500', urg: 'Pronto', puede: true, desc: 'Limpiar con spray especial primero.' },
      { comp: 'Filtro de aire tapado', prob: 'alta', costo: '$80-$200', urg: 'Pronto', puede: true, desc: 'Cambiar cada 10,000 km.' },
    ]
  },
  jala_chueco: {
    titulo: '↩️ Jala hacia un lado', causas: [
      { comp: 'Alineación', prob: 'alta', costo: '$200-$400', urg: 'Pronto', puede: true, desc: 'Revisar cada 5,000 km.' },
      { comp: 'Presión desigual llantas', prob: 'alta', costo: '$0-$20', urg: 'Inmediata', puede: true, desc: 'Revisar semanal.' },
      { comp: 'Rótula desgastada', prob: 'media', costo: '$400-$900', urg: 'INMEDIATA ⚠️', puede: false, desc: '⚠️ PELIGROSO — No manejar.' },
    ]
  },
  ruido_al_frenar: {
    titulo: '🔊 Ruido al frenar', causas: [
      { comp: 'Balatas desgastadas', prob: 'alta', costo: '$300-$800', urg: 'INMEDIATA ⚠️', puede: false, desc: '⚠️ No dejar pasar.' },
      { comp: 'Disco rayado', prob: 'media', costo: '$600-$1,600', urg: 'INMEDIATA ⚠️', puede: false, desc: 'Si balatas llegaron al fondo.' },
    ]
  },
  motor_tiembla_ralenti: {
    titulo: '〰️ Motor tiembla en ralentí', causas: [
      { comp: 'Bujía muerta', prob: 'alta', costo: '$50-$200', urg: 'Pronto', puede: true, desc: 'Motor en 3 cilindros.' },
      { comp: 'Válvula IAC sucia', prob: 'alta', costo: '$100-$400', urg: 'Pronto', puede: true, desc: 'Puede apagarse al soltar acelerador.' },
    ]
  },
  sobrecalentamiento: {
    titulo: '🌡️ Motor se calienta', causas: [
      { comp: 'Refrigerante bajo', prob: 'alta', costo: '$50-$200', urg: 'INMEDIATA ⚠️', puede: false, desc: '⚠️ Revisar en frío. Si baja seguido hay fuga.' },
      { comp: 'Termostato atorado', prob: 'alta', costo: '$200-$500', urg: 'INMEDIATA ⚠️', puede: false, desc: '⚠️ No manejar.' },
    ]
  }
};

export function mostrarDiagnostico(id) {
  const s = SINTOMAS_DATA[id];
  const colorProb = { alta: '#ff6b6b', media: '#ffd600', baja: '#60a5fa' };
  let html = `<div class="card-label" style="margin-bottom:11px">${s.titulo}</div>`;
  s.causas.forEach(c => {
    const clase = c.prob === 'alta' ? 'causa-alta' : c.prob === 'media' ? 'causa-media' : 'causa-baja';
    html += `<div class="causa-item ${clase}">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <strong style="color:${colorProb[c.prob]}">${c.comp}</strong>
        <span style="font-size:10px;background:rgba(255,255,255,.1);padding:2px 7px;border-radius:5px">${c.prob.toUpperCase()}</span>
      </div>
      <div style="color:#94a3b8;margin-bottom:5px;line-height:1.5">${c.desc}</div>
      <div style="display:flex;justify-content:space-between;font-size:11px">
        <span style="color:#ffd600">💰 ${c.costo}</span><span>⏱ ${c.urg}</span>
        <span style="color:${c.puede ? '#00e676' : '#ff6b6b'}">${c.puede ? '✅' : '🛑'}</span>
      </div></div>`;
  });
  document.getElementById('diag-card').innerHTML = html;
  document.getElementById('diag-resultado').style.display = 'block';
  document.getElementById('diag-resultado').scrollIntoView({ behavior: 'smooth' });
}

export async function guardarServicioMecanico() {
  const comp = document.getElementById('mec-componente').value.trim();
  const tipo = document.getElementById('mec-tipo').value;
  const costo = parseFloat(document.getElementById('mec-costo').value) || 0;
  const odo = parseFloat(document.getElementById('mec-odo').value) || estado.odo;
  const taller = document.getElementById('mec-taller').value.trim();
  const notas = document.getElementById('mec-notas').value.trim();

  if (!comp) { mostrarToast('⚠️ Ingresa el componente o servicio'); return; }

  const id = `mec_${Date.now()}`;
  await idbSet('ia_mantenimiento', id, {
    fecha: new Date().toLocaleDateString('es-MX'),
    timestamp: Date.now(), componente: comp, tipo, costo, odometro: odo, taller, notas
  });

  if (costo > 0) {
    estado.gastos += costo;
    guardarEstado();
    window.dispatchEvent(new CustomEvent('taxi:refrescar-ui'));
  }

  ['mec-componente', 'mec-costo', 'mec-odo', 'mec-taller', 'mec-notas'].forEach(id => document.getElementById(id).value = '');
  mostrarToast('✅ Servicio guardado en bitácora');
  actualizarHistorialMecanico();
}

export async function actualizarHistorialMecanico() {
  const registros = await idbGetAll('ia_mantenimiento');
  registros.sort((a, b) => b.timestamp - a.timestamp);
  const cont = document.getElementById('historial-mecanico');
  if (registros.length === 0) {
    cont.innerHTML = '<div style="font-size:12px;color:#64748b;font-family:monospace;padding:11px 0;text-align:center">Sin servicios registrados</div>';
    return;
  }
  cont.innerHTML = registros.slice(0, 15).map(r => `
    <div class="hist-item">
      <div class="hist-header">
        <strong>${r.componente}</strong>
        <span class="hist-tag hist-tag-${r.tipo}">${r.tipo}</span>
      </div>
      <div style="color:#94a3b8;font-family:monospace;font-size:11px">
        ${r.fecha} · ${Math.round(r.odometro).toLocaleString()} km · ${r.taller || 'Sin taller'}
      </div>
      ${r.costo > 0 ? `<div style="color:#ff6b6b;font-weight:900;font-family:monospace;margin-top:4px">-$${r.costo}</div>` : ''}
      ${r.notas ? `<div style="color:#64748b;font-size:10px;margin-top:4px">${r.notas}</div>` : ''}
    </div>
  `).join('');
}

// ── CHECKLIST DE MANTENIMIENTO (igual a la hoja "MANTENIMIENTO" de la bitácora en Excel) ──
export const CHECKLIST_GRUPOS = [
  { grupo: 'Aceite y Filtros', items: [
    { id: 'aceite', label: 'Cambio de aceite' },
    { id: 'filtro_aire', label: 'Filtro de aire' },
    { id: 'filtro_gasolina', label: 'Filtro de gasolina' },
    { id: 'filtro_aceite', label: 'Filtro de aceite' },
  ]},
  { grupo: 'Bujías', items: [
    { id: 'bujias', label: 'Bujías' },
  ]},
  { grupo: 'Suspensión', items: [
    { id: 'horquillas', label: 'Horquillas' },
    { id: 'terminales', label: 'Terminales' },
    { id: 'cremallera', label: 'Cremallera' },
    { id: 'nudo', label: 'Nudo' },
    { id: 'bieletas', label: 'Bieletas' },
  ]},
  { grupo: 'Llantas', items: [
    { id: 'llantas', label: 'Llantas (cambio/revisión)' },
    { id: 'alineacion', label: 'Alineación' },
    { id: 'rotacion', label: 'Rotación' },
  ]},
];

let checklistEditandoId = null;

export function renderChecklistForm() {
  const cont = document.getElementById('checklist-items');
  if (!cont) return;
  cont.innerHTML = CHECKLIST_GRUPOS.map(g => `
    <div style="margin-bottom:11px">
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;font-family:monospace;margin-bottom:6px">${g.grupo}</div>
      ${g.items.map(it => `
        <label style="display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;cursor:pointer">
          <input type="checkbox" id="chk-${it.id}" style="width:18px;height:18px;accent-color:var(--amarillo,#FFD600)">
          ${it.label}
        </label>
      `).join('')}
    </div>
  `).join('');
}

export async function guardarChecklist() {
  const km = parseFloat(document.getElementById('chk-km').value) || estado.odo;
  const items = {};
  let algunoMarcado = false;
  CHECKLIST_GRUPOS.forEach(g => g.items.forEach(it => {
    const checked = document.getElementById(`chk-${it.id}`)?.checked || false;
    items[it.id] = checked;
    if (checked) algunoMarcado = true;
  }));

  if (!algunoMarcado) { mostrarToast('⚠️ Marca al menos un elemento revisado'); return; }

  if (checklistEditandoId) {
    const existente = (await idbGetAll('ia_checklist')).find(r => r.id === checklistEditandoId);
    await idbSet('ia_checklist', checklistEditandoId, {
      ...existente, odometro: km, items
    });
    mostrarToast('✅ Checklist actualizado');
    cancelarEdicionChecklist();
  } else {
    const id = `chk_${Date.now()}`;
    await idbSet('ia_checklist', id, {
      id, fecha: new Date().toLocaleDateString('es-MX'),
      timestamp: Date.now(), odometro: km, items
    });
    CHECKLIST_GRUPOS.forEach(g => g.items.forEach(it => {
      const el = document.getElementById(`chk-${it.id}`);
      if (el) el.checked = false;
    }));
    document.getElementById('chk-km').value = '';
    mostrarToast('✅ Checklist guardado en bitácora');
  }
  await recalcularUltimoServicioPorItem();
  actualizarHistorialChecklist();
}

export async function editarChecklist(id) {
  const r = (await idbGetAll('ia_checklist')).find(x => x.id === id);
  if (!r) return;
  checklistEditandoId = id;
  document.getElementById('chk-km').value = r.odometro;
  CHECKLIST_GRUPOS.forEach(g => g.items.forEach(it => {
    const el = document.getElementById(`chk-${it.id}`);
    if (el) el.checked = !!r.items[it.id];
  }));
  const btn = document.getElementById('btn-guardar-checklist');
  if (btn) { btn.textContent = '💾 GUARDAR CAMBIOS'; btn.classList.add('btn-editando'); }
  const cancelar = document.getElementById('btn-cancelar-edicion-checklist');
  if (cancelar) cancelar.style.display = 'block';
  document.getElementById('checklist-items').scrollIntoView({ behavior: 'smooth' });
}

export function cancelarEdicionChecklist() {
  checklistEditandoId = null;
  document.getElementById('chk-km').value = '';
  CHECKLIST_GRUPOS.forEach(g => g.items.forEach(it => {
    const el = document.getElementById(`chk-${it.id}`);
    if (el) el.checked = false;
  }));
  const btn = document.getElementById('btn-guardar-checklist');
  if (btn) { btn.textContent = '✅ GUARDAR CHECKLIST'; btn.classList.remove('btn-editando'); }
  const cancelar = document.getElementById('btn-cancelar-edicion-checklist');
  if (cancelar) cancelar.style.display = 'none';
}

export async function borrarChecklist(id) {
  if (!confirm('¿Borrar este checklist? No se puede deshacer.')) return;
  await idbDelete('ia_checklist', id);
  mostrarToast('🗑️ Checklist borrado');
  await recalcularUltimoServicioPorItem();
  actualizarHistorialChecklist();
}

export async function actualizarHistorialChecklist() {
  const registros = await idbGetAll('ia_checklist');
  registros.sort((a, b) => b.timestamp - a.timestamp);
  const cont = document.getElementById('historial-checklist');
  if (!cont) return;
  if (registros.length === 0) {
    cont.innerHTML = '<div style="font-size:12px;color:#64748b;font-family:monospace;padding:11px 0;text-align:center">Sin checklists registrados</div>';
    return;
  }
  cont.innerHTML = registros.slice(0, 10).map(r => {
    const marcados = Object.entries(r.items).filter(([, v]) => v).map(([k]) => {
      for (const g of CHECKLIST_GRUPOS) { const f = g.items.find(i => i.id === k); if (f) return f.label; }
      return k;
    });
    return `
    <div class="hist-item">
      <div class="hist-header">
        <strong>Checklist</strong>
        <span style="color:#94a3b8;font-family:monospace;font-size:11px">${r.fecha} · ${Math.round(r.odometro).toLocaleString()} km</span>
      </div>
      <div style="color:#94a3b8;font-size:11px;margin-top:4px">${marcados.join(' · ') || 'Sin elementos'}</div>
      <div style="display:flex;gap:8px;margin-top:7px">
        <button class="btn-mini" onclick="editarChecklist('${r.id}')">✏️ Editar</button>
        <button class="btn-mini btn-mini-rojo" onclick="borrarChecklist('${r.id}')">🗑️ Borrar</button>
      </div>
    </div>`;
  }).join('');
}

async function recalcularUltimoServicioPorItem() {
  const registros = await idbGetAll('ia_checklist');
  const ultimos = {};
  registros.forEach(r => {
    Object.entries(r.items || {}).forEach(([itemId, marcado]) => {
      if (marcado && (!ultimos[itemId] || r.odometro > ultimos[itemId])) ultimos[itemId] = r.odometro;
    });
  });
  estado.ultimoServicioPorItem = ultimos;
  guardarEstado();
}

const PLAN_PREVENTIVO = [
  { comp: 'Aceite y filtro', cada: 5000, itemId: 'aceite' },
  { comp: 'Filtro de aire', cada: 10000, itemId: 'filtro_aire' },
  { comp: 'Bujías', cada: 20000, itemId: 'bujias' },
  { comp: 'Alineación', cada: 5000, itemId: 'alineacion' },
  { comp: 'Banda de distribución', cada: 60000 },
  { comp: 'Líquido de frenos', cada: 20000 },
];

export function obtenerAlertasPreventivas(odometroActual) {
  const urgente = [], proximo = [];
  for (const p of PLAN_PREVENTIVO) {
    let proxKm, faltan;
    const ultimo = p.itemId ? estado.ultimoServicioPorItem?.[p.itemId] : null;
    if (ultimo != null) {
      proxKm = ultimo + p.cada;
      faltan = proxKm - odometroActual;
    } else {
      proxKm = Math.ceil(odometroActual / p.cada) * p.cada;
      faltan = proxKm - odometroActual;
    }
    if (faltan <= p.cada * 0.1) urgente.push({ ...p, faltan, proxKm });
    else if (faltan <= p.cada * 0.2) proximo.push({ ...p, faltan, proxKm });
  }
  return { urgente, proximo };
}

export function mostrarAlertasPreventivas() {
  const { urgente, proximo } = obtenerAlertasPreventivas(estado.odo);
  let html = '';
  urgente.forEach(p => html += `<div class="alerta alerta-rojo">⚠️ <strong>${p.comp}</strong> — ${p.faltan <= 0 ? 'VENCIDO' : `Faltan ${Math.round(p.faltan)} km`}</div>`);
  proximo.forEach(p => html += `<div class="alerta alerta-amarillo">📅 <strong>${p.comp}</strong> — Faltan ${Math.round(p.faltan)} km</div>`);
  if (!urgente.length && !proximo.length) html = '<div class="alerta alerta-verde">✅ Todo al día</div>';
  const el = document.getElementById('alertas-prev');
  if (el) el.innerHTML = html;
}
