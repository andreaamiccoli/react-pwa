import React from 'react';

export default function YazioDateSelector({ days, selectedDay, onSelectDay }) {
  const currentIndex = days.indexOf(selectedDay);

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + days.length) % days.length;
    onSelectDay(days[prevIndex]);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % days.length;
    onSelectDay(days[nextIndex]);
  };

  return (
    <div className="yazio-date-selector">
      <button 
        type="button" 
        className="yazio-date-nav-btn" 
        onClick={handlePrev} 
        aria-label="Giorno precedente"
      >
        ‹
      </button>

      <div className="yazio-date-center">
        <h2 className="yazio-date-title">{selectedDay}</h2>
        <span className="yazio-date-subtitle">Pianificazione Giornaliera</span>
      </div>

      <button 
        type="button" 
        className="yazio-date-nav-btn" 
        onClick={handleNext} 
        aria-label="Giorno successivo"
      >
        ›
      </button>
    </div>
  );
}
