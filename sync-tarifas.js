// ═══════════════════════════════════════════════════════════
// sync-tarifas.js — Sube tarifas.json directo al repositorio de
// GitHub de la app de clientes, usando la API de GitHub (sin
// necesidad de entrar a github.com). Requiere un Personal Access
// Token guardado en Ajustes con permiso sobre ese repositorio.
// ═══════════════════════════════════════════════════════════
import { getConfig } from './config.js';
import { mostrarToast } from './toast.js';
import { modalAlerta } from './modal.js';

function construirTarifasPublicas() {
  const cfg = getConfig();
  return {
    _comentario: 'Generado automáticamente desde AJUSTES de la app del chofer. No editar a mano — se sobrescribe en cada sincronización.',
    banderazoDiurno: cfg.banderazoDiurno,
    banderazoVespertino: cfg.banderazoVespertino,
    banderazoNocturno: cfg.banderazoNocturno,
    costoPorKm: cfg.costoPorKm,
    recargoFinDeSemana: cfg.recargoFinDeSemana,
    cargoMinimoRecogida: cfg.cargoMinimoRecogida,
    kmBaseMinimoRecogida: cfg.kmBaseMinimoRecogida,
    costoPorKmExtraRecogida: cfg.costoPorKmExtraRecogida,
    sitioBaseLat: cfg.sitioBaseLat,
    sitioBaseLon: cfg.sitioBaseLon,
    firebaseApiKey: cfg.firebaseApiKey,
    firebaseDatabaseURL: cfg.firebaseDatabaseURL,
    telefonoWhatsApp: cfg.telefonoWhatsApp,
    politicasCancelacion: cfg.politicasCancelacion,
    tablaTarifas: cfg.tablaTarifas,
  };
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export async function sincronizarTarifasClientes() {
  const cfg = getConfig();
  const { githubOwner, githubRepo, githubToken } = cfg;

  if (!githubOwner || !githubRepo || !githubToken) {
    await modalAlerta('Faltan datos de GitHub en Ajustes (usuario, repositorio o token). Configúralos primero.');
    return;
  }

  const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/tarifas.json`;
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
  };

  try {
    // 1) Obtener el SHA del archivo actual (si ya existe) — GitHub lo exige para actualizar.
    let sha = null;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    } else if (getRes.status !== 404) {
      const err = await getRes.json().catch(() => ({}));
      throw new Error(err.message || `Error ${getRes.status} al consultar el archivo`);
    }

    // 2) Subir el archivo nuevo (crea o actualiza según si había sha)
    const contenido = JSON.stringify(construirTarifasPublicas(), null, 2);
    const body = {
      message: `Actualizar tarifas — ${new Date().toLocaleString('es-MX')}`,
      content: utf8ToBase64(contenido),
      ...(sha ? { sha } : {}),
    };

    const putRes = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Error ${putRes.status} al subir el archivo`);
    }

    mostrarToast('✅ Tarifas sincronizadas con la app de clientes');
  } catch (e) {
    console.error('[sync-tarifas]', e);
    await modalAlerta(`No se pudo sincronizar: ${e.message}\n\nRevisa que el token tenga permiso sobre el repositorio y que el usuario/repo estén bien escritos.`);
  }
}
