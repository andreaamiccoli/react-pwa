import { useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal.jsx';
import { showToast } from './Toast.jsx';

export default function BackupPage() {
  const fileInputRef = useRef(null);
  const [confirmRestoreData, setConfirmRestoreData] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');

  const handleSaveApiKey = () => {
    localStorage.setItem('geminiApiKey', apiKey.trim());
    showToast('Chiave API Gemini salvata!', 'success');
  };

  const handleExport = () => {
    try {
      // Raccoglie i dati dal localStorage
      const dietData = localStorage.getItem('dietData') || '{}';
      const recipeData = localStorage.getItem('recipeData') || '[]';
      const presetsData = localStorage.getItem('presetsData') || '[]';

      const backupObj = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          dietData: JSON.parse(dietData),
          recipeData: JSON.parse(recipeData),
          presetsData: JSON.parse(presetsData)
        }
      };

      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Crea un link temporaneo per il download
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `dieta-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Backup esportato con successo!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Errore durante l\'esportazione.', 'danger');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.data || !parsed.data.dietData) {
          showToast('File di backup non valido.', 'danger');
          return;
        }
        // Mostra il modal di conferma prima di procedere
        setConfirmRestoreData(parsed.data);
      } catch (err) {
        showToast('Errore nella lettura del file JSON.', 'danger');
      }
    };
    reader.onloadend = () => {
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const executeRestore = () => {
    try {
      if (confirmRestoreData.dietData) localStorage.setItem('dietData', JSON.stringify(confirmRestoreData.dietData));
      if (confirmRestoreData.recipeData) localStorage.setItem('recipeData', JSON.stringify(confirmRestoreData.recipeData));
      if (confirmRestoreData.presetsData) localStorage.setItem('presetsData', JSON.stringify(confirmRestoreData.presetsData));
      
      setConfirmRestoreData(null);
      // Ricarica l'intera app per far rileggere i dati a tutti i componenti
      window.location.reload();
    } catch (err) {
      showToast('Errore durante il ripristino.', 'danger');
      setConfirmRestoreData(null);
    }
  };

  return (
    <div className="day-content">
      <div className="day-hero mb-4">
        <h2 className="day-name">Backup & Impostazioni</h2>
        <p className="day-description">
          Salva una copia dei dati o configura l'integrazione con l'Intelligenza Artificiale per l'importazione automatica delle ricette.
        </p>
      </div>

      <div className="meal-card recipe-card mb-4">
        <h3 className="recipe-name text-accent mb-2">Esporta Dati</h3>
        <p className="recipe-meta mb-3">Scarica un file contenente tutti i tuoi dati attuali.</p>
        <button className="btn btn--save" onClick={handleExport}>📥 Scarica Backup</button>
      </div>

      <div className="meal-card recipe-card mb-4">
        <h3 className="recipe-name text-danger mb-2">Importa Dati</h3>
        <p className="recipe-meta mb-3">
          Ripristina i dati da un file di backup precedente. <br/>
          <strong>Attenzione:</strong> questa operazione cancellerà i dati attuali!
        </p>
        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
        />
        <button className="btn btn--edit" onClick={handleImportClick}>📤 Carica Backup</button>
      </div>

      <div className="meal-card recipe-card">
        <h3 className="recipe-name text-accent mb-2">Configurazione IA (Gemini API)</h3>
        <p className="recipe-meta mb-3">
          Configura una o più chiavi API (separate da virgola) per abilitare le funzioni intelligenti. 
          Usando più chiavi, il sistema le ruoterà automaticamente per aggirare i limiti di utilizzo.
          La chiave rimarrà salvata esclusivamente in questo browser.
          <br />
          <a 
            href="https://aistudio.google.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#00adb5', textDecoration: 'underline', display: 'inline-block', marginTop: '6px' }}
          >
            Ottieni le chiavi API Gemini gratuite ↗
          </a>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input 
            type="password" 
            placeholder="Incolla le API Key separate da virgola..." 
            value={apiKey} 
            onChange={e => setApiKey(e.target.value)} 
            className="input-description"
          />
          <button className="btn btn--save" onClick={handleSaveApiKey}>Salva Chiave API</button>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmRestoreData}
        title="Conferma Ripristino"
        message="Sei sicuro di voler ripristinare questo backup? TUTTI i dati attualmente presenti sul dispositivo verranno eliminati e sostituiti irreversibilmente da quelli del file."
        confirmText="Sì, Ripristina"
        onConfirm={executeRestore}
        onCancel={() => setConfirmRestoreData(null)}
      />
    </div>
  );
}
