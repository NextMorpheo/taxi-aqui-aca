import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyCA9TW2orv3U0_KgLtkH",
  authDomain: "taxi-aqui-aca.firebaseapp.com",
  projectId: "taxi-aqui-aca",
  storageBucket: "taxi-aqui-aca.appspot.com",
  messagingSenderId: "974067453176",
  appId: "1:974067453176:web:5525b7f03af2ebc379bf0d" 
};

export const app = initializeApp(firebaseConfig);
