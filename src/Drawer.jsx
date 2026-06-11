export default function Drawer({ isOpen, onClose, currentView, setView }) {
  if (!isOpen) return null;

  const navigate = (newView) => {
    setView(newView);
    onClose();
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <div className="drawer-panel">
        <div className="drawer-header">
          <h2>Menù</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <nav className="drawer-nav">
          <button 
            className={`drawer-item ${currentView === 'calendar' ? 'active' : ''}`}
            onClick={() => navigate('calendar')}
          >
            📅 Calendario Settimanale
          </button>
          <button 
            className={`drawer-item ${currentView === 'recipes' ? 'active' : ''}`}
            onClick={() => navigate('recipes')}
          >
            📖 Ricettario
          </button>
          <button 
            className={`drawer-item ${currentView === 'presets' ? 'active' : ''}`}
            onClick={() => navigate('presets')}
          >
            💾 Preset Settimanali
          </button>
        </nav>
      </div>
    </>
  );
}
