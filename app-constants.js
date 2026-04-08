export const TRAINING_PLAN_START = '2026-03-16';
export const TRAINING_PLAN_EFFECTIVE_WEEK = '2026-03-30';
export const TRAINING_PLAN_VERSION = '2026-03-31-r1';
export const START_WEEK = TRAINING_PLAN_START;
export const ROUTINES_STORAGE_KEY = 'enzo_routines_v1';
export const DAY_KEYS = ['1', '2', '3', '4', '5', '6', '0'];

export const SWEETS_STOCK_KEY = 'enzo_sweets_sauces_stock_v1';

export const SWEETS_STOCK_DEFAULT = {
  damasco: '',
  durazno: '',
  ciruela: '',
  pera: '',
  alcayota: '',
  tomate_triturado: '',
  tomate_entero: '',
  otro_dulce_nombre: '',
  otro_dulce_stock: '',
  sales_history: []
};

export const SWEETS_SOLD_DEFAULT = {
  damasco: '',
  durazno: '',
  ciruela: '',
  pera: '',
  alcayota: '',
  tomate_triturado: '',
  tomate_entero: '',
  otro_dulce_stock: ''
};

export const SWEETS_JAM_FIELDS = [
  ['damasco', 'Damasco'],
  ['durazno', 'Durazno'],
  ['ciruela', 'Ciruela'],
  ['pera', 'Pera'],
  ['alcayota', 'Alcayota']
];

export const SWEETS_SAUCE_FIELDS = [
  ['tomate_triturado', 'Tomate triturado'],
  ['tomate_entero', 'Tomate entero']
];

export const SWEETS_SALE_FIELDS = [...SWEETS_JAM_FIELDS, ...SWEETS_SAUCE_FIELDS];

export const RECIPE_KIND_META = {
  receta: { label: 'receta', color: '#10B981' },
  ingrediente: { label: 'ingrediente', color: '#F59E0B' },
  condimento: { label: 'condimento', color: '#38BDF8' }
};

export const CATEGORY_OPTIONS = [
  { value: 'personal', label: 'Personal', color: '#6366F1' },
  { value: 'estudio', label: 'Estudio', color: '#10B981' },
  { value: 'salud', label: 'Salud', color: '#F59E0B' },
  { value: 'trabajo', label: 'Trabajo', color: '#EF4444' }
];

export const categoryMeta = (value) => CATEGORY_OPTIONS.find((item) => item.value === value) || CATEGORY_OPTIONS[0];

export const NOTE_KIND_OPTIONS = [
  { value: 'idea', label: 'Idea', color: '#F59E0B' },
  { value: 'pregunta', label: 'Pregunta', color: '#38BDF8' },
  { value: 'reflexion', label: 'Reflexion', color: '#A78BFA' },
  { value: 'duda', label: 'Duda', color: '#EF4444' }
];

export const noteKindMeta = (value) => NOTE_KIND_OPTIONS.find((item) => item.value === value) || NOTE_KIND_OPTIONS[0];

export const noteDisplayTitle = (note) => {
  const custom = String(note?.note_title || '').trim();
  if (custom) return custom;
  const content = String(note?.content || '').trim();
  if (!content) return 'Pensamiento';
  return content.length > 56 ? `${content.slice(0, 56)}...` : content;
};

export const classifyThoughtKind = (text = '') => {
  const raw = String(text || '').trim();
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!normalized) return 'idea';
  if (raw.includes('?') || /^(que|como|por que|cuando|donde|quien)\b/.test(normalized)) return 'pregunta';
  if (/(no entiendo|dudo|duda|sera|quizas|capaz|me cuesta|no se si)/.test(normalized)) return 'duda';
  if (/(pienso|siento|aprendi|reflexion|me di cuenta|conclusion|me pasa)/.test(normalized)) return 'reflexion';
  return 'idea';
};

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No repetir' },
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' }
];

export const recurrenceLabel = (value) => RECURRENCE_OPTIONS.find((item) => item.value === value)?.label || 'No repetir';

