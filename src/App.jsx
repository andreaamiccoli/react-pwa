import { useState, useEffect } from 'react'
import './App.css'
import RecipePage from './RecipePage.jsx'
import Drawer from './Drawer.jsx'
import PresetsPage from './PresetsPage.jsx'
import BackupPage from './BackupPage.jsx'
import ToastContainer, { showToast } from './Toast.jsx'
import ConfirmModal from './ConfirmModal.jsx'

// --- Dati di default per la prima apertura ---
const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

const MEALS = [
  { key: 'colazione',      label: 'Colazione',           icon: '☕' },
  { key: 'spuntino',       label: 'Spuntino di Metà Mattina', icon: '🍎' },
  { key: 'pranzo',         label: 'Pranzo',               icon: '🍽️' },
  { key: 'merenda',        label: 'Merenda',              icon: '🥪' },
  { key: 'cena',           label: 'Cena',                 icon: '🌙' },
]

const buildDefaultData = () => {
  const data = {}
  DAYS.forEach(day => {
    data[day] = {
      description: '',
      meals: {
        colazione: '', spuntino: '', pranzo: '', merenda: '', cena: '',
      }
    }
  })
  return data
}

// Helper: normalizza i dati vecchi per supportare recipeId e text
const normalizeMeals = (data) => {
  const normalized = {}
  for (const day of DAYS) {
    normalized[day] = { description: data[day]?.description || '', meals: {} }
    for (const m of MEALS) {
      const val = data[day]?.meals?.[m.key]
      if (typeof val === 'string') {
        normalized[day].meals[m.key] = { text: val, recipeId: null, recipeName: null }
      } else if (val && typeof val === 'object') {
        normalized[day].meals[m.key] = { text: val.text || '', recipeId: val.recipeId || null, recipeName: val.recipeName || null }
      } else {
        normalized[day].meals[m.key] = { text: '', recipeId: null, recipeName: null }
      }
    }
  }
  return normalized
}

const loadData = () => {
  try {
    const saved = localStorage.getItem('dietData')
    if (saved) return normalizeMeals(JSON.parse(saved))
  } catch (e) { }
  return normalizeMeals(buildDefaultData())
}

const loadPresets = () => {
  try {
    const saved = localStorage.getItem('presetsData')
    if (saved) return JSON.parse(saved)
  } catch(e) {}
  return []
}

