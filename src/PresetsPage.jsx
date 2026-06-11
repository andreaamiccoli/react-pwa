import { useState } from 'react';
import ConfirmModal from './ConfirmModal.jsx';
import { showToast } from './Toast.jsx';

export default function PresetsPage({ presets, setPresets, currentDietData, onLoadPreset }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmLoadId, setConfirmLoadId] = useState(null);

  const handleSaveCurrent = () => {
    // Uso un modal custom o un prompt (per semplicità uso un custom alert)
    const name = window.prompt("Dai un nome a questa settimana (es. 'Massa', 'Scarico'):");
    if (!name) return;
    setPresets(prev => [...prev, { id: Date.now().toString(), name, data: currentDietData }]);
    showToast("Settimana salvata tra i Preset!", 'success');
  };

  const executeDelete = () => {
    setPresets(prev => prev.filter(p => p.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    showToast("Preset eliminato.", 'success');
  };

  const executeLoad = () => {
    const selected = presets.find(p => p.id === confirmLoadId);
    if (selected) {
      onLoadPreset(selected.data);
      showToast(`Settimana "${selected.name}" caricata!`, 'success');
    }
    setConfirmLoadId(null);
  };

  return (
    <div className="page-container day-content">
      <div className="presets-header-actions mb-3">
        <button className="btn btn--edit" onClick={handleSaveCurrent}>
          💾 Salva la settimana attuale
        </button>
      </div>

      <div className="recipes-grid">
        {presets.length === 0 ? (
          <p className="placeholder-text text-center mt-4">Nessun preset salvato. Salva la settimana attuale per iniziare.</p>
        ) : (
          presets.map(p => (
            <div key={p.id} className="meal-card recipe-card">
              <h3 className="recipe-name">{p.name}</h3>
              <p className="recipe-meta mb-2">Preset Settimanale</p>
              <div className="action-bar mt-auto">
                <button className="btn btn--save small-py" onClick={() => setConfirmLoadId(p.id)}>🔄 Carica</button>
                <button className="btn btn--cancel small-py" onClick={() => setConfirmDeleteId(p.id)}>🗑️ Elimina</button>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Elimina Preset"
        message="Sei sicuro di voler eliminare questo preset?"
        confirmText="Elimina"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmModal
        isOpen={!!confirmLoadId}
        title="Carica Preset"
        message="Attenzione: questa azione sovrascriverà l'intera settimana corrente (Lunedì-Domenica) con i dati del preset. Vuoi procedere?"
        confirmText="Carica"
        onConfirm={executeLoad}
        onCancel={() => setConfirmLoadId(null)}
      />
    </div>
  );
}
