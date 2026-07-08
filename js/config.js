// ═══════════════════════════════════════════════════════════
// config.js — Configuración editable por el chofer
// Antes estos valores estaban hardcodeados en varias partes del
// código (y con inconsistencias, ej. precio de gasolina distinto
// en 3 lugares). Ahora viven en un solo lugar y son editables
// desde la pantalla de Ajustes sin tocar código.
// ═══════════════════════════════════════════════════════════
import { idbGet, idbSet } from './db.js';

export const CONFIG_DEFAULT = {
  precioGasolina: 27.87,      // $/litro
  capacidadTanque: 50,        // litros, tanque lleno
  metaFondo: 25000,           // meta del fondo de cambio de unidad
  banderazoDiurno: 100,
  banderazoVespertino: 125,
  banderazoNocturno: 150,
  costoPorKm: 3,
  recargoLluvia: 0.35,        // 35%
  recargoFinDeSemana: 0.15,   // 15%
  // Cargo por ir a recoger al cliente (app de clientes): mínimo fijo que
  // cubre los primeros kmBaseMinimoRecogida km desde tu sitio/base, y luego
  // +costoPorKmExtraRecogida por cada km adicional si el cliente está más lejos.
  cargoMinimoRecogida: 30,
  kmBaseMinimoRecogida: 5,
  costoPorKmExtraRecogida: 5,
  sitioBaseLat: 16.8534,      // ubicación de tu sitio/base de taxis (Zócalo por defecto, respaldo si no hay ubicación en vivo)
  sitioBaseLon: -99.8237,
  firebaseApiKey: '',         // Web API Key de tu proyecto Firebase
  firebaseDatabaseURL: '',    // ej. https://tu-proyecto-default-rtdb.firebaseio.com
  telefonoWhatsApp: '',       // con lada país, ej. 527441234567
  politicasCancelacion: [
    'Si cancelas cuando el taxi ya está cerca de tu ubicación, se cobra el costo de la tarifa cotizada. Ese cobro queda pendiente y se suma a tu siguiente viaje.',
    'Se permite cancelar sin penalización si avisas con tiempo y, en su caso, presentas evidencia que lo justifique.',
    '1ª cancelación con penalización: se cobra la penalización y tu cuenta queda bloqueada 30 minutos para pedir otro servicio.',
    '2ª cancelación con penalización: se cobra la penalización y tu cuenta queda bloqueada 1 día para pedir otro servicio.',
    '3ª cancelación con penalización: tu cuenta se da de baja del servicio.',
    'Puedes cancelar sin costo dentro de los primeros 5 minutos después de solicitar el viaje. Pasado ese tiempo, solo se puede cancelar sin penalización si el taxi aún no está cerca de tu ubicación.',
  ],
  githubOwner: '',            // ej. NextMorpheo
  githubRepo: 'TaxiAquiAca---Clientes',
  githubToken: '',            // Personal Access Token con permiso sobre ese repo
  tablaTarifas: {
    'AEROPUERTO': 250, 'CALETA': 400, 'ZOCALO': 400, 'QUEBRADA': 400,
    'HOTEL PRINCESS': 100, 'PRINCESS': 100, 'PIE DE LA CUESTA': 500,
    'BARRA VIEJA': 280, 'JOYAS DIAMANTE': 80, 'JOYAS DIAMANTE PLUS': 90,
    'HOTEL HOLIDAY DIAMANTE': 120, 'HOTEL PIERRE MARQUEZ': 120,
    'LA ISLA': 120, 'CHEDRAUI': 120, 'FORUM': 150, 'BONFIL': 150,
    'CASA DE LA LAGUNA': 450, 'BANYAN TREE': 300, 'GUITARRON': 250,
    'HOTEL PALACIO MUNDO IMPERIAL': 170, 'HOTEL QUINTA REAL': 200,
    'PICHILINGUE': 200, 'RENACIMIENTO': 280, 'LA DIANA': 280,
    'PUERTO MARQUEZ': 100, 'REVOLCADERO': 100, 'MIRAMAR': 100,
    'DIAMANTE LAKES': 120, 'MARINA DIAMANTE': 130, 'CRUCERO CAYACO': 170,
    'WALMART COSTERA': 250, 'HOTEL EMPORIO': 300, 'SAN PEDRO LAS PLAYAS': 350,
  }
};

let config = { ...CONFIG_DEFAULT, tablaTarifas: { ...CONFIG_DEFAULT.tablaTarifas } };

export async function cargarConfig() {
  try {
    const saved = await idbGet('config', 'principal');
    if (saved) {
      config = {
        ...CONFIG_DEFAULT,
        ...saved,
        tablaTarifas: { ...CONFIG_DEFAULT.tablaTarifas, ...(saved.tablaTarifas || {}) }
      };
    }
  } catch (e) { console.warn('[config] usando valores por defecto', e); }
  return config;
}

export function getConfig() {
  return config;
}

export async function guardarConfig(parcial) {
  config = { ...config, ...parcial };
  await idbSet('config', 'principal', config);
  return config;
}

export async function actualizarTarifaDestino(destino, monto) {
  const key = destino.toUpperCase().trim();
  if (monto === null) {
    delete config.tablaTarifas[key];
  } else {
    config.tablaTarifas[key] = monto;
  }
  await idbSet('config', 'principal', config);
}

export async function restaurarConfigDefault() {
  config = { ...CONFIG_DEFAULT, tablaTarifas: { ...CONFIG_DEFAULT.tablaTarifas } };
  await idbSet('config', 'principal', config);
  return config;
}
