import { useState, useEffect } from 'react'
import './App.css'

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

// --- Helper: leggi da localStorage, oppure usa i default ---
const loadData = () => {
  try {
    const saved = localStorage.getItem('dietData')
    if (saved) return JSON.parse(saved)
  } catch (e) { /* ignora errori di parsing */ }
  return buildDefaultData()
}

// --- Componente principale ---
export default function App() {
  const [selectedDay, setSelectedDay] = useState(DAYS[0])
  const [dietData, setDietData]       = useState(loadData)
  const [isEditing, setIsEditing]     = useState(false)
  const [tempData, setTempData]       = useState(null)

  // Salva automaticamente in localStorage ogni volta che dietData cambia
  useEffect(() => {
    localStorage.setItem('dietData', JSON.stringify(dietData))
  }, [dietData])

  // Quando si cambia giorno, esci dalla modalità modifica
  const handleSelectDay = (day) => {
    if (isEditing) {
      const confirm = window.confirm('Hai modifiche non salvate. Vuoi uscire senza salvare?')
      if (!confirm) return
      setIsEditing(false)
      setTempData(null)
    }
    setSelectedDay(day)
  }

  // Avvia la modifica: clona i dati del giorno in tempData
  const handleEdit = () => {
    setTempData(JSON.parse(JSON.stringify(dietData[selectedDay])))
    setIsEditing(true)
  }

  // Salva le modifiche da tempData in dietData
  const handleSave = () => {
    setDietData(prev => ({ ...prev, [selectedDay]: tempData }))
    setIsEditing(false)
    setTempData(null)
  }

  // Annulla le modifiche
  const handleCancel = () => {
    setIsEditing(false)
    setTempData(null)
  }

  // Aggiorna un campo di tempData durante la modifica
  const handleChange = (field, value) => {
    setTempData(prev => ({ ...prev, [field]: value }))
  }

  const handleMealChange = (mealKey, value) => {
    setTempData(prev => ({
      ...prev,
      meals: { ...prev.meals, [mealKey]: value }
    }))
  }

  const currentData = isEditing ? tempData : dietData[selectedDay]

  return (
    <div className="app">

      {/* ===== HEADER ===== */}
      <header className="app-header">
        <h1 className="app-title">Dieta Settimanale</h1>
      </header>

      {/* ===== MENU GIORNI (orizzontale scorrevole) ===== */}
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
                <textarea
                  className="input-meal"
                  placeholder={`Inserisci la ${meal.label.toLowerCase()}...`}
                  value={currentData.meals[meal.key]}
                  onChange={e => handleMealChange(meal.key, e.target.value)}
                  rows={3}
                />
              ) : (
                <p className="meal-content">
                  {currentData.meals[meal.key] || (
                    <span className="placeholder-text">Non ancora pianificato</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
