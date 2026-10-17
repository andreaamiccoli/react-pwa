import { useState } from 'react';

// Genera un codice casuale tipo CASA-9482
export const generateRandomRoomCode = () => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CASA-${num}`;
};

// Pulisce e trasforma in maiuscolo
export const sanitizeRoomCode = (raw) => {
  if (!raw) return '';
  return raw
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_-]/g, '');
};

export default function RoomModal({ isOpen, currentCode, onConfirm, onClose, isDismissable = false }) {
  const [code, setCode] = useState(currentCode || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleApply = (targetCode) => {
    const sanitized = sanitizeRoomCode(targetCode || code);
    if (!sanitized || sanitized.length < 3) {
      setError('Inserisci un codice valido (almeno 3 caratteri)');
      return;
    }
    setError('');
    onConfirm(sanitized);
  };

  const handleGenerate = () => {
    const generated = generateRandomRoomCode();
    setCode(generated);
    handleApply(generated);
  };

  return (
    <div className="bottom-sheet-overlay" style={{ zIndex: 3000 }}>
      <div 
        className="bottom-sheet" 
        style={{ 
          maxWidth: '460px', 
          margin: 'auto', 
          borderRadius: 'var(--radius-lg)',
          maxHeight: 'none',
          paddingBottom: '24px'
        }}
      >
        <div className="bottom-sheet-handle" />
        <h3 className="confirm-title" style={{ textAlign: 'left', marginBottom: '6px' }}>
          🏠 Stanza Condivisa
        </h3>
        <p className="text-secondary" style={{ fontSize: '0.88rem', marginBottom: '18px', lineHeight: 1.5 }}>
          Condividi lo stesso piano settimanale, ricettario e ingredienti in tempo reale con chi vuoi usando un codice stanza.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase' }}>
              Codice Stanza
            </label>
            <input 
              type="text"
              placeholder="ES. CASA-1234"
              value={code}
              onChange={(e) => {
                setCode(sanitizeRoomCode(e.target.value));
                setError('');
              }}
              className="input-description mt-2"
              style={{ 
                letterSpacing: '2px', 
                fontWeight: 700, 
                fontSize: '1.05rem', 
                textAlign: 'center',
                textTransform: 'uppercase'
              }}
              autoFocus
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button 
              type="button" 
              className="btn btn--save" 
              onClick={() => handleApply(code)}
              style={{ flex: 1.3 }}
            >
              ✓ Entra nella Stanza
            </button>
            <button 
              type="button" 
              className="btn btn--edit" 
              onClick={handleGenerate}
              style={{ flex: 1, whiteSpace: 'nowrap', fontSize: '0.82rem' }}
              title="Genera un nuovo codice casuale"
            >
              ✨ Crea Nuova
            </button>
          </div>

          {isDismissable && onClose && (
            <button 
              type="button" 
              className="btn btn--cancel" 
              onClick={onClose}
              style={{ marginTop: '4px' }}
            >
              Annulla
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
