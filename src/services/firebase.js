import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD66XRISoL8JH1XV86GZeFm5IoiBa3LjOM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dietamelo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dietamelo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dietamelo.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "522751156811",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:522751156811:web:f2e037225183de102e63ce"
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

let app = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch (err) {
    console.error('[Firebase] Errore di inizializzazione:', err);
  }
}

export { app, db };