export default function App() {
  const [view, setView]               = useState('calendar') // calendar | recipes | presets
  const [drawerOpen, setDrawerOpen]   = useState(false)
  
  const [selectedDay, setSelectedDay] = useState(DAYS[0])
  const [dietData, setDietData]       = useState(loadData)
  const [presets, setPresets]         = useState(loadPresets)
  
  const [isEditing, setIsEditing]     = useState(false)
  const [tempData, setTempData]       = useState(null)
  
  // Stato per Recipe Selector e Bottom Sheet
  const [selectingMealKey, setSelectingMealKey] = useState(null)
  const [viewingRecipe, setViewingRecipe] = useState(null) // ID della ricetta da visualizzare nel bottom sheet
  const [allRecipes, setAllRecipes]   = useState([])

  // Conferme Modali
  const [confirmUnsavedChanges, setConfirmUnsavedChanges] = useState(null) // callback function se true

  useEffect(() => {
    localStorage.setItem('dietData', JSON.stringify(dietData))
  }, [dietData])

  useEffect(() => {
    localStorage.setItem('presetsData', JSON.stringify(presets))
  }, [presets])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recipeData')
      if (saved) setAllRecipes(JSON.parse(saved))
    } catch(e) {}
  }, [view, selectingMealKey, viewingRecipe])

  // --- Funzioni Navigazione ---
  const handleNavChange = (newView) => {
    if (isEditing && view === 'calendar' && newView !== 'calendar') {
      setConfirmUnsavedChanges(() => () => {
        setIsEditing(false);
        setTempData(null);
        setView(newView);
      });
      return;
    }
    setView(newView);
  }

  // --- Funzioni Calendario UI ---
  const handleSelectDay = (day) => {
    if (isEditing) {
      setConfirmUnsavedChanges(() => () => {
        setIsEditing(false);
        setTempData(null);
        setSelectedDay(day);
      });
      return;
    }
    setSelectedDay(day)
  }

  const handleEdit = () => {
    setTempData(JSON.parse(JSON.stringify(dietData[selectedDay])))
    setIsEditing(true)
  }

  const handleSave = () => {
    setDietData(prev => ({ ...prev, [selectedDay]: tempData }))
    setIsEditing(false)
    setTempData(null)
    showToast('Giorno salvato!', 'success')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTempData(null)
  }

  const handleChange = (field, value) => {
    setTempData(prev => ({ ...prev, [field]: value }))
  }

  const handleMealChangeText = (mealKey, textValue) => {
    setTempData(prev => ({
      ...prev,
      meals: { ...prev.meals, [mealKey]: { ...prev.meals[mealKey], text: textValue } }
    }))
  }

  const handleAssignRecipe = (recipe) => {
    setTempData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [selectingMealKey]: { ...prev.meals[selectingMealKey], recipeId: recipe.id, recipeName: recipe.name }
      }
    }))
    setSelectingMealKey(null)
  }

  const handleRemoveRecipe = (mealKey) => {
    setTempData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealKey]: { ...prev.meals[mealKey], recipeId: null, recipeName: null }
      }
    }))
  }

  // Presets load handling (passed to PresetsPage)
  const executePresetLoad = (presetData) => {
    setDietData(presetData);
    setView('calendar'); // torna al calendario se era in preset
  };

  const handleLoadPresetReq = (presetData) => {
    if (isEditing) {
      setConfirmUnsavedChanges(() => () => {
        setIsEditing(false);
        setTempData(null);
        executePresetLoad(presetData);
      });
    } else {
      executePresetLoad(presetData);
    }
  }

  const currentData = isEditing ? tempData : dietData[selectedDay]
  const viewTitle = view === 'calendar' ? 'Dieta Settimanale' : (view === 'recipes' ? 'Ricettario' : (view === 'presets' ? 'Preset' : 'Impostazioni'));
  const recipeToView = viewingRecipe ? allRecipes.find(r => r.id === viewingRecipe) : null;

  return (
    <div className="app">
      {/* ===== NOTIFICHE E NAV ===== */}
      <ToastContainer />
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} currentView={view} setView={handleNavChange} />

      {/* ===== HEADER GLOBALE ===== */}
      <header className="app-header header-flex-3col">
        <button className="nav-btn" onClick={() => setDrawerOpen(true)}>☰</button>
        <h1 className="app-title">{viewTitle}</h1>
        <div className="header-right-action">
          {view === 'calendar' && !isEditing && (
            <button className="nav-btn action-icon" onClick={handleEdit}>✏️</button>
          )}
          {view === 'calendar' && isEditing && (
            <button className="nav-btn action-icon text-success" onClick={handleSave}>✓</button>
          )}
        </div>
      </header>

      {/* ===== VIEWS ===== */}
      {view === 'presets' && (
        <PresetsPage 
          presets={presets} setPresets={setPresets} 
          currentDietData={dietData} onLoadPreset={handleLoadPresetReq} 
        />
      )}

      {view === 'backup' && (
        <BackupPage />
      )}

      {view === 'recipes' && (
        <RecipePage />
      )}

      {view === 'calendar' && (
        <>
          {/* ===== MENU GIORNI ===== */}
          <nav className="days-nav">
            <div className="days-scroll">
              {DAYS.map(day => (
                <button
                  key={day}
                  className={`day-btn ${selectedDay === day ? 'day-btn--active' : ''}`}
                  onClick={() => handleSelectDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </nav>

          {/* ===== CONTENUTO DEL GIORNO ===== */}
          <main className="day-content">
            <div className="day-hero">
              <h2 className="day-name">{selectedDay}</h2>
              {isEditing ? (
                <textarea
                  className="input-description"
                  placeholder="Aggiungi una nota per questo giorno..."
                  value={currentData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  rows={2}
                />
              ) : (
                <p className="day-description">
                  {currentData.description || <span className="placeholder-text">Nessuna nota per questo giorno</span>}
                </p>
              )}
            </div>

            <div className="meals-list">
              {MEALS.map(meal => (
                <div key={meal.key} className="meal-card">
                  <div className="meal-header">
                    <span className="meal-icon">{meal.icon}</span>
                    <span className="meal-label">{meal.label}</span>
                  </div>

                  {isEditing ? (
                    <div className="meal-edit-container">
                      {currentData.meals[meal.key].recipeId ? (
                        <div className="attached-recipe-badge">
                          <span className="badge-icon">📖</span>
                          <span className="badge-text">{currentData.meals[meal.key].recipeName}</span>
                          <button className="badge-close" onClick={() => handleRemoveRecipe(meal.key)}>✕</button>
                        </div>
                      ) : (
                        <button className="btn btn--edit small-py mb-2 w-full" onClick={() => setSelectingMealKey(meal.key)}>
                          + Aggiungi dal Ricettario
                        </button>
                      )}
                      
                      <textarea
                        className="input-meal"
                        placeholder={`Note manuali per ${meal.label.toLowerCase()}...`}
                        value={currentData.meals[meal.key].text || ''}
                        onChange={e => handleMealChangeText(meal.key, e.target.value)}
                        rows={2}
                      />
                    </div>
                  ) : (
                    <div className="meal-content">
                      {currentData.meals[meal.key].recipeId && (
                        <div className="recipe-link" onClick={() => setViewingRecipe(currentData.meals[meal.key].recipeId)}>
                          <span className="recipe-link-icon">📖</span> Apri ricetta: <strong>{currentData.meals[meal.key].recipeName}</strong>
                        </div>
                      )}
                      {currentData.meals[meal.key].text ? (
                        <p className="meal-text-note mt-2">{currentData.meals[meal.key].text}</p>
                      ) : (
                        !currentData.meals[meal.key].recipeId && <span className="placeholder-text">Non ancora pianificato</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pulsanti Save/Cancel Floating (se in edit) */}
            {isEditing && (
              <div className="floating-action-bar">
                <button className="btn btn--cancel" onClick={handleCancel}>✕ Annulla</button>
                <button className="btn btn--save" onClick={handleSave}>✓ Salva Giorno</button>
              </div>
            )}
          </main>
        </>
      )}

      {/* ===== MODALS ===== */}
      <ConfirmModal
        isOpen={!!confirmUnsavedChanges}
        title="Modifiche non salvate"
        message="Hai delle modifiche in corso. Se continui andranno perse. Vuoi scartare le modifiche?"
        confirmText="Scarta Modifiche"
        onConfirm={() => {
          confirmUnsavedChanges();
          setConfirmUnsavedChanges(null);
        }}
        onCancel={() => setConfirmUnsavedChanges(null)}
      />

      {/* Selettore Ricetta Modal */}
      {selectingMealKey && (
        <div className="recipe-modal-overlay">
          <div className="recipe-modal day-content">
            <h2 className="day-name">Scegli una Ricetta</h2>
            <div className="modal-scroll">
              {allRecipes.length === 0 ? (
                <p className="placeholder-text">Nessuna ricetta salvata. Vai nel Ricettario.</p>
              ) : (
                <div className="recipes-grid">
                  {allRecipes.map(r => (
                    <div key={r.id} className="meal-card recipe-card selector-card" onClick={() => handleAssignRecipe(r)}>
                      <h3 className="recipe-name">{r.name}</h3>
                      <span className="recipe-badge">{r.dishType}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="action-bar mt-auto">
              <button className="btn btn--cancel" onClick={() => setSelectingMealKey(null)}>✕ Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet Ricetta */}
      {viewingRecipe && (
        <div className="bottom-sheet-overlay" onClick={() => setViewingRecipe(null)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-drag-handle"></div>
            {recipeToView ? (
              <div className="bottom-sheet-content">
                <h2 className="recipe-name mb-2">{recipeToView.name}</h2>
                <span className="recipe-badge mb-3 inline-block">{recipeToView.dishType}</span>
                
                <div className="recipe-nutri mb-3">
                  <span>🔥 {recipeToView.nutrition?.calories || 0} kcal</span>
                  <span>🥩 {recipeToView.nutrition?.protein || 0}g P</span>
                  <span>🍞 {recipeToView.nutrition?.carbs || 0}g C</span>
                  <span>🥑 {recipeToView.nutrition?.fat || 0}g F</span>
                </div>

                {recipeToView.ingredients?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="mb-2 text-accent">Ingredienti</h4>
                    <ul className="ingredient-list">
                      {recipeToView.ingredients.map((ing, i) => (
                        <li key={i}><strong>{ing.name}</strong> <span className="text-secondary">{ing.quantity}</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                {recipeToView.instructions && (
                  <div className="mb-3">
                    <h4 className="mb-2 text-accent">Preparazione</h4>
                    <p className="meal-text-note">{recipeToView.instructions}</p>
                  </div>
                )}
                
                <button className="btn btn--cancel w-full mt-3" onClick={() => setViewingRecipe(null)}>Chiudi</button>
              </div>
            ) : (
              <p>Ricetta non trovata o eliminata.</p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
