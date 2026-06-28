export const getActiveApiKey = () => {
  const rawKeys = localStorage.getItem('geminiApiKey') || '';
  const keys = rawKeys.split(',').map(k => k.trim()).filter(k => k);
  if (keys.length === 0) return null;
  
  // Sceglie una chiave a caso per distribuire il carico equamente
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return randomKey;
};

export const getAiCache = (promptKey) => {
  try {
    const cache = JSON.parse(localStorage.getItem('aiCache')) || {};
    return cache[promptKey]?.value || null;
  } catch {
    return null;
  }
};

export const setAiCache = (promptKey, value) => {
  try {
    const cache = JSON.parse(localStorage.getItem('aiCache')) || {};
    cache[promptKey] = { value, timestamp: Date.now() };
    
    // Forza il limite a 500 ricerche
    let entries = Object.entries(cache);
    if (entries.length > 500) {
      // Ordina dal più recente al più vecchio
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const newCache = {};
      for (let i = 0; i < 500; i++) {
        if (entries[i]) newCache[entries[i][0]] = entries[i][1];
      }
      localStorage.setItem('aiCache', JSON.stringify(newCache));
    } else {
      localStorage.setItem('aiCache', JSON.stringify(cache));
    }
  } catch (e) {
    console.error("Errore salvataggio cache AI", e);
  }
};
