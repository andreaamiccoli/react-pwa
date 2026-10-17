import React from 'react';

// Donut Chart circolare stile Yazio con archi progressivi
export default function YazioSummaryCard({ dayMacros, targetCalories, onOpenTargets }) {
  const eaten = Math.round(dayMacros?.calories || 0);
  const target = targetCalories ? Math.round(parseFloat(targetCalories)) : 2000;
  const remaining = Math.max(0, target - eaten);
  const burned = 0; // Sezione bruciate / allenamento per compatibilità futura

  // Macro grammi attuali
  const carbs = Math.round(dayMacros?.carbs || 0);
  const protein = Math.round(dayMacros?.protein || 0);
  const fat = Math.round(dayMacros?.fat || 0);

  // Target stimati dei macro basati sulle calorie target (50% Carb, 25% Prot, 25% Fat) o custom
  const targetCarbs = Math.round((target * 0.50) / 4);
  const targetProtein = Math.round((target * 0.25) / 4);
  const targetFat = Math.round((target * 0.25) / 9);

  // Percentuali di completamento
  const pctCarbs = Math.min(100, Math.round((carbs / (targetCarbs || 1)) * 100));
  const pctProtein = Math.min(100, Math.round((protein / (targetProtein || 1)) * 100));
  const pctFat = Math.min(100, Math.round((fat / (targetFat || 1)) * 100));

  // Geometria anello principale circolare SVG
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const ratioEaten = target > 0 ? Math.min(1, eaten / target) : 0;
  const strokeDashoffset = circumference - (ratioEaten * circumference);

  return (
    <div className="yazio-summary-card">
      <div className="yazio-summary-header">
        <span className="yazio-summary-title">Riepilogo</span>
        <button 
          type="button" 
          className="yazio-summary-action" 
          onClick={onOpenTargets}
        >
          Dettagli / Target
        </button>
      </div>

      <div className="yazio-donut-container">
        {/* Stat Sinistra: Mangiate */}
        <div className="yazio-stat-col">
          <div className="yazio-stat-num">{eaten}</div>
          <div className="yazio-stat-label">Mangiate</div>
        </div>

        {/* Centro: Anello Circolare Calorie Rimanenti */}
        <div className="yazio-donut-wrap">
          <svg className="yazio-donut-svg" viewBox="0 0 140 140">
            {/* Sfondo anello */}
            <circle
              className="yazio-donut-bg"
              cx="70"
              cy="70"
              r={radius}
            />
            {/* Arco progressivo ciano / teal Yazio */}
            <circle
              className="yazio-donut-progress"
              cx="70"
              cy="70"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="yazio-donut-center">
            <span className="yazio-donut-val">{remaining}</span>
            <span className="yazio-donut-sub">Rimanenti</span>
          </div>
        </div>

        {/* Stat Destra: Bruciate */}
        <div className="yazio-stat-col">
          <div className="yazio-stat-num">{burned}</div>
          <div className="yazio-stat-label">Bruciate</div>
        </div>
      </div>

      {/* Barre orizzontali dei 3 Macronutrienti */}
      <div className="yazio-macros-row">
        {/* Carboidrati */}
        <div className="yazio-macro-item">
          <span className="yazio-macro-name">Carboidrati</span>
          <div className="yazio-macro-bar-track">
            <div 
              className="yazio-macro-bar-fill yazio-bar--carbs" 
              style={{ width: `${pctCarbs}%` }}
            />
          </div>
          <span className="yazio-macro-val">{carbs} / {targetCarbs} g</span>
        </div>

        {/* Proteine */}
        <div className="yazio-macro-item">
          <span className="yazio-macro-name">Proteine</span>
          <div className="yazio-macro-bar-track">
            <div 
              className="yazio-macro-bar-fill yazio-bar--protein" 
              style={{ width: `${pctProtein}%` }}
            />
          </div>
          <span className="yazio-macro-val">{protein} / {targetProtein} g</span>
        </div>

        {/* Grassi */}
        <div className="yazio-macro-item">
          <span className="yazio-macro-name">Grassi</span>
          <div className="yazio-macro-bar-track">
            <div 
              className="yazio-macro-bar-fill yazio-bar--fat" 
              style={{ width: `${pctFat}%` }}
            />
          </div>
          <span className="yazio-macro-val">{fat} / {targetFat} g</span>
        </div>
      </div>
    </div>
  );
}
