import { useState, useEffect } from 'react';

const MEALS = ['Colazione', 'Spuntino', 'Pranzo', 'Merenda', 'Cena'];
const DISH_TYPES = ['Primo', 'Secondo', 'Contorno', 'Dolce', 'Snack', 'Bevanda', 'Altro'];

const generateId = () => Math.random().toString(36).substring(2, 9);

const loadRecipes = () => {
  try {
    const saved = localStorage.getItem('recipeData');
    if (saved) return JSON.parse(saved);
  } catch (e) { /* ignore */ }
  return [];
};

export default function RecipePage() {
  const [recipes, setRecipes] = useState(loadRecipes);
  
  // Filtri
  const [filterMeal, setFilterMeal] = useState('');
  const [filterDish, setFilterDish] = useState('');
  const [filterIngredient, setFilterIngredient] = useState('');
  const [filterMaxCals, setFilterMaxCals] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal stato (null = chiuso, object = editing)
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('recipeData', JSON.stringify(recipes));
  }, [recipes]);

  // Handler salvataggio
  const handleSaveRecipe = (recipeData) => {
    if (recipeData.id) {
      setRecipes(prev => prev.map(r => r.id === recipeData.id ? recipeData : r));
    } else {
      setRecipes(prev => [...prev, { ...recipeData, id: generateId() }]);
    }
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = (id) => {
    if (window.confirm("Vuoi davvero eliminare questa ricetta?")) {
      setRecipes(prev => prev.filter(r => r.id !== id));
    }
  };

  // Applicazione filtri
  const filteredRecipes = recipes.filter(r => {
    if (filterMeal && !r.meals.includes(filterMeal)) return false;
    if (filterDish && r.dishType !== filterDish) return false;
    if (filterIngredient) {
      const term = filterIngredient.toLowerCase();
      const hasIng = r.ingredients.some(ing => ing.name.toLowerCase().includes(term));
      if (!hasIng) return false;
    }
    if (filterMaxCals && r.nutrition.calories > parseInt(filterMaxCals)) return false;
    return true;
  });

  return (
    <div className="recipe-page">
      <div className="recipe-toolbar">
        <button className="btn btn--edit" onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'Nascondi Filtri' : 'Mostra Filtri'}
        </button>
        <button className="btn btn--edit" onClick={() => setShowAiModal(true)}>
          ⚡ Importa con IA
        </button>
        <button className="btn btn--save" onClick={() => setEditingRecipe({
          name: '', meals: [], dishType: 'Altro', ingredients: [],
          nutrition: { calories: '', protein: '', carbs: '', fat: '' }, instructions: '', notes: ''
        })}>
          + Nuova
        </button>
      </div>

      {showFilters && (
        <div className="recipe-filters day-hero">
          <select value={filterMeal} onChange={e => setFilterMeal(e.target.value)} className="input-description">
            <option value="">Qualsiasi Pasto</option>
            {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterDish} onChange={e => setFilterDish(e.target.value)} className="input-description mt-2">
            <option value="">Qualsiasi Tipo Piatto</option>
            {DISH_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input 
            type="text" placeholder="Cerca Ingrediente..." 
            value={filterIngredient} onChange={e => setFilterIngredient(e.target.value)}
            className="input-description mt-2"
          />
          <input 
            type="number" placeholder="Max Calorie..." 
            value={filterMaxCals} onChange={e => setFilterMaxCals(e.target.value)}
            className="input-description mt-2"
          />
          <button className="btn btn--cancel mt-2" onClick={() => {
            setFilterMeal(''); setFilterDish(''); setFilterIngredient(''); setFilterMaxCals('');
          }}>Reset Filtri</button>
        </div>
      )}

      <div className="recipes-grid">
        {filteredRecipes.length === 0 ? (
          <p className="placeholder-text mt-4 text-center">Nessuna ricetta trovata.</p>
        ) : (
          filteredRecipes.map(r => (
            <div key={r.id} className="meal-card recipe-card">
              <div className="recipe-header">
                <h3 className="recipe-name">{r.name || "Senza Nome"}</h3>
                <span className="recipe-badge">{r.dishType}</span>
              </div>
              <p className="recipe-meta">{r.meals.join(', ')}</p>
              
              <div className="recipe-nutri mt-2">
                <span>🔥 {r.nutrition.calories || 0} kcal</span>
                <span>🥩 {r.nutrition.protein || 0}g P</span>
                <span>🍞 {r.nutrition.carbs || 0}g C</span>
                <span>🥑 {r.nutrition.fat || 0}g F</span>
              </div>
              
              <div className="recipe-actions mt-3">
                <button className="btn btn--edit small-btn" onClick={() => setEditingRecipe({...r})}>✏️</button>
                <button className="btn btn--cancel small-btn" onClick={() => handleDeleteRecipe(r.id)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingRecipe && (
        <RecipeModal 
          recipe={editingRecipe} 
          onSave={handleSaveRecipe} 
          onClose={() => setEditingRecipe(null)} 
        />
      )}

      {showAiModal && (
        <AiImportModal 
          onClose={() => setShowAiModal(false)} 
          onSuccess={(data) => setEditingRecipe(data)} 
        />
      )}
    </div>
  );
}

// Sotto-componente Modal
function RecipeModal({ recipe, onSave, onClose }) {
  const [formData, setFormData] = useState(recipe);

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

          <label>Valori Nutrizionali</label>
          <div className="nutri-inputs mb-3">
            <input type="number" placeholder="Kcal" className="input-description" value={formData.nutrition.calories} onChange={e => handleNutriChange('calories', e.target.value)} />
            <input type="number" placeholder="Prot (g)" className="input-description" value={formData.nutrition.protein} onChange={e => handleNutriChange('protein', e.target.value)} />
            <input type="number" placeholder="Carb (g)" className="input-description" value={formData.nutrition.carbs} onChange={e => handleNutriChange('carbs', e.target.value)} />
            <input type="number" placeholder="Gras (g)" className="input-description" value={formData.nutrition.fat} onChange={e => handleNutriChange('fat', e.target.value)} />
          </div>

          <label>Ingredienti</label>
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
    if (!apiKey) {
      setError("Inserisci una chiave API valida prima di procedere.");
      return;
    }
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

      // Prompt
      parts.push({
        text: `Estrai i dati della ricetta e restituiscili rigorosamente come oggetto JSON conforme a questo schema:
{
  "name": "Nome della ricetta",
  "dishType": "Primo|Secondo|Contorno|Dolce|Snack|Bevanda|Altro",
  "meals": ["Colazione", "Spuntino", "Pranzo", "Merenda", "Cena"],
  "nutrition": {
    "calories": "Calorie in kcal (numero o stringa vuota)",
    "protein": "Proteine in grammi (numero o stringa vuota)",
    "carbs": "Carboidrati in grammi (numero o stringa vuota)",
    "fat": "Grassi in grammi (numero o stringa vuota)"
  },
  "ingredients": [
    { "name": "Nome ingrediente", "quantity": "Quantità" }
  ],
  "instructions": "Istruzioni di preparazione",
  "notes": "Note aggiuntive"
}
Se non sono presenti i valori nutrizionali, stimali tu sulla base degli ingredienti. Restituisci esclusivamente il JSON valido, senza markdown, backticks o commenti.`
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
        <h2 className="day-name">Importa con IA ⚡</h2>
        
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
              <input 
                type="password" 
                placeholder="Incolla API Key Gemini..." 
                value={tempKey} 
                onChange={e => setTempKey(e.target.value)} 
                className="input-description mb-2"
              />
              <button className="btn btn--save w-full" onClick={handleSaveTempKey}>Salva Chiave API</button>
            </div>
          ) : (
            <>
              <label>Pasti o Testo della Ricetta (Opzionale)</label>
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
                  📸 {imageFile ? 'Cambia Immagine' : 'Carica Screenshot / Foto'}
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
              <span className="placeholder-text" style={{ display: 'block', marginBottom: '8px' }}>🤖 Analisi dello screenshot e generazione della ricetta in corso...</span>
              <div className="spinner"></div>
            </div>
          )}
        </div>

        <div className="action-bar mt-auto">
          {apiKey && !loading && (
            <button className="btn btn--save" onClick={handleAnalyze}>⚡ Analizza con IA</button>
          )}
          <button className="btn btn--cancel" onClick={onClose} disabled={loading}>Annulla</button>
        </div>
      </div>
    </div>
  );
}
