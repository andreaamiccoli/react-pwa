import { useState, useEffect } from 'react'
import './App.css'
import RecipePage, { scaleNutri, scaleQuantity } from './RecipePage.jsx'
import Drawer from './Drawer.jsx'
import PresetsPage from './PresetsPage.jsx'
import BackupPage from './BackupPage.jsx'
import ToastContainer, { showToast } from './Toast.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import { getActiveApiKey, getAiCache, setAiCache } from './aiUtils.js'

// --- Dati di default per la prima apertura ---
const DAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

const MEALS = [
  { key: 'colazione',      label: 'Colazione',           icon: '☕' },
  { key: 'spuntino',       label: 'Spuntino di Metà Mattina', icon: '🍎' },
  { key: 'pranzo',         label: 'Pranzo',               icon: '🍽️' },
  { key: 'merenda',        label: 'Merenda',              icon: '🥪' },
  { key: 'cena',           label: 'Cena',                 icon: '🌙' },
]

// Mappatura per la pertinenza delle ricette per pasto
const MEAL_PERTINENCE = {
  colazione: ['Dolce', 'Snack', 'Bevanda', 'Altro'],
  spuntino: ['Dolce', 'Snack', 'Bevanda', 'Altro'],
  pranzo: ['Primo', 'Secondo', 'Contorno', 'Dolce', 'Snack', 'Bevanda', 'Altro'],
  merenda: ['Dolce', 'Snack', 'Bevanda', 'Altro'],
  cena: ['Primo', 'Secondo', 'Contorno', 'Dolce', 'Snack', 'Bevanda', 'Altro'],
}

const buildDefaultData = () => {
  const data = {}
  DAYS.forEach(day => {
    data[day] = {
      description: '',
      targetCalories: '', // Obiettivo manuale del giorno
      meals: {
        colazione: { text: '', targetCalories: '', recipes: [] },
        spuntino: { text: '', targetCalories: '', recipes: [] },
        pranzo: { text: '', targetCalories: '', recipes: [] },
        merenda: { text: '', targetCalories: '', recipes: [] },
        cena: { text: '', targetCalories: '', recipes: [] },
      }
    }
  })
  return data
}

