# Handoff Antigravity - IA de comidas en HOY

Objetivo: traer a la app modular la experiencia vieja de carga de comidas con IA dentro de HOY, sin volver al monolito. La pieza importante no es solo el resumen nutricional diario: lo que falta es el flujo por comida donde Enzo escribe un alimento/plato, toca IA, la app intenta usar recetas guardadas primero y si no encuentra nada llama a Gemini por `/.netlify/functions/get-macros`.

## Estado actual

Archivos relevantes:

- `app-main.js`
- `app-habits.js`
- `app-components.js`
- `app-core.js`
- `netlify/functions/get-macros.js`
- `netlify/functions/daily-nutrition-review.js`
- viejo: `C:/Users/castr/Downloads/index (1).html`

La app modular ya tiene estas piezas:

- `newDay()` en `app-core.js` conserva `meals: [{ items: [], firstBite: '', lastBite: '', aiDraft: '' }, ...]`.
- `get-macros.js` existe y ya llama Gemini para devolver `{ name, qty, cals, prot, carb, fat, nota }`.
- `daily-nutrition-review.js` existe y sirve para el resumen de micros/sugerencias.
- `SmartCena` y `NutritionReviewCard` existen en `app-components.js`.
- `app-habits.js` tiene algunos helpers de recetas, pero esta incompleto frente al viejo.

Lo que esta distinto/mal frente al codigo anterior:

- En `app-main.js`, `HabitsPanel` recibe `onMeal=${addMealItem}`. En el viejo recibia `onMeal=${updateMeal}`. Eso rompe `firstBite`, `lastBite` y `aiDraft`, porque `onMeal(mealIndex, field, value)` no es lo mismo que `onAddItem(mealIndex, item)`.
- En `app-habits.js`, el input actual de comida llama `onAddItem(mIdx, v)` con texto crudo. En el viejo el texto se guardaba en `meal.aiDraft` y recien se agregaba un item cuando la IA/receta devolvia macros.
- Falta el boton IA por comida, estado `aiLoading`, `aiError`, split preview, sugerencias de recetas, edicion de items, guardado como receta y descuento de stock.
- `app-core.js` tiene `dayTotals()` sumando propiedades directas de cada comida (`m.cals`, `m.prot`, etc.). En el modelo real los macros viven en `meal.items[]`, como en el viejo. Hay que restaurar `mealTotals()` y hacer que `dayTotals()` use esos items.
- En HOY faltan los bloques que estaban despues de `HabitsPanel`: macros elasticos del dia, `WaterTracker`, `NutritionReviewCard` y `SmartCena`. Parte de esto ahora esta metido dentro de `HabitsPanel`, pero para parecerse al anterior conviene dejarlo como bloque separado despues de comidas.

## Como era el flujo viejo

Referencia en `C:/Users/castr/Downloads/index (1).html`:

- Helpers de recetas/cantidades: lineas aprox. `2281-2605`.
- Carga de recetas guardadas, draft, split y analisis IA: lineas aprox. `2646-2940`.
- Guardar comida como receta y stock automatico: lineas aprox. `2951-3180`.
- UI de cada comida: lineas aprox. `3202-3395`.
- Render en HOY: lineas aprox. `10326-10350`.

El flujo viejo por comida era:

1. Cada comida tiene un input `aiDraft`.
2. El usuario escribe algo como `300g fideos con 200g carne` o `media pizza`.
3. Si detecta varias partes, muestra una vista previa editable y luego carga varias filas.
4. Antes de llamar a Gemini busca en `user_recipes`.
5. Si hay match exacto usa la receta guardada.
6. Si hay match fuzzy/ambiguo pregunta si usar biblioteca o internet.
7. Si no hay match llama `/.netlify/functions/get-macros`.
8. Agrega/reemplaza un item con macros en `meal.items`.
9. Limpia `aiDraft`.
10. Si el item viene de receta con stock compatible, descuenta stock.

## Cambios recomendados

### 1. Restaurar helpers de macros en `app-core.js`

Agregar/exportar `mealTotals()` y corregir `dayTotals()`.

```js
export const mealTotals = (meal) => (meal?.items || []).reduce(
  (acc, it) => ({
    cals: acc.cals + pn(it.cals),
    prot: acc.prot + pn(it.prot),
    carb: acc.carb + pn(it.carb),
    fat:  acc.fat  + pn(it.fat)
  }),
  { cals:0, prot:0, carb:0, fat:0 }
);

export const dayTotals = (meals = []) => (Array.isArray(meals) ? meals : []).reduce(
  (acc, meal) => {
    const t = mealTotals(meal);
    return {
      cals: acc.cals + t.cals,
      prot: acc.prot + t.prot,
      carb: acc.carb + t.carb,
      fat:  acc.fat  + t.fat
    };
  },
  { cals:0, prot:0, carb:0, fat:0 }
);
```

