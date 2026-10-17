import React from 'react';

export default function YazioMealCard({
  meal,
  mealData,
  mealMacros,
  isEditing,
  onStartEdit,
  onAddRecipe,
  onAskAi,
  onUpdateServings,
  onRemoveRecipe,
  onTextChange,
  onSave,
  onCancel,
  onViewRecipe
}) {
  const calories = Math.round(mealMacros?.calories || 0);
  const recipes = mealData?.recipes || [];

  return (
    <div className={`yazio-meal-card ${isEditing ? 'yazio-meal-card--editing' : ''}`}>
      {/* Header pasto: Titolo a sinistra, Totale Calorie + Tasto "+" a destra */}
      <div className="yazio-meal-header">
        <div className="yazio-meal-title-group">
          <span className="yazio-meal-label">{meal.label}</span>
          <span className="yazio-meal-cals">{calories} kcal</span>
        </div>

        <div className="yazio-meal-header-actions">
          <button
            type="button"
            className="yazio-add-btn"
            onClick={onStartEdit}
            title={`Aggiungi o modifica alimenti in ${meal.label}`}
          >
            +
          </button>
        </div>
      </div>

      {/* Modalità Modifica Aperta */}
      {isEditing ? (
        <div className="yazio-meal-edit-body">
          {/* Badge alimenti / ricette già assegnate */}
          {recipes.length > 0 && (
            <div className="attached-recipes-list mb-3">
              {recipes.map(rRef => {
                const servings = parseInt(rRef.servings) || 1;
                const isAi = rRef.type === 'ai_estimate';
                return (
                  <div key={rRef.id} className="attached-recipe-badge flex-wrap-mobile">
                    <span className="badge-icon">{isAi ? '🤖' : '📖'}</span>
                    <span className="badge-text">{rRef.name}</span>
                    
                    <div className="badge-servings-control">
                      <button 
                        type="button"
                        className="badge-servings-btn"
                        onClick={() => onUpdateServings(rRef.id, -1)}
                      >−</button>
                      <span className="badge-servings-val">{servings} p.</span>
                      <button 
                        type="button"
                        className="badge-servings-btn"
                        onClick={() => onUpdateServings(rRef.id, 1)}
                      >+</button>
                    </div>

                    <button 
                      type="button" 
                      className="badge-close ml-1" 
                      onClick={() => onRemoveRecipe(rRef.id)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Azioni rapide di aggiunta */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button 
              type="button" 
              className="btn btn--edit small-py flex-1" 
              onClick={onAddRecipe}
            >
              📖 Da Ricettario
            </button>
            <button 
              type="button" 
              className="btn btn--edit small-py flex-1" 
              style={{ borderColor: 'var(--accent-light)' }} 
              onClick={onAskAi}
            >
              ✨ Chiedi a IA
            </button>
          </div>

          <textarea
            className="input-meal"
            placeholder={`Note o cibi liberi per ${meal.label.toLowerCase()}...`}
            value={mealData.text || ''}
            onChange={e => onTextChange(e.target.value)}
            rows={2}
          />

          <div className="action-bar" style={{ marginTop: '12px' }}>
            <button type="button" className="btn btn--cancel" onClick={onCancel}>
              Annulla
            </button>
            <button type="button" className="btn btn--save" onClick={onSave}>
              ✓ Salva Pasto
            </button>
          </div>
        </div>
      ) : (
        /* Modalità Visualizzazione Compatta Stile Yazio */
        <div className="yazio-meal-view-body">
          {recipes.length > 0 ? (
            <div className="yazio-meal-items-list">
              {recipes.map(rRef => {
                const servings = parseInt(rRef.servings) || 1;
                const isAi = rRef.type === 'ai_estimate';
                return (
                  <div 
                    key={rRef.id} 
                    className="yazio-meal-item-row"
                    onClick={() => onViewRecipe(isAi ? rRef : rRef.id, servings)}
                  >
                    <span className="yazio-item-name">
                      {isAi ? '🤖 ' : '🍽️ '}{rRef.name}
                      {servings > 1 && <span className="inline-servings-badge">({servings} porz.)</span>}
                    </span>
                    <span className="yazio-item-arrow">›</span>
                  </div>
                );
              })}
            </div>
          ) : (
            !mealData.text && (
              <div className="yazio-meal-empty-hint" onClick={onStartEdit}>
                <span>Nessun alimento registrato. Tocca + per aggiungere</span>
              </div>
            )
          )}

          {mealData.text && (
            <p className="meal-text-note mt-2">{mealData.text}</p>
          )}

          {/* Micro-macro del pasto in basso */}
          {(mealMacros?.protein > 0 || mealMacros?.carbs > 0 || mealMacros?.fat > 0) && (
            <div className="yazio-meal-macro-pills">
              <span>Carb {mealMacros.carbs}g</span>
              <span>Prot {mealMacros.protein}g</span>
              <span>Gras {mealMacros.fat}g</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
