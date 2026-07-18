import { useState, useEffect } from 'react';
import { getActiveApiKey } from './aiUtils.js';

const MEALS = ['Colazione', 'Spuntino', 'Pranzo', 'Merenda', 'Cena'];
const DISH_TYPES = ['Primo', 'Secondo', 'Contorno', 'Dolce', 'Snack', 'Bevanda', 'Altro'];

// Definizione delle 4 categorie principali con mappatura ai pasti del database
const CATEGORIES = [
  { key: 'colazioni', label: 'Colazioni',  meals: ['Colazione'],           icon: '☕' },
  { key: 'snack',     label: 'Snack',       meals: ['Spuntino', 'Merenda'], icon: '🍎' },
  { key: 'pranzi',    label: 'Pranzi',      meals: ['Pranzo'],              icon: '🍽️' },
  { key: 'cene',      label: 'Cene',        meals: ['Cena'],                icon: '🌙' },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const loadRecipes = () => {
  try {
    const saved = localStorage.getItem('recipeData');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return [];
};

// Helper: scala un valore numerico di nutrizione
const scaleNutri = (value, targetServings, baseServings) => {
  const n = parseFloat(value);
  if (isNaN(n) || !baseServings || baseServings <= 0) return value;
  const scaled = (n / baseServings) * targetServings;
  return Number.isInteger(scaled) ? scaled : parseFloat(scaled.toFixed(1));
};

// Helper: cerca e scala i numeri in una stringa di quantità
// Es. "100g" -> "50g" (fattore 0.5), "1.5 cucchiai" -> "3 cucchiai" (fattore 2)
const scaleQuantity = (quantityStr, targetServings, baseServings) => {
  if (!quantityStr || !baseServings || baseServings <= 0) return quantityStr;
  const factor = targetServings / baseServings;
  if (factor === 1) return quantityStr;

  return quantityStr.replace(/(\d+([.,]\d+)?)/g, (match) => {
    const num = parseFloat(match.replace(',', '.'));
    if (isNaN(num)) return match;
    const scaled = num * factor;
    const result = Number.isInteger(scaled) ? scaled : parseFloat(scaled.toFixed(1));
    return String(result);
  });
};

export default function RecipePage() {
  const [recipes, setRecipes] = useState(loadRecipes);

  // Vista attiva: null = griglia categorie, altrimenti chiave categoria
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filtri (solo nella vista dettaglio)
  const [filterDish, setFilterDish]             = useState('');
  const [filterIngredient, setFilterIngredient] = useState('');
  const [filterMaxCals, setFilterMaxCals]       = useState('');
  const [showFilters, setShowFilters]           = useState(false);

  // Modal
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showAiModal, setShowAiModal]     = useState(false);

  useEffect(() => {
    localStorage.setItem('recipeData', JSON.stringify(recipes));
  }, [recipes]);

  const handleSaveRecipe = (recipeData) => {
    if (recipeData.id) {
      setRecipes(prev => prev.map(r => r.id === recipeData.id ? recipeData : r));
    } else {
      setRecipes(prev => [...prev, { ...recipeData, id: generateId() }]);
    }
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = (id) => {
    if (window.confirm('Vuoi davvero eliminare questa ricetta?')) {
      setRecipes(prev => prev.filter(r => r.id !== id));
    }
  };

  const activeMeals = selectedCategory
    ? (CATEGORIES.find(c => c.key === selectedCategory)?.meals ?? [])
    : [];

  const filteredRecipes = recipes.filter(r => {
    if (selectedCategory && !r.meals.some(m => activeMeals.includes(m))) return false;
    if (filterDish && r.dishType !== filterDish) return false;
    if (filterIngredient) {
      const term = filterIngredient.toLowerCase();
      if (!r.ingredients.some(ing => ing.name.toLowerCase().includes(term))) return false;
    }
    if (filterMaxCals && r.nutrition.calories > parseInt(filterMaxCals)) return false;
    return true;
  });

  const resetFilters = () => { setFilterDish(''); setFilterIngredient(''); setFilterMaxCals(''); };

  const handleBack = () => {
    setSelectedCategory(null);
    setShowFilters(false);
    resetFilters();
  };

  // ── VISTA PRINCIPALE: Griglia 2×2 ──
  if (!selectedCategory) {
    return (
      <div className="recipe-page">
        <div className="recipe-toolbar">
          <button className="btn btn--edit" onClick={() => setShowAiModal(true)}>Importa con IA</button>
          <button className="btn btn--save" onClick={() => setEditingRecipe({
            name: '', meals: [], dishType: 'Altro', servings: 1, ingredients: [],
            nutrition: { calories: '', protein: '', carbs: '', fat: '' }, instructions: '', notes: ''
          })}>+ Nuova</button>
        </div>

        <div className="recipe-categories-grid">
          {CATEGORIES.map(cat => {
            const count = recipes.filter(r => r.meals.some(m => cat.meals.includes(m))).length;
            return (
              <button key={cat.key} className="category-card" onClick={() => setSelectedCategory(cat.key)}>
                <span className="category-card__icon">{cat.icon}</span>
                <span className="category-card__label">{cat.label}</span>
                <span className="category-card__count">{count} {count === 1 ? 'ricetta' : 'ricette'}</span>
              </button>
            );
          })}
        </div>

        {editingRecipe && (
          <RecipeModal recipe={editingRecipe} onSave={handleSaveRecipe} onClose={() => setEditingRecipe(null)} />
        )}
        {showAiModal && (
          <AiImportModal onClose={() => setShowAiModal(false)} onSuccess={(data) => setEditingRecipe(data)} />
        )}
      </div>
    );
  }

  // ── VISTA DETTAGLIO CATEGORIA ──
  const currentCat = CATEGORIES.find(c => c.key === selectedCategory);
  return (
    <div className="recipe-page">
      <div className="recipe-toolbar">
        <button className="btn btn--cancel" onClick={handleBack}>← Indietro</button>
        <button className="btn btn--edit" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'Nascondi Filtri' : 'Filtri'}
        </button>
      </div>

      <div className="category-detail-header">
        <h2 className="category-detail-title">{currentCat.label}</h2>
      </div>

      {showFilters && (
        <div className="recipe-filters day-hero">
          <select value={filterDish} onChange={e => setFilterDish(e.target.value)} className="input-description">
            <option value="">Qualsiasi Tipo Piatto</option>
            {DISH_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input
            type="text" placeholder="Cerca Ingrediente..."
            value={filterIngredient} onChange={e => setFilterIngredient(e.target.value)}
            className="input-description mt-2"
          />
          <input
            type="number" placeholder="Max Calorie (per porzione)..."
            value={filterMaxCals} onChange={e => setFilterMaxCals(e.target.value)}
            className="input-description mt-2"
          />
          <button className="btn btn--cancel mt-2" onClick={resetFilters}>Reset Filtri</button>
        </div>
      )}

      <div className="recipes-grid">
        {filteredRecipes.length === 0 ? (
          <p className="placeholder-text mt-4 text-center">Nessuna ricetta in questa categoria.</p>
        ) : (
          filteredRecipes.map(r => {
            const base  = parseInt(r.servings) || 1;
            const cals1 = scaleNutri(r.nutrition?.calories, 1, base);
            const prot1 = scaleNutri(r.nutrition?.protein,  1, base);
            const carbs1 = scaleNutri(r.nutrition?.carbs,   1, base);
            const fat1  = scaleNutri(r.nutrition?.fat,      1, base);
            return (
              <div key={r.id} className="meal-card recipe-card">
                <div className="recipe-header">
                  <h3 className="recipe-name">{r.name || 'Senza Nome'}</h3>
                  <span className="recipe-badge">{r.dishType}</span>
                </div>
                <p className="recipe-meta">{r.meals.join(', ')}</p>
                <div className="recipe-nutri mt-2">
                  <span>🔥 {cals1 || 0} kcal</span>
                  <span>🥩 {prot1 || 0}g P</span>
                  <span>🍞 {carbs1 || 0}g C</span>
                  <span>🥑 {fat1 || 0}g F</span>
                </div>
                {base > 1 && (
                  <p className="recipe-servings-note">Valori per 1 porzione (ricetta base: {base} porzioni)</p>
                )}
                <div className="recipe-actions mt-3">
                  <button className="btn btn--edit small-btn" onClick={() => setEditingRecipe({...r})}>✏️</button>
                  <button className="btn btn--cancel small-btn" onClick={() => handleDeleteRecipe(r.id)}>🗑️</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editingRecipe && (
        <RecipeModal recipe={editingRecipe} onSave={handleSaveRecipe} onClose={() => setEditingRecipe(null)} />
      )}
    </div>
  );
}

// Sotto-componente Modal
function RecipeModal({ recipe, onSave, onClose }) {
  const [formData, setFormData] = useState({
    servings: 1,
    ...recipe,
  });

  const handleChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));
  const handleNutriChange = (field, value) => setFormData(p => ({ ...p, nutrition: { ...p.nutrition, [field]: value } }));
  
  const toggleMeal = (m) => {
    const meals = formData.meals.includes(m) 
      ? formData.meals.filter(x => x !== m) 
      : [...formData.meals, m];
    handleChange('meals', meals);
  };

  const handleAddIngredient = () => {
    handleChange('ingredients', [...formData.ingredients, { name: '', quantity: '' }]);
  };
  const updateIngredient = (index, field, value) => {
    const newIngs = [...formData.ingredients];
    newIngs[index][field] = value;
    handleChange('ingredients', newIngs);
  };
  const removeIngredient = (index) => {
    handleChange('ingredients', formData.ingredients.filter((_, i) => i !== index));
  };

  const servings = parseInt(formData.servings) || 1;

  return (
    <div className="recipe-modal-overlay">
      <div className="recipe-modal day-content">
        <h2 className="day-name">{formData.id ? 'Modifica Ricetta' : 'Nuova Ricetta'}</h2>
        
        <div className="modal-scroll">
          <label>Nome Ricetta</label>
          <input className="input-description mb-3" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
          
          <label>Tipo Piatto</label>
          <select className="input-description mb-3" value={formData.dishType} onChange={e => handleChange('dishType', e.target.value)}>
            {DISH_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <label>Pasti Consigliati</label>
          <div className="meals-checkboxes mb-3">
            {MEALS.map(m => (
              <label key={m} className="checkbox-label">
                <input type="checkbox" checked={formData.meals.includes(m)} onChange={() => toggleMeal(m)} /> {m}
              </label>
            ))}
          </div>

          {/* Campo Porzioni */}
          <label>Porzioni (per quante persone sono queste dosi?)</label>
          <div className="servings-row mb-3">
            <button 
              className="servings-btn" 
              onClick={() => handleChange('servings', Math.max(1, servings - 1))}
              disabled={servings <= 1}
            >−</button>
            <span className="servings-value">{servings} {servings === 1 ? 'persona' : 'persone'}</span>
            <button 
              className="servings-btn" 
              onClick={() => handleChange('servings', servings + 1)}
            >+</button>
          </div>
          {servings > 1 && (
            <p className="servings-hint mb-3">
              Inserisci ingredienti e valori nutrizionali totali per {servings} persone. L'app li mostrerà divisi per 1 persona.
            </p>
          )}

          <label>Valori Nutrizionali {servings > 1 ? `(totali per ${servings} persone)` : '(per 1 persona)'}</label>
          <div className="nutri-inputs mb-3">
            <input type="number" placeholder="Kcal" className="input-description" value={formData.nutrition.calories} onChange={e => handleNutriChange('calories', e.target.value)} />
            <input type="number" placeholder="Prot (g)" className="input-description" value={formData.nutrition.protein} onChange={e => handleNutriChange('protein', e.target.value)} />
            <input type="number" placeholder="Carb (g)" className="input-description" value={formData.nutrition.carbs} onChange={e => handleNutriChange('carbs', e.target.value)} />
            <input type="number" placeholder="Gras (g)" className="input-description" value={formData.nutrition.fat} onChange={e => handleNutriChange('fat', e.target.value)} />
          </div>
          {servings > 1 && (
            <div className="nutri-per-person mb-3">
              <span>Per 1 persona: </span>
              <strong>🔥 {scaleNutri(formData.nutrition.calories, 1, servings) || 0} kcal</strong>
              <span> · {scaleNutri(formData.nutrition.protein, 1, servings) || 0}g P</span>
              <span> · {scaleNutri(formData.nutrition.carbs, 1, servings) || 0}g C</span>
              <span> · {scaleNutri(formData.nutrition.fat, 1, servings) || 0}g F</span>
            </div>
          )}

          <label>Ingredienti {servings > 1 ? `(dosi totali per ${servings} persone)` : '(dosi per 1 persona)'}</label>
          {formData.ingredients.map((ing, i) => (
            <div key={i} className="ingredient-row mb-2">
              <input placeholder="Nome" className="input-description flex-2" value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} />
              <input placeholder="Q.tà" className="input-description flex-1" value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)} />
              <button className="btn btn--cancel" onClick={() => removeIngredient(i)}>X</button>
            </div>
          ))}
          <button className="btn btn--edit mb-3 small-py" onClick={handleAddIngredient}>+ Ingrediente</button>

          <label>Preparazione</label>
          <textarea className="input-description mb-3" rows="3" value={formData.instructions} onChange={e => handleChange('instructions', e.target.value)} />

          <label>Note</label>
          <textarea className="input-description mb-3" rows="2" value={formData.notes} onChange={e => handleChange('notes', e.target.value)} />
        </div>

        <div className="action-bar mt-auto">
          <button className="btn btn--save" onClick={() => onSave(formData)}>✓ Salva</button>
          <button className="btn btn--cancel" onClick={onClose}>✕ Annulla</button>
        </div>
      </div>
    </div>
  );
}

function AiImportModal({ onClose, onSuccess }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
  const [tempKey, setTempKey] = useState('');
  const [recipeText, setRecipeText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTempKey = () => {
    if (!tempKey.trim()) return;
    localStorage.setItem('geminiApiKey', tempKey.trim());
    setApiKey(tempKey.trim());
  };

  const handleAnalyze = async () => {
    const activeKey = getActiveApiKey();
    if (!activeKey && !apiKey) {
      setError("Inserisci una o più chiavi API valide prima di procedere.");
      return;
    }
    const keyToUse = activeKey || apiKey;
    if (!recipeText.trim() && !imageFile) {
      setError("Inserisci del testo o carica uno screenshot della ricetta.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let parts = [];

      if (recipeText.trim()) {
        parts.push({ text: `Testo della ricetta:\n${recipeText}` });
      }

      if (imageFile && imagePreview) {
        const base64Data = imagePreview.split(',')[1];
        parts.push({
          inlineData: {
            mimeType: imageFile.type,
            data: base64Data
          }
        });
      }

      // Prompt aggiornato con supporto porzioni
      parts.push({
        text: `Analizza la ricetta fornita ed estrai tutti i dati. Restituisci esclusivamente un oggetto JSON valido (senza markdown, backticks o commenti) conforme a questo schema:
{
  "name": "Nome della ricetta",
  "dishType": "Primo|Secondo|Contorno|Dolce|Snack|Bevanda|Altro",
  "meals": ["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"],
  "servings": 1,
  "nutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0
  },
  "ingredients": [
    { "name": "Nome ingrediente", "quantity": "Quantità" }
  ],
  "instructions": "Istruzioni di preparazione",
  "notes": "Note aggiuntive"
}

ISTRUZIONI IMPORTANTI PER LE PORZIONI:
- Determina per quante persone è la ricetta originale e imposta il campo "servings" con quel numero (es: se la ricetta è per 4 persone, scrivi "servings": 4).
- Se la ricetta non specifica il numero di persone, imposta "servings": 1.
- Gli ingredienti e i valori nutrizionali devono essere quelli ORIGINALI della ricetta (non scalare per 1 persona, ci pensa l'app). Se la ricetta è per 4 persone, metti gli ingredienti per 4 persone e i valori nutrizionali totali per 4 persone.
- Se i valori nutrizionali non sono specificati, stimali in modo realistico sulla base degli ingredienti e delle quantità indicate (sempre per le porzioni totali della ricetta).
- Nelle "meals" includi solo i pasti adatti a quella ricetta (non includerli tutti, scegli solo quelli appropriati).`
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Errore API (status ${response.status})`);
      }

      const resJson = await response.json();
      let resText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resText) {
        throw new Error("Nessuna risposta ricevuta da Gemini.");
      }

      resText = resText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedRecipe = JSON.parse(resText);

      onSuccess({
        name: parsedRecipe.name || '',
        dishType: parsedRecipe.dishType || 'Altro',
        meals: parsedRecipe.meals || [],
        servings: parseInt(parsedRecipe.servings) || 1,
        nutrition: {
          calories: parsedRecipe.nutrition?.calories || '',
          protein: parsedRecipe.nutrition?.protein || '',
          carbs: parsedRecipe.nutrition?.carbs || '',
          fat: parsedRecipe.nutrition?.fat || ''
        },
        ingredients: parsedRecipe.ingredients || [],
        instructions: parsedRecipe.instructions || '',
        notes: parsedRecipe.notes || ''
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Si è verificato un errore durante l'analisi. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recipe-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="recipe-modal day-content">
        <h2 className="day-name">Importa con IA</h2>
        
        <div className="modal-scroll">
          {!apiKey ? (
            <div className="meal-card recipe-card mb-3" style={{ border: '1px solid var(--border-focus)', padding: '16px' }}>
              <p className="day-description mb-2" style={{ color: 'var(--text-primary)' }}>
                <strong>Configurazione Richiesta:</strong> Per usare l'importazione automatica, inserisci la tua chiave API Gemini gratuita.
              </p>
              <a 
                href="https://aistudio.google.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="recipe-link mb-3"
                style={{ textDecoration: 'underline' }}
              >
                Ottieni chiave gratuita su Google AI Studio ↗
              </a>
                <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '14px', marginBottom: '8px', color: '#ccc' }}>
                    Non hai configurato le API Key. Inserisci una o più chiavi separate da virgola per ruotarle.
                  </p>
                  <input
                    type="password"
                    placeholder="API Key Gemini..."
                    value={tempKey} 
                    onChange={e => setTempKey(e.target.value)} 
                    className="input-description mb-2"
                  />
                  <button className="btn btn--save w-full" onClick={handleSaveTempKey}>Salva Chiave API</button>
                </div>
            </div>
          ) : (
            <>
              <label>Testo della Ricetta (Opzionale)</label>
              <textarea 
                className="input-description mb-3" 
                rows="4" 
                placeholder="Incolla qui la descrizione del post di Instagram/TikTok, ingredienti scritti a mano, o la trascrizione del video..."
                value={recipeText}
                onChange={e => setRecipeText(e.target.value)}
              />

              <label>Screenshot o Immagine della Ricetta (Consigliato per Instagram/TikTok)</label>
              <div className="mb-3" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  id="recipe-image-upload" 
                  style={{ display: 'none' }} 
                />
                <button 
                  className="btn btn--edit" 
                  onClick={() => document.getElementById('recipe-image-upload').click()}
                >
                  {imageFile ? 'Cambia Immagine' : 'Carica Screenshot / Foto'}
                </button>
                {imagePreview && (
                  <div style={{ position: 'relative', marginTop: '8px', textAlign: 'center' }}>
                    <img 
                      src={imagePreview} 
                      alt="Anteprima screenshot" 
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                    />
                    <button 
                      className="btn btn--cancel small-btn" 
                      style={{ position: 'absolute', top: '5px', right: '5px' }}
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                    >
                      ✕ Rimuovi
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="meal-card recipe-card mb-3" style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', padding: '12px' }}>
              <strong>Errore:</strong> {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <span className="placeholder-text" style={{ display: 'block', marginBottom: '8px' }}>Analisi e generazione ricetta in corso...</span>
              <div className="spinner"></div>
            </div>
          )}
        </div>

        <div className="action-bar mt-auto">
          {apiKey && !loading && (
            <button className="btn btn--save" onClick={handleAnalyze}>Analizza con IA</button>
          )}
          <button className="btn btn--cancel" onClick={onClose} disabled={loading}>Annulla</button>
        </div>
      </div>
    </div>
  );
}

// Esporta le funzioni helper per l'uso in App.jsx
export { scaleNutri, scaleQuantity };
