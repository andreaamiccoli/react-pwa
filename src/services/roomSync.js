import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase.js';

// Salva o aggiorna lo stato unificato della stanza
export async function syncRoomState(roomCode, dataPayload) {
  if (!roomCode) return;

  // 1. Salva sempre localmente come fallback immediato
  try {
    if (dataPayload.dietData !== undefined) {
      localStorage.setItem('dietData', JSON.stringify(dataPayload.dietData));
    }
    if (dataPayload.recipeData !== undefined) {
      localStorage.setItem('recipeData', JSON.stringify(dataPayload.recipeData));
    }
    if (dataPayload.ingredientsData !== undefined) {
      localStorage.setItem('ingredientsData', JSON.stringify(dataPayload.ingredientsData));
    }
    if (dataPayload.presetsData !== undefined) {
      localStorage.setItem('presetsData', JSON.stringify(dataPayload.presetsData));
    }
  } catch (err) {
    console.warn('[Sync] Errore salvataggio localStorage locale:', err);
  }

  // 2. Se Firebase è configurato, salva su Firestore
  if (isFirebaseConfigured && db) {
    try {
      const roomRef = doc(db, 'stanze', roomCode);
      await setDoc(roomRef, {
        ...dataPayload,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error('[Firebase] Errore durante il salvataggio su Firestore:', err);
      throw err;
    }
  }
}

// Sottoscrive gli aggiornamenti in tempo reale con onSnapshot
export function subscribeToRoom(roomCode, onDataReceived) {
  if (!roomCode || !isFirebaseConfigured || !db) {
    return () => {};
  }

  const roomRef = doc(db, 'stanze', roomCode);
  const unsubscribe = onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      const remoteData = snapshot.data();
      onDataReceived(remoteData);
    } else {
      // La stanza non esiste ancora su Firestore: la creiamo con i dati locali attuali
      try {
        const localDiet = JSON.parse(localStorage.getItem('dietData') || '{}');
        const localRecipes = JSON.parse(localStorage.getItem('recipeData') || '[]');
        const localIngredients = JSON.parse(localStorage.getItem('ingredientsData') || '[]');
        const localPresets = JSON.parse(localStorage.getItem('presetsData') || '[]');

        setDoc(roomRef, {
          dietData: localDiet,
          recipeData: localRecipes,
          ingredientsData: localIngredients,
          presetsData: localPresets,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(e => console.error('[Firebase] Errore inizializzazione stanza:', e));
      } catch (e) {
        console.error('[Firebase] Errore lettura dati locali per init stanza:', e);
      }
    }
  }, (error) => {
    console.error('[Firebase] Errore listener stanza onSnapshot:', error);
  });

  return unsubscribe;
}
