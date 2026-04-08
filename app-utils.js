import { START_WEEK } from './app-constants.js?v=20260408-5';

export const normalizeSubtasks = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return { text: item.trim(), done: false };
        const text = String(item?.text || '').trim();
        if (!text) return null;
        return { text, done: !!item?.done };
      })
      .filter(Boolean);
  }
  return [];
};

export const subtasksToEditorText = (subtasks = []) => normalizeSubtasks(subtasks).map((item) => item.text).join('\n');

export const editorTextToSubtasks = (text = '') => String(text || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => ({ text: line, done: false }));

export const parseRecipeIngredientsText = (value = '') => String(value)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [qtyPart, ...nameParts] = line.split('|');
    return {
      qty: (qtyPart || '').trim() || '1 porcion',
      name: nameParts.join('|').trim() || qtyPart.trim() || 'Ingrediente'
    };
  });

export const formatRecipeIngredientsText = (ingredients) => Array.isArray(ingredients)
  ? ingredients.map((item) => `${item.qty || '1 porcion'} | ${item.name || 'Ingrediente'}`).join('\n')
  : '';

export const recipeHasIngredientList = (recipe) =>
  Array.isArray(recipe?.ingredients) && recipe.ingredients.some((it) => String(it?.name || '').trim());

export const stripRoutineMeta = (routineData = {}) => {
  const { _revision, _updatedAt, _dirty, ...clean } = routineData || {};
  return clean;
};

export const getWeekStart = (value) => {
  const dt = new Date(value);
  const day = dt.getDay();
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const weekKeyCache = new Map();

export const getWeekKey = (value) => {
  const key = value instanceof Date ? value.toDateString() : String(value);
  if (weekKeyCache.has(key)) return weekKeyCache.get(key);
  const result = getWeekStart(value).toISOString().split('T')[0];
  weekKeyCache.set(key, result);
  return result;
};

export const addWeeks = (weekKey, amount) => {
  const dt = new Date(`${weekKey}T00:00:00`);
  dt.setDate(dt.getDate() + amount * 7);
  return dt.toISOString().split('T')[0];
};

export const isCurrentWeek = (weekKey) => getWeekKey(new Date()) === weekKey;

export const formatWeekLabel = (weekKey) => {
  const start = new Date(`${weekKey}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}-${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${start.getDate()} ${months[start.getMonth()]}-${end.getDate()} ${months[end.getMonth()]}`;
};

export const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const isBeforeStart = (value = '', startWeek = START_WEEK) => {
  const key = String(value || '').slice(0, 10);
  return !!key && key < startWeek;
};

export const getDayDate = (weekKey, dayIdx) => {
  const dt = new Date(`${weekKey}T12:00:00`);
  const offset = dayIdx === 0 ? 6 : dayIdx - 1;
  dt.setDate(dt.getDate() + offset);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export const formatTaskDate = (value) => {
  if (!value) return 'Sin fecha';
  try {
    return new Date(value).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return value;
  }
};

export const priorityColor = (priority) => ({
  high: '#EF4444',
  normal: '#F59E0B',
  low: '#10B981'
}[priority] || '#94A3B8');

export const computeNextRecurringDueAt = (task) => {
  const recurrence = task?.recurrence || 'none';
  if (recurrence === 'none') return null;
  const base = task?.due_at ? new Date(task.due_at) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  if (recurrence === 'daily') next.setDate(next.getDate() + 1);
  if (recurrence === 'weekly') next.setDate(next.getDate() + 7);
  return next.toISOString();
};