Despues asegurarse de que `index.html` mete `mealTotals` en `viewDeps` via `...core`, y que `app-habits.js` lo toma desde `deps`.

### 2. Arreglar el cableado de `app-main.js`

Restaurar `updateMeal` separado de `addMealItem`.

```js
const updateMeal = (mealIdx, field, value) => upd(w => {
  const day = w.tracker[activeDay] || newDay();
  const meals = [...(day.meals || newDay().meals)];
  meals[mealIdx] = { ...(meals[mealIdx] || newDay().meals[0]), [field]: value };
  return {
    ...w,
    tracker: {
      ...w.tracker,
      [activeDay]: { ...day, meals }
    }
  };
});
```

Y pasar props como en el viejo:

```js
<${HabitsPanel}
  tracker=${tracker}
  selectedDateKey=${activeDateKey}
  yesterdayFastMsg=${yesterdayFastMsg}
  onChange=${updateHabit}
  onMed=${updateMed}
  onMeal=${updateMeal}
  onAddItem=${addMealItem}
  onRemoveItem=${removeMealItem}
  onReplaceItem=${replaceMealItem}
/>
```

En la app actual no existen `updateHabit` y `updateMed` con esos nombres, pero ya estan inline. Antigravity puede extraerlos para que el render quede limpio:

```js
const updateHabit = (field, value) => upd(w => ({
  ...w,
  tracker: {
    ...w.tracker,
    [activeDay]: { ...(w.tracker[activeDay] || newDay()), [field]: value }
  }
}));

const updateMed = (field, value) => upd(w => {
  const day = w.tracker[activeDay] || newDay();
  return {
    ...w,
    tracker: {
      ...w.tracker,
      [activeDay]: {
        ...day,
        meds: { ...(day.meds || {}), [field]: value }
      }
    }
  };
});
```

### 3. Completar `app-habits.js` con la IA vieja, pero modular

Mantener `HabitsPanel` como modulo. No moverlo a `app-main.js`.

Dependencias que debe pedir a `deps`:

```js
mealTotals,
dayTotals,
fn,
pn,
supabase,
fetchJsonWithTimeout,
TARGETS,
HOME_FOODS,
WaterTracker,
ProteinProgress,
SmartCena,
NutritionReviewCard
```

Estados que faltan dentro de `HabitsPanel`:

```js
const [aiLoading, setAiLoading] = useState([false,false,false]);
const [aiError, setAiError] = useState(['','','']);
const [mealSplitEditOpen, setMealSplitEditOpen] = useState([false,false,false]);
const [mealSplitDrafts, setMealSplitDrafts] = useState(['','','']);
const [recipeSaving, setRecipeSaving] = useState([false,false,false]);
const [recipeMsg, setRecipeMsg] = useState(['','','']);
const [savedRecipes, setSavedRecipes] = useState([]);
const [recipesLoading, setRecipesLoading] = useState(true);
const [recipesError, setRecipesError] = useState('');
const [stockBusyKey, setStockBusyKey] = useState('');
const [editingMealItem, setEditingMealItem] = useState({ mealIndex:-1, itemIndex:-1 });
const recipesRef = useRef(null);
```

Helpers que conviene traer del viejo:

- `parseRecipeAmount`
- `parseRecipeCountNoun`
- `formatRecipeQty`
- `recipeTracksPantryStock`
- `findRecipeMatch` completo, devolviendo `{ kind:'exact'|'fuzzy'|'ambiguous', item/options }`
- `getRecipes`
- `pushRecipeSuggestionIntoDraft`
- `updateMealDraft`
- `clearMealDraft`
- `startEditMealItem`
- `splitMealDraftParts`
- `cleanMealPartPrefix`
- `getMealAnalysisParts`
- `prepareMealSplitEditor`
- `analyzeMealParts`
- `confirmMealSplitPreview`
- `analyzeSingleMealEntry`
- `analyzeMeal`
- `saveMealAsRecipe`
- `discountItemStock`

El `analyzeSingleMealEntry` deberia usar `fetchJsonWithTimeout` en vez de `fetch` directo para respetar la modularizacion actual:

```js
const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/get-macros', {
  method:'POST',
  headers:{ 'Content-Type':'application/json' },
  body: JSON.stringify({ meal: text })
});
if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

const nextItem = {
  name: data.name || text,
  qty: data.qty || '1 porcion',
  cals: Math.round(parseFloat(data.cals) || 0),
  prot: Math.round(parseFloat(data.prot) || 0),
  carb: Math.round(parseFloat(data.carb) || 0),
  fat: Math.round(parseFloat(data.fat) || 0),
  nota: data.nota || ''
};
```

### 4. Rehacer la UI de comidas como la anterior

En `app-habits.js`, reemplazar el input simple actual:

```js
<${Inp} placeholder="Añadir alimento o receta..." onChange=${v=>onAddItem(mIdx,v)} />
```

por el bloque viejo:

- input controlado por `m.aiDraft`
- boton `LIMPIAR`
- boton `IA`
- preview de split cuando hay varias partes
- chips de recetas guardadas
- lista `meal.items`
- boton editar item
- boton borrar item
- totales de comida
- boton `GUARDAR COMO RECETA`
- horarios `firstBite` / `lastBite`

La parte clave minima del input:

```js
<input
  type="text"
  value=${m.aiDraft || ''}
  onInput=${e => updateMealDraft(i, e.target.value)}
  onKeyDown=${e => { if(e.key === 'Enter' && !loading) analyzeMeal(i); }}
  placeholder="Sumar alimento a la leyenda..."
  disabled=${loading}
/>

<button
  onClick=${() => analyzeMeal(i)}
  disabled=${loading || !String(m.aiDraft || '').trim()}
  title="Analizar con IA y sumar">
  ${loading ? '...' : 'IA'}
</button>
```

Importante: no usar `onAddItem` para texto crudo. `onAddItem` solo debe recibir objetos item ya resueltos, por ejemplo:

```js
{
  name: 'Fideos',
  qty: '300g (cocido)',
  cals: 470,
  prot: 16,
  carb: 95,
  fat: 3,
  nota: 'Estimacion conservadora'
}
```

### 5. Restaurar los bloques de HOY despues de comidas

En el viejo, despues de `HabitsPanel` venia este orden:

```js
<${HabitsPanel} ... />

<div class="glass-card" style="padding:10px 12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
  ${[
    {label:'Prot restante', val:Math.max(0,Math.round(TARGETS.prot - dayTotals(tracker.meals||[]).prot))+'g', color:'#10B981'},
    {label:'Carbos disp.',  val:Math.max(0,Math.round((TARGETS.kcal - TARGETS.prot*4 - dayTotals(tracker.meals||[]).fat*9)/4 - dayTotals(tracker.meals||[]).carb))+'g', color:'#6366F1'},
    {label:'Kcal objetivo', val:fn(TARGETS.kcal), color:'#F59E0B'},
  ].map(({label,val,color})=>html`
    <div>
      <p style="margin:0;font-size:9px;text-transform:uppercase;color:#64748b;">${label}</p>
      <p style="margin:0;font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${color};">${val}</p>
    </div>
  `)}
</div>

<${WaterTracker}
  val=${tracker.water || 0}
  onChange=${v => updateHabit('water', v)}
  roacuttan=${tracker.meds?.roacuttan || false}
/>

<${NutritionReviewCard}
  currentDateKey=${activeDateKey}
  currentTracker=${tracker}
  previousDateKey=${previousSnapshot.dateKey}
  previousTracker=${previousSnapshot.tracker}
/>

<${SmartCena}
  currentProt=${dayTotals(tracker.meals || []).prot}
  tracker=${tracker}
/>
```

Para esto en `app-main.js` hay que calcular:

```js
const previousSnapshot = getRelativeDaySnapshot(allWeeks, currentWk, activeDay, -1);
```

Actualmente `getRelativeDaySnapshot` se importa desde `createHabitsPanel`, pero no se usa. Hay que usarlo para `NutritionReviewCard`.

Nota: si se deja `WaterTracker` dentro de `HabitsPanel`, no duplicarlo. Para volver al look anterior, mejor sacarlo de `HabitsPanel` y dejarlo como bloque externo como estaba.

## Checklist para Antigravity

- [ ] Exportar `mealTotals` desde `app-core.js`.
- [ ] Corregir `dayTotals` para sumar `meal.items`.
- [ ] Inyectar `mealTotals` en `app-habits.js`.
- [ ] Crear `updateMeal`, `updateHabit`, `updateMed` en `app-main.js`.
- [ ] Pasar `onMeal=${updateMeal}` a `HabitsPanel`.
- [ ] No llamar `onAddItem` con strings.
- [ ] Completar `HabitsPanel` con el flujo viejo de IA por comida.
- [ ] Usar `fetchJsonWithTimeout('/.netlify/functions/get-macros')`.
- [ ] Reutilizar `user_recipes` antes de llamar a Gemini.
- [ ] Mantener `daily-nutrition-review` para el resumen de micros.
- [ ] Volver a renderizar `NutritionReviewCard` en HOY con `previousSnapshot`.
- [ ] Evitar duplicar agua/asistente si se decide moverlos fuera de `HabitsPanel`.

## Resultado esperado

En HOY, la seccion de comidas debe sentirse como la anterior:

- Se escribe una comida en texto libre.
- Se toca IA.
- La app carga una fila con cantidad, nombre, proteina y macros.
- Si escribis una receta guardada, la usa antes que Gemini.
- Si escribis varias cosas separables, propone cargarlas como varias filas.
- Se pueden editar/borrar items.
- Se puede guardar una comida completa como receta.
- Los totales diarios, el asistente nutricional y el cierre con IA vuelven a calcularse sobre `meal.items`.