// Helper: normalizza i dati vecchi per supportare obiettivi, ricette multiple con porzioni e pertinenze
const normalizeMeals = (data) => {
  const normalized = {}
  for (const day of DAYS) {
    normalized[day] = { 
      description: data[day]?.description || '', 
      targetCalories: data[day]?.targetCalories || '',
      meals: {} 
    }
    for (const m of MEALS) {
      const val = data[day]?.meals?.[m.key]
      
      // Inizializza la struttura base
      let text = ''
      let targetCalories = ''
      let recipes = []

      if (typeof val === 'string') {
        text = val
      } else if (val && typeof val === 'object') {
        text = val.text || ''
        targetCalories = val.targetCalories || ''
        
        if (Array.isArray(val.recipes)) {
          recipes = val.recipes.map(r => ({
            id: r.id,
            name: r.name,
            servings: parseInt(r.servings) || 1,
            // Per preservare anche il tipo (se ricetta normale o calcolata dall'AI)
            type: r.type || 'recipe',
            nutrition: r.nutrition || null
          }))
        } else if (val.recipeId) {
          // Migra da ricetta singola a array con porzione 1
          recipes = [{ id: val.recipeId, name: val.recipeName || 'Ricetta', servings: 1, type: 'recipe' }]
        }
      }
      
      normalized[day].meals[m.key] = { text, targetCalories, recipes }
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
  const [viewingRecipe, setViewingRecipe] = useState(null) // ID della ricetta o oggetto ricetta temporanea AI
  const [targetServings, setTargetServings] = useState(1)  // Porzioni selezionate nel Bottom Sheet
  const [allRecipes, setAllRecipes]   = useState([])

  // Stato per la stima AI del singolo pasto
  const [aiMealKey, setAiMealKey] = useState(null) // pasto per cui si vuole usare la stima AI (null = chiuso)
  const [aiInput, setAiInput] = useState({
    ingredients: '',
    condiments: '',
    cooking: ''
  })
  const [aiLoading, setAiLoading] = useState(false)

  // Conferme Modali
  const [confirmUnsavedChanges, setConfirmUnsavedChanges] = useState(null) // callback function se true

  // Splash Screen
  const [showSplash, setShowSplash] = useState(true)
  const [splashFade, setSplashFade] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setSplashFade(true)
    }, 1500)
    const removeTimer = setTimeout(() => {
      setShowSplash(false)
    }, 2300)
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); }
  }, [])

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
    setTempData(prev => {
      const existing = prev.meals[selectingMealKey].recipes || []
      // Evita duplicati
      if (existing.some(r => r.id === recipe.id)) {
        setSelectingMealKey(null)
        return prev
      }
      return {
        ...prev,
        meals: {
          ...prev.meals,
          [selectingMealKey]: { 
            ...prev.meals[selectingMealKey], 
            // Inizializza con 1 porzione per questo pasto
            recipes: [...existing, { id: recipe.id, name: recipe.name, servings: 1, type: 'recipe' }] 
          }
        }
      }
    })
    setSelectingMealKey(null)
  }

  const handleRemoveRecipe = (mealKey, recipeId) => {
    setTempData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealKey]: { 
          ...prev.meals[mealKey], 
          recipes: (prev.meals[mealKey].recipes || []).filter(r => r.id !== recipeId)
        }
      }
    }))
  }

  const handleUpdateRecipeServings = (mealKey, recipeId, change) => {
    setTempData(prev => ({
      ...prev,
      meals: {
        ...prev.meals,
        [mealKey]: {
          ...prev.meals[mealKey],
          recipes: (prev.meals[mealKey].recipes || []).map(r => {
            if (r.id === recipeId) {
              const current = parseInt(r.servings) || 1
              return { ...r, servings: Math.max(1, current + change) }
            }
            return r
          })
        }
      }
    }))
  }

  // Chiamata API Gemini per stimare i valori nutrizionali di un singolo piatto inserito a testo
  const handleEstimateMealNutrition = async () => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      showToast("Configura prima l'API Key (o le chiavi separate da virgola) nelle Impostazioni!", 'danger');
      return;
    }
    if (!aiInput.ingredients.trim()) {
      showToast("Descrivi almeno cosa hai mangiato!", 'danger');
      return;
    }

    setAiLoading(true);
    try {
      // Controlla prima in cache
      const promptKey = `estimate_${aiInput.ingredients.trim().toLowerCase()}_${(aiInput.condiments||'').trim().toLowerCase()}_${(aiInput.cooking||'').trim().toLowerCase()}`;
      const cachedData = getAiCache(promptKey);
    
    let parsedData = null;
    
    if (cachedData) {
      parsedData = cachedData;
      // Ritardo artificiale per simulare caricamento (feedback visivo)
      await new Promise(r => setTimeout(r, 600));
    } else {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analizza questa porzione singola di cibo e restituisci rigorosamente un JSON (senza markdown, backticks o commenti) con i valori nutrizionali stimati per una porzione.
Cibo e quantità: "${aiInput.ingredients}"
Condimenti e ingredienti extra: "${aiInput.condiments || 'Nessuno'}"
Metodo di cottura: "${aiInput.cooking || 'Non specificato'}"

Schema JSON da restituire:
{
  "title": "Titolo breve del piatto (max 30 caratteri)",
  "description": "Breve descrizione (max 100 caratteri) con eventuali note sulle stime fatte",
  "nutrition": {
    "calories": 350,
    "protein": 15,
    "carbs": 40,
    "fat": 10
  }
}
Tutti i valori del campo nutrition devono essere numerici o stringa vuota se impossibile stimare.`
              }]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!response.ok) {
          throw new Error("Errore nella risposta delle API Gemini.");
        }

        const resJson = await response.json();
        let resText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resText) {
          throw new Error("Nessuna risposta ricevuta da Gemini.");
        }
        resText = resText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(resText);
        
        // Salva in cache
        setAiCache(promptKey, parsedData);
      } catch (err) {
        console.error("Errore AI Estima:", err);
        showToast("Errore durante la generazione. Riprova.", 'danger');
        setAiLoading(false);
        return;
      }
    }

      // Assegna il piatto stimato all'elenco delle ricette del pasto come record di tipo 'ai_estimate'
      setTempData(prev => {
        const existing = prev.meals[aiMealKey].recipes || []
        const newRecord = {
          id: 'ai_' + Date.now().toString(),
          name: parsedData.title || 'Piatto Stimato',
          servings: 1,
          type: 'ai_estimate',
          nutrition: {
            calories: parsedData.nutrition?.calories || 0,
            protein: parsedData.nutrition?.protein || 0,
            carbs: parsedData.nutrition?.carbs || 0,
            fat: parsedData.nutrition?.fat || 0
          },
          description: parsedData.description || 'Piatto stimato con IA'
        }
        return {
          ...prev,
          meals: {
            ...prev.meals,
            [aiMealKey]: {
              ...prev.meals[aiMealKey],
              recipes: [...existing, newRecord]
            }
          }
        }
      });

      setAiMealKey(null);
      setAiInput({ ingredients: '', condiments: '', cooking: '' });
      showToast("Nutrizione stimata ed aggiunta con successo!", "success");
    } catch (err) {
      console.error(err);
      showToast("Errore durante la stima: " + err.message, "danger");
    } finally {
      setAiLoading(false);
    }
  }

  // Presets load handling (passed to PresetsPage)
  const executePresetLoad = (presetData) => {
    setDietData(presetData);
    setView('calendar');
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
  
  // Trova o imposta al volo la ricetta / stima da visualizzare nel bottom-sheet
  const getRecipeToView = () => {
    if (!viewingRecipe) return null
    if (typeof viewingRecipe === 'object') return viewingRecipe // Se passiamo direttamente l'oggetto stimato AI
    return allRecipes.find(r => r.id === viewingRecipe)
  }
  const recipeToView = getRecipeToView();

  // Apri bottom sheet e inizializza le porzioni al valore salvato nel pasto (oppure 1 se aperto da ricettario generale)
  const handleViewRecipe = (recipeOrId, currentServings = 1) => {
    setViewingRecipe(recipeOrId);
    setTargetServings(currentServings);
  };

  // --- CALCOLATORE VALORI NUTRIZIONALI MOLTIPLICATO PER LE PORZIONI SCELTE ---
  const getRecipeMacros = (recipe, activeServings = 1) => {
    if (!recipe) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const base = parseInt(recipe.servings) || 1
    return {
      calories: scaleNutri(recipe.nutrition?.calories, activeServings, base) || 0,
      protein: scaleNutri(recipe.nutrition?.protein, activeServings, base) || 0,
      carbs: scaleNutri(recipe.nutrition?.carbs, activeServings, base) || 0,
      fat: scaleNutri(recipe.nutrition?.fat, activeServings, base) || 0
    }
  }

  const getMealMacros = (mealData) => {
    const total = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    if (!mealData || !mealData.recipes) return total
    mealData.recipes.forEach(rRef => {
      let fullRecipe;
      if (rRef.type === 'ai_estimate') {
        fullRecipe = {
          servings: 1,
          nutrition: rRef.nutrition
        }
      } else {
        fullRecipe = allRecipes.find(r => r.id === rRef.id)
      }
      const servings = parseInt(rRef.servings) || 1
      const macros = getRecipeMacros(fullRecipe, servings)
      total.calories += macros.calories
      total.protein += macros.protein
      total.carbs += macros.carbs
      total.fat += macros.fat
    })
    total.calories = parseFloat(total.calories.toFixed(1))
    total.protein = parseFloat(total.protein.toFixed(1))
    total.carbs = parseFloat(total.carbs.toFixed(1))
    total.fat = parseFloat(total.fat.toFixed(1))
    return total
  }

  const getDayMacros = (dayData) => {
    const total = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    if (!dayData || !dayData.meals) return total
    Object.keys(dayData.meals).forEach(mealKey => {
      const macros = getMealMacros(dayData.meals[mealKey])
      total.calories += macros.calories
      total.protein += macros.protein
      total.carbs += macros.carbs
      total.fat += macros.fat
    })
    total.calories = parseFloat(total.calories.toFixed(1))
    total.protein = parseFloat(total.protein.toFixed(1))
    total.carbs = parseFloat(total.carbs.toFixed(1))
    total.fat = parseFloat(total.fat.toFixed(1))
    return total
  }

  // Calcoli macro giornalieri attuali
  const dayMacros = getDayMacros(currentData)
  const targetDayCal = currentData.targetCalories ? parseFloat(currentData.targetCalories) : 0
  const dayProgressPct = targetDayCal > 0 ? Math.min(100, (dayMacros.calories / targetDayCal) * 100) : 0

  return (
    <div className="app">
      {showSplash && (
        <div className={`splash-screen ${splashFade ? 'fade-out' : ''}`}>
          <div className="splash-logo">🍽️</div>
          <h1 className="splash-title">DietApp</h1>
        </div>
      )}

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

            {/* ===== VALORI NUTRIZIONALI GIORNALIERI ===== */}
            <div className="meal-card goals-card mb-4">
              <div className="goals-header">
                <span className="goals-title">📊 Fabbisogno Giornaliero</span>
              </div>
              <div className="goals-inputs mt-2">
                <label className="goal-input-label">
                  <span>Obiettivo Calorie:</span>
                  {isEditing ? (
                    <input 
                      type="number" 
                      placeholder="Imposta kcal" 
                      className="input-description mini-input"
                      value={currentData.targetCalories || ''}
                      onChange={e => handleChange('targetCalories', e.target.value)}
                    />
                  ) : (
                    <strong>{currentData.targetCalories ? `${currentData.targetCalories} kcal` : 'Non impostato'}</strong>
                  )}
                </label>
              </div>

              <div className="goals-summary mt-3">
                <div className="goal-metric">
                  <span className="metric-label">Calorie Attuali:</span>
                  <span className="metric-value">{dayMacros.calories} / {currentData.targetCalories || '—'} kcal</span>
                </div>
                
                {/* Barra di Progresso */}
                <div className="progress-container mt-2">
                  <div className="progress-bar" style={{ width: `${dayProgressPct}%` }}></div>
                </div>

                <div className="macronutrients-grid mt-3">
                  <div className="macro-item">🥩 <strong>{dayMacros.protein}g</strong><br/><span>Proteine</span></div>
                  <div className="macro-item">🍞 <strong>{dayMacros.carbs}g</strong><br/><span>Carboidrati</span></div>
                  <div className="macro-item">🥑 <strong>{dayMacros.fat}g</strong><br/><span>Grassi</span></div>
                </div>
              </div>
            </div>

            {/* ===== LISTA DEI PASTI ===== */}
            <div className="meals-list">
              {MEALS.map(meal => {
                const mealData = currentData.meals[meal.key] || { text: '', targetCalories: '', recipes: [] }
                const mealMacros = getMealMacros(mealData)
                const targetMealCal = mealData.targetCalories ? parseFloat(mealData.targetCalories) : 0
                const mealProgressPct = targetMealCal > 0 ? Math.min(100, (mealMacros.calories / targetMealCal) * 100) : 0

                return (
                  <div key={meal.key} className="meal-card">
                    <div className="meal-header" style={{ justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="meal-icon">{meal.icon}</span>
                        <span className="meal-label">{meal.label}</span>
                      </div>
                      
                      {/* Obiettivo pasto */}
                      <div className="meal-goal-indicator">
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem' }}>Target:</span>
                            <input 
                              type="number" 
                              placeholder="kcal"
                              className="input-description mini-input"
                              style={{ width: '65px', padding: '2px 4px', fontSize: '0.8rem' }}
                              value={mealData.targetCalories || ''}
                              onChange={e => {
                                const val = e.target.value
                                setTempData(prev => ({
                                  ...prev,
                                  meals: {
                                    ...prev.meals,
                                    [meal.key]: { ...prev.meals[meal.key], targetCalories: val }
                                  }
                                }))
                              }}
                            />
                          </div>
                        ) : (
                          mealData.targetCalories && <span className="text-secondary text-sm">Target: {mealData.targetCalories} kcal</span>
                        )}
                      </div>
                    </div>

                    {/* Riepilogo nutrizionale del singolo pasto */}
                    <div className="meal-nutri-summary mt-2">
                      <div className="meal-nutri-cals">
                        🔥 <strong>{mealMacros.calories} kcal</strong> {mealData.targetCalories ? `di ${mealData.targetCalories}` : ''}
                      </div>
                      {targetMealCal > 0 && (
                        <div className="progress-container mini-progress mt-1">
                          <div className="progress-bar" style={{ width: `${mealProgressPct}%` }}></div>
                        </div>
                      )}
                      <div className="meal-nutri-macros mt-1">
                        <span>🥩 {mealMacros.protein}g</span>
                        <span>🍞 {mealMacros.carbs}g</span>
                        <span>🥑 {mealMacros.fat}g</span>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="meal-edit-container mt-3">
                        {/* Elenco ricette associate con pulsante di rimozione e regolatore porzioni */}
                        {(mealData.recipes || []).length > 0 && (
                          <div className="attached-recipes-list mb-2">
                            {mealData.recipes.map(rRef => {
                              const servings = parseInt(rRef.servings) || 1
                              const isAi = rRef.type === 'ai_estimate'
                              return (
                                <div key={rRef.id} className="attached-recipe-badge flex-wrap-mobile">
                                  <span className="badge-icon">{isAi ? '🤖' : '📖'}</span>
                                  <span className="badge-text">{rRef.name}</span>
                                  
                                  {/* Regolatore Porzioni in Linea */}
                                  <div className="badge-servings-control">
                                    <button 
                                      className="badge-servings-btn"
                                      onClick={() => handleUpdateRecipeServings(meal.key, rRef.id, -1)}
                                    >−</button>
                                    <span className="badge-servings-val">{servings} p.</span>
                                    <button 
                                      className="badge-servings-btn"
                                      onClick={() => handleUpdateRecipeServings(meal.key, rRef.id, 1)}
                                    >+</button>
                                  </div>

                                  <button className="badge-close ml-1" onClick={() => handleRemoveRecipe(meal.key, rRef.id)}>✕</button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn--edit small-py mb-2 flex-1" onClick={() => setSelectingMealKey(meal.key)}>
                            + Ricettario
                          </button>
                          <button className="btn btn--edit small-py mb-2 flex-1" style={{ borderColor: 'var(--accent-light)' }} onClick={() => setAiMealKey(meal.key)}>
                            🤖 Chiedi a IA
                          </button>
                        </div>
                        
                        <textarea
                          className="input-meal"
                          placeholder={`Note manuali per ${meal.label.toLowerCase()}...`}
                          value={mealData.text || ''}
                          onChange={e => handleMealChangeText(meal.key, e.target.value)}
                          rows={2}
                        />
                      </div>
                    ) : (
                      <div className="meal-content mt-3">
                        {/* Mostra emoji 📖 o 🤖, nome e porzioni assegnate */}
                        {(mealData.recipes || []).length > 0 && (
                          <div className="recipe-links-container mb-2">
                            {mealData.recipes.map(rRef => {
                              const servings = parseInt(rRef.servings) || 1
                              const isAi = rRef.type === 'ai_estimate'
                              return (
                                <span 
                                  key={rRef.id} 
                                  className="recipe-link-inline-emoji"
                                  onClick={() => handleViewRecipe(isAi ? rRef : rRef.id, servings)}
                                  title={rRef.name}
                                >
                                  {isAi ? '🤖' : '📖'} <strong>{rRef.name}</strong> {servings > 1 && <span className="inline-servings-badge">({servings} porz.)</span>}
                                </span>
                              )
                            })}
                          </div>
                        )}
                        {mealData.text ? (
                          <p className="meal-text-note">{mealData.text}</p>
                        ) : (
                          (!mealData.recipes || mealData.recipes.length === 0) && <span className="placeholder-text">Non ancora pianificato</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
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
            <h2 className="day-name">Scegli per {MEALS.find(m => m.key === selectingMealKey)?.label}</h2>
            <div className="modal-scroll">
              {allRecipes.length === 0 ? (
                <p className="placeholder-text">Nessuna ricetta salvata. Vai nel Ricettario.</p>
              ) : (() => {
                // Filtro pertinenza piatti in base al pasto
                const allowedTypes = MEAL_PERTINENCE[selectingMealKey] || [];
                const filtered = allRecipes.filter(r => allowedTypes.includes(r.dishType));

                if (filtered.length === 0) {
                  return <p className="placeholder-text">Nessuna ricetta pertinente trovata ({allowedTypes.join(', ')}).</p>;
                }

                return (
                  <div className="recipes-grid">
                    {filtered.map(r => (
                      <div key={r.id} className="meal-card recipe-card selector-card" onClick={() => handleAssignRecipe(r)}>
                        <h3 className="recipe-name">{r.name}</h3>
                        <span className="recipe-badge">{r.dishType}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="action-bar mt-auto">
              <button className="btn btn--cancel" onClick={() => setSelectingMealKey(null)}>✕ Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STIMA NUTRIZIONALE IA PIATTO ESTEMPORANEO */}
      {aiMealKey && (
        <div className="recipe-modal-overlay">
          <div className="recipe-modal day-content">
            <h2 className="day-name">🤖 Chiedi stima nutrizionale a IA</h2>
            <p className="servings-hint mb-3" style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              ⚠️ <strong>Importante:</strong> Inserisci solo un piatto alla volta. Non sommare più alimenti o pasti completi nella stessa richiesta.
            </p>
            <div className="modal-scroll">
              <label>Cosa hai mangiato? (Cibo e Quantità)</label>
              <textarea 
                className="input-description mb-3"
                rows="2"
                placeholder="es. Un piatto abbondante di spaghetti, circa 80 grammi di pane..."
                value={aiInput.ingredients}
                onChange={e => setAiInput(prev => ({ ...prev, ingredients: e.target.value }))}
              />
              
              <label>Condimenti ed Extra (Olio, burro, zucchero, parmigiano...)</label>
              <input 
                type="text"
                className="input-description mb-3"
                placeholder="es. Un cucchiaio d'olio d'oliva, una spolverata di parmigiano, 1 cucchiaino di zucchero nel caffè"
                value={aiInput.condiments}
                onChange={e => setAiInput(prev => ({ ...prev, condiments: e.target.value }))}
              />

              <label>Metodo di Cottura (Fritto, al vapore, al forno...)</label>
              <input 
                type="text"
                className="input-description mb-3"
                placeholder="es. Bollito, grigliato, cotto al forno"
                value={aiInput.cooking}
                onChange={e => setAiInput(prev => ({ ...prev, cooking: e.target.value }))}
              />
              
              {aiLoading && (
                <div className="text-center py-3">
                  <span className="placeholder-text" style={{ display: 'block', marginBottom: '8px' }}>🤖 L'Intelligenza Artificiale sta calcolando i nutrienti stimati...</span>
                  <div className="spinner"></div>
                </div>
              )}
            </div>
            
            <div className="action-bar mt-auto">
              <button className="btn btn--save" onClick={handleEstimateMealNutrition} disabled={aiLoading}>
                ✓ Stima Nutrienti
              </button>
              <button className="btn btn--cancel" onClick={() => { setAiMealKey(null); setAiInput({ ingredients: '', condiments: '', cooking: '' }); }} disabled={aiLoading}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet Ricetta */}
      {viewingRecipe && (
        <div className="bottom-sheet-overlay" onClick={() => setViewingRecipe(null)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-drag-handle"></div>
            {recipeToView ? (() => {
              const isAi = typeof viewingRecipe === 'object' && viewingRecipe.type === 'ai_estimate';
              const baseServings = isAi ? 1 : (parseInt(recipeToView.servings) || 1);
              const factor = targetServings / baseServings;
              const scaledCals  = scaleNutri(recipeToView.nutrition?.calories, targetServings, baseServings);
              const scaledProt  = scaleNutri(recipeToView.nutrition?.protein,  targetServings, baseServings);
              const scaledCarbs = scaleNutri(recipeToView.nutrition?.carbs,    targetServings, baseServings);
              const scaledFat   = scaleNutri(recipeToView.nutrition?.fat,      targetServings, baseServings);
              return (
                <div className="bottom-sheet-content">
                  <h2 className="recipe-name mb-2">{isAi ? viewingRecipe.name : recipeToView.name}</h2>
                  <span className="recipe-badge mb-3 inline-block">
                    {isAi ? 'Stima Istantanea IA 🤖' : recipeToView.dishType}
                  </span>

                  {/* Selettore Porzioni */}
                  <div className="servings-selector mb-3">
                    <span className="servings-selector-label">👤 Porzioni:</span>
                    <button
                      className="servings-btn"
                      onClick={() => setTargetServings(s => Math.max(1, s - 1))}
                      disabled={targetServings <= 1}
                    >−</button>
                    <span className="servings-value">{targetServings}</span>
                    <button
                      className="servings-btn"
                      onClick={() => setTargetServings(s => s + 1)}
                    >+</button>
                  </div>

                  <div className="recipe-nutri mb-3">
                    <span>🔥 {scaledCals || 0} kcal</span>
                    <span>🥩 {scaledProt || 0}g P</span>
                    <span>🍞 {scaledCarbs || 0}g C</span>
                    <span>🥑 {scaledFat || 0}g F</span>
                  </div>

                  {isAi ? (
                    <div className="mb-3">
                      <h4 className="mb-2 text-accent">Dettagli Stima</h4>
                      <p className="meal-text-note">{viewingRecipe.description}</p>
                    </div>
                  ) : (
                    <>
                      {recipeToView.ingredients?.length > 0 && (
                        <div className="mb-3">
                          <h4 className="mb-2 text-accent">Ingredienti</h4>
                          <ul className="ingredient-list">
                            {recipeToView.ingredients.map((ing, i) => (
                              <li key={i}>
                                <strong>{ing.name}</strong>
                                <span className="text-secondary">
                                  {scaleQuantity(ing.quantity, targetServings, baseServings)}
                                </span>
                              </li>
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
                    </>
                  )}

                  <button className="btn btn--cancel w-full mt-3" onClick={() => setViewingRecipe(null)}>Chiudi</button>
                </div>
              );
            })() : (
              <p>Ricetta o stima non trovata o eliminata.</p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
