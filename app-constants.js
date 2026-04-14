export const SUPA_URL = 'https://qflajqvveuyoclmtrjtg.supabase.co';
export const SUPA_KEY = 'sb_publishable_lwzGrcNCL3QuDHiDafwuAQ_jJd82jAa';
export const TRAINING_PLAN_START = '2026-03-16';
export const TRAINING_PLAN_EFFECTIVE_WEEK = '2026-03-30';
export const TRAINING_PLAN_VERSION = '2026-03-31-r1';
export const START_WEEK = TRAINING_PLAN_START;
export const ROUTINES_STORAGE_KEY = 'enzo_routines_v1';
export const DAY_KEYS = ['1', '2', '3', '4', '5', '6', '0'];

export const HOLIDAYS_2026 = {
  "2026-01-01": "Ano Nuevo",
  "2026-02-16": "Carnaval",
  "2026-02-17": "Carnaval",
  "2026-03-23": "Feriado turistico",
  "2026-03-24": "Dia de la Memoria",
  "2026-04-02": "Dia del Veterano y de los Caidos en Malvinas",
  "2026-04-03": "Viernes Santo",
  "2026-05-01": "Dia del Trabajador",
  "2026-05-25": "Revolucion de Mayo",
  "2026-06-15": "Paso a la Inmortalidad del General Guemes",
  "2026-06-22": "Paso a la Inmortalidad del General Belgrano",
  "2026-07-09": "Dia de la Independencia",
  "2026-07-10": "Feriado turistico",
  "2026-08-17": "Paso a la Inmortalidad del General San Martin",
  "2026-10-12": "Respeto a la Diversidad Cultural",
  "2026-11-23": "Dia de la Soberania Nacional",
  "2026-12-07": "Feriado turistico",
  "2026-12-08": "Inmaculada Concepcion de Maria",
  "2026-12-25": "Navidad"
};

export const MUSCLES = ["Pecho","Espalda","Hombros","Tríceps","Bíceps","Trapecio","Cuádriceps","Femorales","Glúteos","Pantorrillas","Lumbares","Aductores","Core"];
export const DAYS = [{key:"1",label:"Lun",abbr:"L"},{key:"2",label:"Mar",abbr:"M"},{key:"3",label:"Mié",abbr:"X"},{key:"4",label:"Jue",abbr:"J"},{key:"5",label:"Vie",abbr:"V"},{key:"6",label:"Sáb",abbr:"S"},{key:"0",label:"Dom",abbr:"D"}];

export const PLAN_SPLITS = {
  "4": { "1":"1", "2":"2", "3":"", "4":"4", "5":"5", "6":"", "0":"" },
  "5": { "1":"1", "2":"2", "3":"3", "4":"4", "5":"5", "6":"", "0":"" }
};

export const TARGETS = { prot: 165, carb: 180, fat: 70, kcal: 2000 };

export const HOME_FOODS = [
  { name:"Pechuga de Pollo (cruda)", p:23, c:0,  f:2,   unit:"100g"   },
  { name:"Huevo Entero",             p:6,  c:0.5, f:5,   unit:"unidad" },
  { name:"Carne Vacuna (magra)",     p:21, c:0,   f:6,   unit:"100g"   },
  { name:"Arroz (seco)",             p:7,  c:77,  f:1,   unit:"100g"   },
  { name:"Leche Entera",             p:3,  c:5,   f:1.5, unit:"100ml"  }
];

const mkSet = (reps, weight, rir, restSecs, restStr) => ({
  reps: String(reps), weight: String(weight), rir: String(rir), restSecs, restStr
});

