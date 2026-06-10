import { useState, useEffect } from 'react'
import './App.css'
import RecipePage from './RecipePage.jsx'

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
        colazione: '',
        spuntino: '',
        pranzo: '',
        merenda: '',
        cena: '',
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

// Helper: leggi da localStorage
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

// --- Componente principale ---
export default function App() {
  const [view, setView]               = useState('calendar')
  const [selectedDay, setSelectedDay] = useState(DAYS[0])
  const [dietData, setDietData]       = useState(loadData)
  const [presets, setPresets]         = useState(loadPresets)
  
  const [isEditing, setIsEditing]     = useState(false)
  const [tempData, setTempData]       = useState(null)
  
  // Stato per il RecipeSelector modale
  const [selectingMealKey, setSelectingMealKey] = useState(null)
  const [allRecipes, setAllRecipes]   = useState([])

  // Salva automaticamente dietData e presets
  useEffect(() => {
    localStorage.setItem('dietData', JSON.stringify(dietData))
  }, [dietData])

  useEffect(() => {
    localStorage.setItem('presetsData', JSON.stringify(presets))
  }, [presets])

  // Ricarica le ricette quando si torna al calendario o si apre il selettore
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recipeData')
      if (saved) setAllRecipes(JSON.parse(saved))
    } catch(e) {}
  }, [view, selectingMealKey])

  // --- Funzioni UI ---
  const handleSelectDay = (day) => {
    if (isEditing) {
      const confirm = window.confirm('Hai modifiche non salvate. Vuoi uscire senza salvare?')
      if (!confirm) return
      setIsEditing(false)
      setTempData(null)
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
      meals: { 
        ...prev.meals, 
        [mealKey]: { ...prev.meals[mealKey], text: textValue } 
      }
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

  // --- Funzioni per Presets ---
  const handleSavePreset = () => {
    const name = window.prompt("Dai un nome a questa settimana (es. 'Massa', 'Scarico'):")
    if (!name) return
    setPresets(prev => [...prev, { id: Date.now().toString(), name, data: dietData }])
    window.alert("Settimana salvata tra i Preset!")
  }

  const handleLoadPreset = (preset) => {
    if (isEditing) {
      if (!window.confirm("Hai modifiche non salvate. Vuoi scartarle e caricare la settimana preimpostata?")) return
      setIsEditing(false)
      setTempData(null)
    } else {
      if (!window.confirm(`Vuoi davvero sovrascrivere l'intera settimana corrente con il preset "${preset.name}"?`)) return
    }
    setDietData(preset.data)
  }

  const handleDeletePreset = (id) => {
    if (window.confirm("Vuoi eliminare questo preset?")) {
      setPresets(prev => prev.filter(p => p.id !== id))
    }
  }

  const currentData = isEditing ? tempData : dietData[selectedDay]

  return (
    <div className="app">
      {/* ===== HEADER ===== */}
      <header className="app-header header-flex">
        <button 
          className="nav-btn" 
          onClick={() => setView(view === 'calendar' ? 'recipes' : 'calendar')}
        >
          {view === 'calendar' ? '📖' : '📅'}
        </button>
        <h1 className="app-title">{view === 'calendar' ? 'Dieta Settimanale' : 'Ricettario'}</h1>
      </header>

      {view === 'calendar' ? (
        <>
          {/* ===== SETTIMANE PREIMPOSTATE ===== */}
          <div className="presets-bar">
            <button className="btn btn--edit small-py" onClick={handleSavePreset}>💾 Salva Settimana</button>
            
            {presets.length > 0 && (
              <div className="presets-dropdown-wrapper">
                <select 
                  className="input-description" 
                  onChange={(e) => {
                    const selected = presets.find(p => p.id === e.target.value);
                    if(selected) { handleLoadPreset(selected); e.target.value = ""; }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Carica Settimana...</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

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

            {/* Titolo e descrizione del giorno */}
            <div className="day-hero">
              <h2 className="day-name">{selectedDay}</h2>
              {isEditing ? (
                <textarea
                  className="input-description"
                  placeholder="Aggiungi una nota per questo giorno... (es. Giorno di sgarro, Giorno di riposo...)"
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

            {/* Pulsanti Modifica / Salva / Annulla */}
            <div className="action-bar">
              {isEditing ? (
                <>
                  <button className="btn btn--save" onClick={handleSave}>✓ Salva</button>
                  <button className="btn btn--cancel" onClick={handleCancel}>✕ Annulla</button>
                </>
              ) : (
                <button className="btn btn--edit" onClick={handleEdit}>✏️ Modifica Giorno</button>
              )}
            </div>

            {/* Lista dei pasti */}
            <div className="meals-list">
              {MEALS.map(meal => (
                <div key={meal.key} className="meal-card">
                  <div className="meal-header">
                    <span className="meal-icon">{meal.icon}</span>
                    <span className="meal-label">{meal.label}</span>
                  </div>

                  {isEditing ? (
                    <div className="meal-edit-container">
                      {/* Assegnazione Ricetta */}
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
                        <div className="recipe-link" onClick={() => setView('recipes')}>
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
          </main>

          {/* Modal Selezione Ricetta */}
          {selectingMealKey && (
            <div className="recipe-modal-overlay">
              <div className="recipe-modal day-content">
                <h2 className="day-name">Scegli una Ricetta</h2>
                <div className="modal-scroll">
                  {allRecipes.length === 0 ? (
                    <p className="placeholder-text">Nessuna ricetta salvata. Vai nel Ricettario per aggiungerne una.</p>
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
        </>
      ) : (
        <RecipePage />
      )}
    </div>
  )
}
