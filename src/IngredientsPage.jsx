import { useState, useEffect } from 'react';
import { getActiveApiKey } from './aiUtils.js';

const generateId = () => Math.random().toString(36).substring(2, 9);

const loadIngredients = () => {
  try {
    const saved = localStorage.getItem('ingredientsData');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
};

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState(loadIngredients);
  const [search, setSearch] = useState('');
  const [editingIngredient, setEditingIngredient] = useState(null);

  useEffect(() => {
    localStorage.setItem('ingredientsData', JSON.stringify(ingredients));
  }, [ingredients]);

  const handleSave = (data) => {
    if (data.id) {
      setIngredients(prev => prev.map(i => i.id === data.id ? data : i));
    } else {
      setIngredients(prev => [...prev, { ...data, id: generateId() }]);
    }
    setEditingIngredient(null);
  };

  const handleDelete = (id) => {
    if (window.confirm('Vuoi eliminare questo ingrediente?')) {
      setIngredients(prev => prev.filter(i => i.id !== id));
    }
  };

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="recipe-page">
      {/* Toolbar */}
      <div className="recipe-toolbar">
        <input
          type="text"
          placeholder="Cerca ingrediente…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-description"
          style={{ flex: 1 }}
        />
        <button
          className="btn btn--save"
          style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}
          onClick={() => setEditingIngredient({
            name: '', unit: 'g',
            per100: { calories: '', protein: '', carbs: '', fat: '' }
          })}
        >
          + Nuovo
        </button>
      </div>

      {/* Lista */}
      <div className="day-content" style={{ paddingTop: '8px' }}>
        {filtered.length === 0 ? (
          <p className="placeholder-text mt-4 text-center">
            {search
              ? 'Nessun ingrediente trovato.'
              : 'Nessun ingrediente salvato. Aggiungine uno con "+ Nuovo"!'}
          </p>
        ) : (
          filtered.map(ing => (
            <div key={ing.id} className="meal-card" style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{ing.name}</strong>
                  <span style={{ marginLeft: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    valori per 100{ing.unit}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn--edit small-btn" onClick={() => setEditingIngredient({ ...ing })}>✏️</button>
                  <button className="btn btn--cancel small-btn" onClick={() => handleDelete(ing.id)}>🗑️</button>
                </div>
              </div>
              <div className="recipe-ecom-nutri" style={{ marginTop: '10px', fontSize: '0.8rem' }}>
                <span>🔥 {ing.per100.calories || 0} kcal</span>
                <span>🥩 {ing.per100.protein || 0}g P</span>
                <span>🍞 {ing.per100.carbs || 0}g C</span>
                <span>🥑 {ing.per100.fat || 0}g G</span>
              </div>
            </div>
          ))
        )}
      </div>

      {editingIngredient && (
        <IngredientModal
          ingredient={editingIngredient}
          onSave={handleSave}
          onClose={() => setEditingIngredient(null)}
        />
      )}
    </div>
  );
}

// ── Sub-componente Modale Ingrediente ──────────────────────────────────────
function IngredientModal({ ingredient, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...ingredient });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const handleChange = (field, value) => setFormData(p => ({ ...p, [field]: value }));
  const handleNutriChange = (field, value) =>
    setFormData(p => ({ ...p, per100: { ...p.per100, [field]: value } }));

  const handleAiEstimate = async () => {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      setAiError('Configura una chiave API Gemini in Backup & Impostazioni.');
      return;
    }
    if (!formData.name.trim()) {
      setAiError('Inserisci prima il nome dell\'ingrediente.');
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const prompt = `Stima i valori nutrizionali medi per 100${formData.unit} di "${formData.name}".
Rispondi SOLO con un oggetto JSON valido, senza markdown né testo aggiuntivo:
{ "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }
Usa numeri con al massimo 1 decimale.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );

      if (!response.ok) throw new Error(`Errore API (${response.status})`);

      const resJson = await response.json();
      let text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);

      setFormData(p => ({
        ...p,
        per100: {
          calories: String(parsed.calories ?? ''),
          protein:  String(parsed.protein  ?? ''),
          carbs:    String(parsed.carbs    ?? ''),
          fat:      String(parsed.fat      ?? ''),
        }
      }));
    } catch (err) {
      setAiError(err.message || 'Errore durante la stima IA.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="recipe-modal-overlay">
      <div className="recipe-modal day-content">
        <h2 className="day-name">{formData.id ? 'Modifica Ingrediente' : 'Nuovo Ingrediente'}</h2>

        <div className="modal-scroll">
          {/* Nome */}
          <label>Nome Ingrediente</label>
          <input
            className="input-description mb-3"
            placeholder="es. Petto di Pollo"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
          />

          {/* Unità */}
          <label>Unità di misura</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {[
              { val: 'g',  label: '⚖️ Grammi (g)' },
              { val: 'ml', label: '💧 Millilitri (ml)' },
            ].map(u => (
              <button
                key={u.val}
                className={`btn ${formData.unit === u.val ? 'btn--save' : 'btn--edit'}`}
                style={{ flex: 1 }}
                onClick={() => handleChange('unit', u.val)}
              >
                {u.label}
              </button>
            ))}
          </div>

          {/* Header valori + tasto IA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ margin: 0 }}>Valori per 100{formData.unit}</label>
            <button
              className="btn btn--edit"
              style={{ flex: '0 0 auto', padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={handleAiEstimate}
              disabled={aiLoading}
            >
              {aiLoading ? '⏳ Stima in corso…' : '⚡ Stima con IA'}
            </button>
          </div>

          {aiError && (
            <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '10px' }}>{aiError}</p>
          )}

          {/* Campi nutrizione */}
          <div className="nutri-inputs mb-3">
            <input type="number" placeholder="Kcal"     className="input-description"
              value={formData.per100.calories} onChange={e => handleNutriChange('calories', e.target.value)} />
            <input type="number" placeholder="Prot (g)" className="input-description"
              value={formData.per100.protein}  onChange={e => handleNutriChange('protein',  e.target.value)} />
            <input type="number" placeholder="Carb (g)" className="input-description"
              value={formData.per100.carbs}    onChange={e => handleNutriChange('carbs',    e.target.value)} />
            <input type="number" placeholder="Gras (g)" className="input-description"
              value={formData.per100.fat}      onChange={e => handleNutriChange('fat',      e.target.value)} />
          </div>
        </div>

        <div className="action-bar mt-auto">
          <button className="btn btn--save" onClick={() => onSave(formData)}>✓ Salva</button>
          <button className="btn btn--cancel" onClick={onClose}>✕ Annulla</button>
        </div>
      </div>
    </div>
  );
}