export const trainingPlanRoutines = {
  "1": { id:"1", name:"Torso A", fullName:"DIA 1: Torso A", description:"Vector primario: empuje y tension mecanica", exercises:[
    { name:"Press banca plano", sets:[mkSet("11","65,0","2",180,"3 min"),mkSet("9","65,0","1",180,"3 min"),mkSet("8","65,0","1",180,"3 min")] },
    { name:"Remo 45° con barra", sets:[mkSet("13","40,0","2",150,"2,5 min"),mkSet("11","45,0","1",150,"2,5 min"),mkSet("9","50,0","1",150,"2,5 min")] },
    { name:"Press militar en Smith", sets:[mkSet("12","40,0","2",120,"2 min"),mkSet("10","45,0","1",120,"2 min"),mkSet("8","50,0","1",120,"2 min")] },
    { name:"Maquina de Jalon Dorsal Isolateral", sets:[mkSet("12","40,0","2",120,"2 min"),mkSet("10","45,0","1",120,"2 min"),mkSet("8","50,0","1",120,"2 min")] },
    { name:"Hombro vuelo lateral", sets:[mkSet("15","9,0","2",90,"1,5 min"),mkSet("12","9,0","1",90,"1,5 min"),mkSet("10","9,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Encogimientos de Trapecio", sets:[mkSet("15","21,0","2",90,"1,5 min"),mkSet("12","25,0","1",90,"1,5 min"),mkSet("12","25,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Cruces en polea alta", sets:[mkSet("15","15,0","1",90,"1,5 min"),mkSet("12","20,0","1",90,"1,5 min"),mkSet("12","20,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Cruces invertidos en polea", sets:[mkSet("15","5,0","1",90,"1,5 min"),mkSet("12","7,5","1",90,"1,5 min"),mkSet("12","7,5","0 (Fallo)",90,"1,5 min")] },
    { name:"Push-up Plus", sets:[mkSet("15","Peso corporal","2",90,"1,5 min"),mkSet("15","Peso corporal","1",90,"1,5 min"),mkSet("Fallo tecnico","Peso corporal","0",90,"1,5 min")] }
  ]},
  "2": { id:"2", name:"Pierna A + Brazos A", fullName:"DIA 2: Pierna A y Brazos A", description:"Vector primario: cuadriceps, gemelos, brazos y core", exercises:[
    { name:"Sentadilla Smith", sets:[mkSet("10","30,0","2",180,"3 min"),mkSet("8","40,0","1",180,"3 min"),mkSet("8","50,0","1",180,"3 min")] },
    { name:"Peso muerto mancuernas (Rumano)", sets:[mkSet("10","20,0","2",150,"2,5 min"),mkSet("8","25,0","2",150,"2,5 min"),mkSet("8","25,0","1",150,"2,5 min")] },
    { name:"Maquina cuadriceps (Extensiones Bilaterales)", sets:[mkSet("15","35,0","2",90,"1,5 min"),mkSet("12","40,0","1",90,"1,5 min"),mkSet("10","45,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Curl femoral tumbado", sets:[mkSet("15","25,0","2",90,"1,5 min"),mkSet("12","30,0","1",90,"1,5 min"),mkSet("10","35,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Aductores maquina", sets:[mkSet("15","65,0","1",90,"1,5 min"),mkSet("12","70,0","0 (Fallo)",90,"1,5 min"),mkSet("12","70,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Elevacion de Gemelos de pie", sets:[mkSet("Metodo 7-7-7","40,0","2",90,"1,5 min"),mkSet("Metodo 7-7-7","60,0","1",90,"1,5 min"),mkSet("Metodo 7-7-7","70,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Soleos banco", sets:[mkSet("20","20,0","2",90,"1,5 min"),mkSet("18","22,5","1",90,"1,5 min"),mkSet("15","25,0","1",90,"1,5 min"),mkSet("15","25,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Curl Biceps Martillo mancuernas", sets:[mkSet("12","10,0","1",90,"1,5 min"),mkSet("10","12,5","1",90,"1,5 min"),mkSet("10","12,5","0 (Fallo)",90,"1,5 min")] },
    { name:"Triceps polea con barra", sets:[mkSet("15","35,0","2",90,"1,5 min"),mkSet("12","40,0","1",90,"1,5 min"),mkSet("10","45,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Crunch en polea alta", sets:[mkSet("15","20,0","1",90,"1,5 min"),mkSet("15","20,0","1",90,"1,5 min"),mkSet("12","25,0","1",90,"1,5 min"),mkSet("12","25,0","1",90,"1,5 min")] },
    { name:"Pallof Press", sets:[mkSet("12","10,0","1",90,"1,5 min"),mkSet("12","10,0","1",90,"1,5 min"),mkSet("12","15,0","1",90,"1,5 min")] },
    { name:"Elevaciones de Tibial", sets:[mkSet("20","Peso corporal","2",90,"1,5 min"),mkSet("15","Peso corporal","1",90,"1,5 min"),mkSet("Fallo tecnico","Peso corporal","0",90,"1,5 min")] }
  ]},
  "3": { id:"3", name:"Accesorios + Core", fullName:"DIA 3: Accesorios y Core", description:"Vector primario: hombro lateral, brazos y estabilidad", exercises:[
    { name:"Hombro vuelo lateral", sets:[mkSet("15","9,0","2",90,"1,5 min"),mkSet("12","9,0","1",90,"1,5 min"),mkSet("10","9,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Encogimientos de Trapecio", sets:[mkSet("15","21,0","2",90,"1,5 min"),mkSet("12","25,0","1",90,"1,5 min"),mkSet("12","25,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Curl Biceps Martillo mancuernas", sets:[mkSet("12","10,0","1",90,"1,5 min"),mkSet("10","12,5","1",90,"1,5 min"),mkSet("10","12,5","0 (Fallo)",90,"1,5 min")] },
    { name:"Mancuernas biceps supino", sets:[mkSet("15","10,0","2",90,"1,5 min"),mkSet("12","12,5","1",90,"1,5 min"),mkSet("10","12,5","0 (Fallo)",90,"1,5 min")] },
    { name:"Triceps polea con barra", sets:[mkSet("15","35,0","2",90,"1,5 min"),mkSet("12","40,0","1",90,"1,5 min"),mkSet("10","45,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Triceps polea soga", sets:[mkSet("15","25,0","2",90,"1,5 min"),mkSet("12","30,0","1",90,"1,5 min"),mkSet("10","35,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Crunch en polea alta", sets:[mkSet("15","20,0","1",90,"1,5 min"),mkSet("15","20,0","1",90,"1,5 min"),mkSet("12","25,0","1",90,"1,5 min")] },
    { name:"Pallof Press", sets:[mkSet("12","10,0","1",90,"1,5 min"),mkSet("12","10,0","1",90,"1,5 min"),mkSet("12","15,0","1",90,"1,5 min")] }
  ]},
  "4": { id:"4", name:"Torso B", fullName:"DIA 4: Torso B", description:"Vector primario: traccion y postura", exercises:[
    { name:"Dominadas prono y neutras", sets:[mkSet("Max.","Peso propio","1",150,"2,5 min"),mkSet("Max.","Peso propio","1",150,"2,5 min"),mkSet("Max.","Peso propio","1",150,"2,5 min")] },
    { name:"Press inclinado mancuernas", sets:[mkSet("12","17,5","2",150,"2,5 min"),mkSet("10","20,0","1",150,"2,5 min"),mkSet("8","20,0","1",150,"2,5 min")] },
    { name:"Remo sentado en maquina unilateral", sets:[mkSet("12","20,0","2",90,"1,5 min"),mkSet("10","25,0","1",90,"1,5 min"),mkSet("8","30,0","1",90,"1,5 min")] },
    { name:"Mariposa (Pectoral)", sets:[mkSet("15","40,0","2",90,"1,5 min"),mkSet("12","50,0","1",90,"1,5 min"),mkSet("10","55,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Facepull en Polea Alta", sets:[mkSet("15","15,0","2",90,"1,5 min"),mkSet("12","20,0","1",90,"1,5 min"),mkSet("12","20,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Hombro vuelo lateral en polea baja", sets:[mkSet("15","5,0","2",90,"1,5 min"),mkSet("12","5,0","1",90,"1,5 min"),mkSet("12","5,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Push-up Plus", sets:[mkSet("15","Peso corporal","2",90,"1,5 min"),mkSet("15","Peso corporal","1",90,"1,5 min"),mkSet("Fallo tecnico","Peso corporal","0",90,"1,5 min")] }
  ]},
  "5": { id:"5", name:"Pierna B + Brazos B", fullName:"DIA 5: Pierna B y Brazos B", description:"Vector primario: asimetria, gluteos, lumbares, brazos y core", exercises:[
    { name:"Hip Thrust con Maquina", sets:[mkSet("12","60,0","2",150,"2,5 min"),mkSet("10","70,0","2",150,"2,5 min"),mkSet("8","80,0","1",150,"2,5 min")] },
    { name:"Sentadilla Bulgara en Smith", sets:[mkSet("12","20,0","2",120,"2 min"),mkSet("10","25,0","1",120,"2 min"),mkSet("10","25,0","1",120,"2 min")] },
    { name:"Curl femoral sentado", sets:[mkSet("10","30,0","2",90,"1,5 min"),mkSet("9","35,0","1",90,"1,5 min"),mkSet("8","40,0","0 (Fallo)",90,"1,5 min"),mkSet("15","60,0","1",90,"1,5 min"),mkSet("12","65,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Maquina cuadriceps unilateral", sets:[mkSet("15","20,0","2",90,"1,5 min"),mkSet("12","25,0","1",90,"1,5 min"),mkSet("10","30,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Abductores maquina", sets:[mkSet("15","50,0","2",90,"1,5 min"),mkSet("12","55,0","1",90,"1,5 min"),mkSet("12","60,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Elevacion de Gemelos (Prensa)", sets:[mkSet("15","70,0","2",90,"1,5 min"),mkSet("12","80,0","1",90,"1,5 min"),mkSet("10","90,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Extensiones Lumbares en Banco Romano", sets:[mkSet("15","Peso corporal","2",90,"1,5 min"),mkSet("12","5,0","1",90,"1,5 min"),mkSet("12","5,0","1",90,"1,5 min")] },
    { name:"Mancuernas biceps", sets:[mkSet("15","10,0","2",90,"1,5 min"),mkSet("12","12,5","1",90,"1,5 min"),mkSet("10","12,5","0 (Fallo)",90,"1,5 min")] },
    { name:"Triceps polea soga", sets:[mkSet("15","25,0","2",90,"1,5 min"),mkSet("12","30,0","1",90,"1,5 min"),mkSet("10","35,0","0 (Fallo)",90,"1,5 min")] },
    { name:"Elevacion de rodillas colgado", sets:[mkSet("Fallo tecnico (~15)","Peso corporal","0",90,"1,5 min"),mkSet("Fallo tecnico (~12)","Peso corporal","0",90,"1,5 min"),mkSet("Fallo tecnico (~10)","Peso corporal","0",90,"1,5 min"),mkSet("Fallo tecnico (~10)","Peso corporal","0",90,"1,5 min")] },
    { name:"Elevaciones de Tibial", sets:[mkSet("20","Peso corporal","2",90,"1,5 min"),mkSet("15","Peso corporal","1",90,"1,5 min"),mkSet("Fallo tecnico","Peso corporal","0",90,"1,5 min")] }
  ]}
};


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
