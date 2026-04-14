const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf-8');

const missingConstants = `
    const HEALTH_HISTORY_FILTERS = [
      { value: 'all', label: 'Todo' },
      { value: 'takes', label: 'Tomas' },
      { value: 'checks', label: 'Chequeos' }
    ];

    const getHealthEntryMeta = (entry) => {
      if (entry?.type === 'roaccutan_take') return { label: 'Roacutan', color: '#EF4444', icon: '💊' };
      if (entry?.type === 'dinner_combo_take') return { label: 'Cena Combo', color: '#F59E0B', icon: '🍽️' };
      if (entry?.type === 'habit_toggle') return { label: 'Hábito', color: '#10B981', icon: '✅' };
      return { label: entry?.type || 'Registro', color: '#94A3B8', icon: '📝' };
    };
`;

const updatedHtml = html.replace('const viewDeps = {', missingConstants + '\n    const viewDeps = {');

fs.writeFileSync('index.html', updatedHtml, 'utf-8');
console.log('Restaurados HEALTH_HISTORY_FILTERS y getHealthEntryMeta.');
