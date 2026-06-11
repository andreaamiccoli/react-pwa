import { useState, useEffect } from 'react';

// Questa è una factory minima per Toast globale (senza dipendenze esterne complicate)
let addToastHandler = null;

export const showToast = (message, type = 'success') => {
  if (addToastHandler) addToastHandler({ id: Date.now(), message, type });
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastHandler = (toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 3000);
    };
    return () => { addToastHandler = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
