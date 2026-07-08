import { app } from '../../firebase-config.js';
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

export async function loginUser(email, password) {
  if (!email || !password) {
    alert("Por favor, ingresa correo y contraseña.");
    return;
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const snap = await getDoc(doc(db, 'Usuarios', uid));
    if (!snap.exists()) {
      alert("Tu usuario no tiene perfil registrado en Usuarios. Contacta al administrador.");
      await auth.signOut();
      return;
    }

    const rol = (snap.data().Rol || '').toLowerCase();

    if (rol === 'cliente') {
      // Esta pantalla (cliente/index.html) es la del cliente: entra normal.
      const card = document.getElementById('card-login');
      if (card) card.style.display = 'none';
      document.dispatchEvent(new CustomEvent('taxi:sesion-iniciada', { detail: snap.data() }));
    } else if (rol === 'chofer') {
      // Un chofer no debe quedarse en la app de clientes: lo mandamos a la suya.
      window.location.href = '/';
    } else {
      alert("Rol desconocido para este usuario: " + snap.data().Rol);
      await auth.signOut();
    }
  } catch (error) {
    console.error('[auth] error de login', error);
    alert("No se pudo iniciar sesión: revisa tu correo y contraseña.");
  }
}
