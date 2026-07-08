import { cargarTarifasPublicas, getTarifasPublicas, calcularPrecioCliente } from './tarifas-cliente.js';
import { obtenerUbicacionCliente, geocodificarDestino, calcularKmReal } from './gps-cliente.js';
import { mostrarPoliticas } from './policies.js';
import { obtenerUbicacionChoferEnVivo, registrarViajeSolicitado } from './live-tracking-cliente.js';

let ubicacionCliente = null;
let coordDestinoActual = null;

const $ = (id) => document.getElementById(id);

async function cotizar() {
  const destino = $('input-destino').value.trim();
  if (!destino) { alert('Escribe a dónde quieres ir'); return; }
  if (!ubicacionCliente) { alert('No se pudo obtener tu ubicación. Activa el GPS.'); return; }

  $('resultado').style.display = 'none';
  $('cargando').style.display = 'block';

  coordDestinoActual = await geocodificarDestino(destino);
  if (!coordDestinoActual) {
    $('cargando').style.display = 'none';
    alert('No se encontró ese destino. Intenta ser más específico (ej. "Hotel Princess, Acapulco").');
    return;
  }

  const { km, minutos } = await calcularKmReal(ubicacionCliente, coordDestinoActual);
  const ubicacionChofer = await obtenerUbicacionChoferEnVivo(getTarifasPublicas());
  const { precio } = calcularPrecioCliente(destino, km, ubicacionCliente, ubicacionChofer);

  $('cargando').style.display = 'none';
  $('precio-final').textContent = `$${precio}`;
  $('eta-final').textContent = `🕒 Llegada estimada: ${minutos} min`;
  $('resultado').dataset.destino = destino;
  $('resultado').dataset.precio = precio;
  $('resultado').dataset.km = km;
  $('resultado').style.display = 'block';

  if (ubicacionChofer) {
    const dist = await calcularKmReal(ubicacionChofer, ubicacionCliente);
    $('eta-final').textContent += ` · 🚕 Tu taxi está a ${dist.km.toFixed(1)} km (~${dist.minutos} min)`;
  }
}

async function solicitarViaje() {
  const destino = $('resultado').dataset.destino;
  const precio = parseFloat($('resultado').dataset.precio);
  const km = parseFloat($('resultado').dataset.km);

  await mostrarPoliticas({ soloLectura: false });

  const tel = getTarifasPublicas().telefonoWhatsApp;
  if (tel) {
    const msg = encodeURIComponent(
      `Hola, quiero pedir un taxi 🚕\nDestino: ${destino}\nPrecio cotizado: $${precio}\nMi ubicación: https://maps.google.com/?q=${ubicacionCliente.lat},${ubicacionCliente.lon}`
    );
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
  }

  registrarViajeSolicitado(getTarifasPublicas(), { destino, precio, km, cliente: ubicacionCliente });
  mostrarSolicitudActiva(destino, precio);
}

function mostrarSolicitudActiva(destino, precio) {
  $('form-cotizar').style.display = 'none';
  $('resultado').style.display = 'none';
  $('solicitud-activa').style.display = 'block';
  $('solicitud-destino').textContent = destino;
  $('solicitud-precio').textContent = `$${precio}`;
}

function nuevaCotizacion() {
  $('solicitud-activa').style.display = 'none';
  $('form-cotizar').style.display = 'block';
  $('input-destino').value = '';
}

function esIOSDispositivo() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function abrirMapaNativo() {
  if (!coordDestinoActual || !ubicacionCliente) return;
  const { lat: oLat, lon: oLon } = ubicacionCliente;
  const { lat: dLat, lon: dLon } = coordDestinoActual;

  if (esIOSDispositivo()) {
    
    window.location.href = `maps://maps.apple.com/?saddr=${oLat},${oLon}&daddr=${dLat},${dLon}&dirflg=d`;
  } else 
{
    
    window.location.href = `https://www.google.com/maps/dir/?api=1&origin=${oLat},${oLon}&destination=${dLat},${dLon}&travelmode=driving`;
  }
}

async function iniciarUbicacionYTarifas() {
  await cargarTarifasPublicas();
  try {
    ubicacionCliente = await obtenerUbicacionCliente();
    $('estado-ubicacion').textContent = '📍 Ubicación detectada';
    $('btn-cotizar').disabled = false;
  } catch (e) {
    $('estado-ubicacion').textContent = '⚠️ Activa tu GPS para cotizar';
  }
}

iniciarUbicacionYTarifas();

$('btn-cotizar').addEventListener('click', cotizar);
$('btn-whatsapp').addEventListener('click', solicitarViaje);
$('btn-mapa-nativo').addEventListener('click', abrirMapaNativo);
$('btn-cancelar-solicitud').addEventListener('click', nuevaCotizacion);
$('link-ver-politicas').addEventListener('click', (e) => { e.preventDefault(); mostrarPoliticas({ soloLectura: true }); });
$('input-destino').addEventListener('keydown', (e) => { if (e.key === 'Enter') cotizar(); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw-cliente.js', { scope: './' }).catch(() => {});
}

let eventoInstalacionDiferido = null;
const YA_CERRO_BANNER = 'taxiaquiaca_banner_cerrado';

function enModoInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function mostrarBannerInstalar() {
  if (enModoInstalado() || localStorage.getItem(YA_CERRO_BANNER)) return;
  document.getElementById('banner-instalar').style.display = 'flex';
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalacionDiferido = e;
  mostrarBannerInstalar();
});

if (esIOS() && !enModoInstalado()) {
  document.getElementById('banner-instalar-txt').textContent =
    'Instala la app: toca Compartir ⬆️ y luego "Agregar a pantalla de inicio".';
  document.getElementById('btn-instalar').style.display = 'none';
  mostrarBannerInstalar();
}

window.instalarPWA = async function () {
  if (!eventoInstalacionDiferido) return;
  eventoInstalacionDiferido.prompt();
  await eventoInstalacionDiferido.userChoice;
  eventoInstalacionDiferido = null;
  document.getElementById('banner-instalar').style.display = 'none';
};

window.cerrarBannerInstalar = function () {
  document.getElementById('banner-instalar').style.display = 'none';
  localStorage.setItem(YA_CERRO_BANNER, '1');
};

window.addEventListener('appinstalled', () => {
  document.getElementById('banner-instalar').style.display = 'none';
});
