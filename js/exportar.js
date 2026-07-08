// ═══════════════════════════════════════════════════════════
// exportar.js — CSV, PDF, compartir y respaldo automático
// ═══════════════════════════════════════════════════════════
import { idbSet } from './db.js';
import { estado } from './state.js';
import { mostrarToast } from './toast.js';

export function exportarCSV() {
  const rows = [['Hora', 'Tipo', 'Monto']];
  estado.historialGastos.forEach(g => rows.push([g.hora, g.tipo, g.monto]));
  estado.logColectivo.forEach(l => rows.push([l.hora, 'Colectivo', l.monto]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `bitacora_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  mostrarToast('📄 CSV descargado');
}

export function exportarPDF() {
  if (typeof window.jspdf === 'undefined') { mostrarToast('⏳ Cargando librería PDF, intenta de nuevo'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text('TaxiAquíAcá — Bitácora del Día', 14, 18);
  doc.setFontSize(10); doc.text(new Date().toLocaleDateString('es-MX'), 14, 26);

  let y = 38;
  doc.setFontSize(12); doc.text('Resumen Financiero', 14, y); y += 8;
  doc.setFontSize(10);
  doc.text(`Ingresos: $${estado.ganancia}`, 14, y); y += 6;
  doc.text(`Gastos: $${estado.gastos}`, 14, y); y += 6;
  doc.text(`KM recorridos: ${estado.odoTurno.toFixed(1)}`, 14, y); y += 10;

  doc.setFontSize(12); doc.text('Historial Colectivo', 14, y); y += 8;
  doc.setFontSize(9);
  estado.logColectivo.slice(0, 20).forEach(l => {
    doc.text(`${l.hora} — $${l.monto}`, 14, y); y += 5;
  });

  doc.save(`bitacora_${new Date().toISOString().split('T')[0]}.pdf`);
  mostrarToast('📑 PDF generado');
}

export async function compartirBitacora() {
  const datos = { estado, fecha: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const file = new File([blob], `bitacora_${new Date().toISOString().split('T')[0]}.json`, { type: 'application/json' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Bitácora TaxiAquíAcá' });
      mostrarToast('📲 Compartido — elige Drive en el menú');
    } catch (e) { /* usuario canceló el share sheet */ }
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
    mostrarToast('📄 Descargado — súbelo a Drive manualmente');
  }
}

export async function backupDiario() {
  const hoy = new Date().toISOString().split('T')[0];
  await idbSet('bitacora', `backup_${hoy}`, {
    timestamp: Date.now(), fecha: hoy, estado: JSON.parse(JSON.stringify(estado))
  });
  console.log('[Backup] Respaldo diario guardado:', hoy);
}