export const STUDY_SUBJECT_SEEDS = [
  { subject: 'Analisis Matematico I', topics: [
    { name: 'Funciones y limites', done: false },
    { name: 'Continuidad', done: false },
    { name: 'Derivadas', done: false },
    { name: 'Aplicaciones de la derivada', done: false },
    { name: 'Integrales indefinidas', done: false },
    { name: 'Integrales definidas', done: false }
  ] },
  { subject: 'Algebra Lineal', topics: [
    { name: 'Matrices', done: false },
    { name: 'Determinantes', done: false },
    { name: 'Sistemas de ecuaciones', done: false },
    { name: 'Vectores', done: false },
    { name: 'Espacios vectoriales', done: false },
    { name: 'Transformaciones lineales', done: false }
  ] },
  { subject: 'Integracion I', topics: [
    { name: 'Introduccion', done: false },
    { name: 'Metodos basicos', done: false },
    { name: 'Cambio de variable', done: false },
    { name: 'Integracion por partes', done: false },
    { name: 'Fracciones parciales', done: false },
    { name: 'Aplicaciones', done: false }
  ] },
  { subject: 'Fisica I', topics: [
    { name: 'Cinematica', done: false },
    { name: 'Dinamica', done: false },
    { name: 'Trabajo y energia', done: false },
    { name: 'Cantidad de movimiento', done: false },
    { name: 'Rotacion', done: false },
    { name: 'Oscilaciones', done: false }
  ] },
  { subject: 'Conocimiento de los Materiales', topics: [
    { name: 'Propiedades mecanicas', done: false },
    { name: 'Estructura cristalina', done: false },
    { name: 'Diagrama hierro-carbono', done: false },
    { name: 'Tratamientos termicos', done: false },
    { name: 'Ensayos de dureza', done: false },
    { name: 'Corrosion', done: false }
  ] },
  { subject: 'Economia', topics: [
    { name: 'Conceptos basicos', done: false },
    { name: 'Costos', done: false },
    { name: 'Oferta y demanda', done: false },
    { name: 'Punto de equilibrio', done: false },
    { name: 'Inflacion', done: false },
    { name: 'Flujo de fondos', done: false }
  ] }
];

export const BOOK_DEFAULT = {
  title: 'El Duelo',
  author: 'Gabriel Rolon',
  current_page: 122,
  total_pages: 450
};

export const SERIES_DEFAULT = {
  title: 'Sin serie',
  season: 1,
  episode: 1,
  episodes_total: 10
};

export const MEDS_STOCK_KEY = 'enzo_meds_stock_v1';

export const MEDS_STOCK_DEFAULT = {
  roaccutan: 10,
  minoxidil_finasteride: 5,
  last_taken_at: '',
  last_roaccutan_at: '',
  last_dinner_meds_at: '',
  last_dinner_logical_date: '',
  history: [],
  _updatedAt: ''
};

export const HEALTH_HISTORY_FILTERS = [
  ['all', 'Todo'],
  ['takes', 'Tomas'],
  ['checks', 'Checks'],
  ['adjustments', 'Ajustes']
];

export const OCIO_NOTE_FILTER_OPTIONS = [
  ['all', 'TODO'],
  ['notes', 'NOTAS'],
  ['ai', 'IA']
];

export const HEALTH_ENTRY_META = {
  roaccutan_take: {
    badge: 'TOMA',
    color: '#86EFAC',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    describe: () => 'Toma mediodia: -1 Roaccutan'
  },
  dinner_combo_take: {
    badge: 'TOMA',
    color: '#86EFAC',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.35)',
    describe: () => 'Toma cena: -1 Minoxidil/Finasteride'
  },
  habit_toggle: {
    badge: 'CHECK',
    color: '#C7D2FE',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.35)',
    describe: (entry) => `Check diario: ${entry.med === 'roacuttan'
      ? `Roaccutan ${entry.delta_roaccutan > 0 ? '+' : ''}${entry.delta_roaccutan}`
      : `Combo noche ${entry.delta_combo > 0 ? '+' : ''}${entry.delta_combo}`}`
  },
  restock: {
    badge: 'REPOSICION',
    color: '#FCD34D',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    describe: (entry) => `Reposicion: ${entry.field === 'roaccutan' ? 'Roaccutan' : 'Minoxidil/Finasteride'} +${entry.delta}`
  },
  manual_adjust: {
    badge: 'AJUSTE',
    color: '#FCA5A5',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    describe: (entry) => `Ajuste: ${entry.field === 'roaccutan' ? 'Roaccutan' : 'Minoxidil/Finasteride'} ${entry.delta}`
  }
};

export const getHealthEntryMeta = (entry) => {
  const fallback = {
    badge: 'AJUSTE',
    color: '#FCA5A5',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    describe: (row) => row?.note || 'Movimiento manual'
  };
  const meta = HEALTH_ENTRY_META[entry?.type] || fallback;
  return {
    ...meta,
    text: meta.describe(entry)
  };
};
