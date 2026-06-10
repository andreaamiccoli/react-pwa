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
