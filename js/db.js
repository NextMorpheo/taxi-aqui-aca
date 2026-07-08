// ═══════════════════════════════════════════════════════════
// db.js — Núcleo IndexedDB
// Capa genérica de persistencia. Ningún otro módulo debe tocar
// indexedDB directamente: todos pasan por aquí.
// ═══════════════════════════════════════════════════════════

const IDB_NAME = 'TaxiAquiAcaDB_v3';
const IDB_VERSION = 3;
const STORES = ['estado', 'config', 'ia_tarifas', 'ia_mantenimiento', 'ia_checklist', 'ia_combustible', 'ia_admin', 'rutas', 'bitacora'];

let dbInstance = null;

export function abrirDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
    req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
    req.onerror = (e) => reject(e);
  });
}

export async function idbSet(store, id, data) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put({ id, ...data });
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

export async function idbGet(store, id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e);
  });
}

export async function idbGetAll(store) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e);
  });
}

export async function idbDelete(store, id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e);
  });
}

// ── DEPURACIÓN SEMANAL (Sábados 00:00) ────────────────────────
// Borra registros de bitácora (backups diarios) con más de 90 días.
export async function depurarSemanal() {
  const hoy = new Date();
  if (hoy.getDay() !== 6 || hoy.getHours() !== 0) return;

  const yaCorrioHoy = await idbGet('estado', 'ultima_depuracion');
  const fechaHoy = hoy.toISOString().split('T')[0];
  if (yaCorrioHoy && yaCorrioHoy.fecha === fechaHoy) return;

  const bitacora = await idbGetAll('bitacora');
  const limite = Date.now() - (90 * 24 * 60 * 60 * 1000);
  for (const r of bitacora) {
    if (r.timestamp && r.timestamp < limite) {
      await idbDelete('bitacora', r.id);
    }
  }

  await idbSet('estado', 'ultima_depuracion', { fecha: fechaHoy });
  console.log('[IndexedDB] Depuración semanal completada');
}
