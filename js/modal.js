// ═══════════════════════════════════════════════════════════
// modal.js — Modales propios, con el estilo de la app.
// Reemplaza alert()/confirm()/prompt() nativos, que en varios
// navegadores móviles se ven feos y bloquean toda la interfaz
// de forma poco amigable mientras el chofer maneja.
// ═══════════════════════════════════════════════════════════

function crearOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);
  return overlay;
}

function baseHTML(mensaje, cuerpoExtra, botones) {
  return `
    <div class="modal-box">
      <div class="modal-msg">${mensaje}</div>
      ${cuerpoExtra || ''}
      <div class="modal-botones">${botones}</div>
    </div>`;
}

export function modalAlerta(mensaje) {
  return new Promise((resolve) => {
    const overlay = crearOverlay();
    overlay.innerHTML = baseHTML(mensaje, '', `<button class="btn btn-amarillo btn-sm modal-ok">Entendido</button>`);
    overlay.querySelector('.modal-ok').onclick = () => { overlay.remove(); resolve(); };
  });
}

export function modalConfirmar(mensaje) {
  return new Promise((resolve) => {
    const overlay = crearOverlay();
    overlay.innerHTML = baseHTML(mensaje, '', `
      <button class="btn btn-gris btn-sm modal-cancelar">Cancelar</button>
      <button class="btn btn-verde btn-sm modal-aceptar">Confirmar</button>`);
    overlay.querySelector('.modal-cancelar').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('.modal-aceptar').onclick = () => { overlay.remove(); resolve(true); };
  });
}

export function modalPrompt(mensaje, valorInicial = '') {
  return new Promise((resolve) => {
    const overlay = crearOverlay();
    overlay.innerHTML = baseHTML(
      mensaje,
      `<input type="text" class="form-input modal-input" value="${valorInicial}">`,
      `<button class="btn btn-gris btn-sm modal-cancelar">Cancelar</button>
       <button class="btn btn-amarillo btn-sm modal-aceptar">Aceptar</button>`
    );
    const input = overlay.querySelector('.modal-input');
    input.focus(); input.select();
    const cerrar = (valor) => { overlay.remove(); resolve(valor); };
    overlay.querySelector('.modal-cancelar').onclick = () => cerrar(null);
    overlay.querySelector('.modal-aceptar').onclick = () => cerrar(input.value);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') cerrar(input.value); });
  });
}

export function modalPromptNumero(mensaje, valorInicial = 0) {
  return new Promise((resolve) => {
    const overlay = crearOverlay();
    overlay.innerHTML = baseHTML(
      mensaje,
      `<input type="number" class="form-input modal-input" value="${valorInicial}" inputmode="decimal">`,
      `<button class="btn btn-gris btn-sm modal-cancelar">Cancelar</button>
       <button class="btn btn-amarillo btn-sm modal-aceptar">Aceptar</button>`
    );
    const input = overlay.querySelector('.modal-input');
    input.focus(); input.select();
    const cerrar = (valor) => { overlay.remove(); resolve(valor === null ? null : parseFloat(valor)); };
    overlay.querySelector('.modal-cancelar').onclick = () => cerrar(null);
    overlay.querySelector('.modal-aceptar').onclick = () => cerrar(input.value);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') cerrar(input.value); });
  });
}
