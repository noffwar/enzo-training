# Handoff Antigravity - conexiones faltantes entre app vieja y modular

Este documento lista conexiones que existian en `C:/Users/castr/Downloads/index (1).html` y que en la app modular actual quedaron cortadas, incompletas o conectadas con una forma distinta. No es para reemplazar la app: es una guia para volver a conectar piezas manteniendo los modulos.

## P0 - HOY comida escrita -> biblioteca de recetas

Archivos actuales:

- `app-habits.js`
- `app-main.js`
- `app-core.js`
- `netlify/functions/get-macros.js`

Referencia vieja:

- `index (1).html` aprox. `2281-2940`
- `index (1).html` aprox. `3202-3370`

### Problema actual

En `app-habits.js`, `findRecipeMatch()` puede encontrar una receta, pero devuelve la receta cruda:

```js
if(names.includes(...) || keys.includes(...)) return r;
```

Despues, `analyzeMeal()` espera otra forma:

```js
const recipeSearch = findRecipeMatch(recipes, text);
const recipeHit = recipeSearch?.item || (recipeSearch?.options ? recipeSearch.options[0] : null);
```

Entonces, aunque escribas una comida que ya existe en recetas, `recipeHit` queda `null` y la app cae a `/.netlify/functions/get-macros`. Este es justo el caso: "escribir alguna comida y que reconozca si ya estaba cargada en recetas".

### Como era antes

El viejo `findRecipeMatch()` devolvia:

```js
{ kind:'exact', item }
{ kind:'fuzzy', item }
{ kind:'ambiguous', options }
null
```

Ademas construia un item completo con metadata de receta:

```js
{
  name: recipe.recipe_name,
  qty,
  nota: recipe.notes || 'Receta guardada',
  recipe_id: recipe.id,
  recipe_name: recipe.recipe_name,
  stock_qty: ...,
  stock_unit: ...,
  low_stock_threshold: ...,
  stock_trackable: ...,
  stock_delta,
  stock_delta_unit,
  cals,
  prot,
  carb,
  fat
}
```

### Que deberia hacer Antigravity

- Corregir el contrato: o `findRecipeMatch()` devuelve `{ kind, item/options }`, o `analyzeMeal()` acepta receta cruda. Mejor volver al contrato viejo.
- Traer el `findRecipeMatch()` completo del viejo, incluyendo:
  - match exacto
  - match fuzzy
  - ambiguedad
  - cantidades tipo `media`, `1/2`, `2 unidades`, `300g`, `1 porcion`
  - escalado de macros
  - metadata de stock
- Si se usa biblioteca, no llamar Gemini.
- Si no hay match, llamar `fetchJsonWithTimeout('/.netlify/functions/get-macros')`.

## P0 - Items de comida -> stock automatico de recetas

Archivos actuales:

- `app-habits.js`
- `app-main.js`
- `app-recipes.js`

Referencia vieja:

- `index (1).html` aprox. `2581-2588`
- `index (1).html` aprox. `3000-3048`
- `index (1).html` aprox. `9795-9815`

### Problema actual

Aunque se arregle el match de recetas, el item que se agrega hoy en `app-habits.js` solo tiene:

```js
{
  name,
  qty,
  cals,
  prot,
  carb,
  fat,
  nota
}
```

No guarda `recipe_id`, `stock_delta`, `stock_delta_unit`, `stock_trackable`, etc. Por eso:

- no se puede descontar stock al comer una receta
- no se puede restaurar stock si se borra el item
- no se puede recalcular correctamente si luego se edita la receta

### Que deberia hacer Antigravity

- Cuando el item viene de `user_recipes`, agregar toda la metadata vieja.
- Reinstalar `discountItemStock(mealIndex, item)` dentro de `app-habits.js`.
- Llamar `discountItemStock()` solo si:
  - `item.recipe_id` existe
  - `item.stock_trackable !== false`
  - `stock_unit` y `stock_delta_unit` coinciden normalizados
- En `app-main.js`, ajustar `restoreRemovedItemStock()` para respetar `stock_trackable` y unidades, como antes.

## P0 - Recetas editadas -> comidas historicas

Archivos actuales:

- `app-recipes.js`
- `app-main.js`

Referencia vieja:

- `index (1).html` aprox. `9706-9785`
- `index (1).html` render aprox. `10369`

### Problema actual

`app-recipes.js` todavia expone la conexion:

```js
return function RecipesView({ session, onRecipeUpdated }) { ... }
```

Y al editar receta llama:

```js
onRecipeUpdated?.(data);
```

Pero `app-main.js` renderiza:

```js
<${RecipesView} session=${session} />
```

O sea: el callback existe, pero no esta conectado. En la app vieja se pasaba:

```js
<${RecipesView} session=${session} onRecipeUpdated=${recalculateMealsUsingRecipe}/>
```

### Impacto

Si editas una receta en RECETAS, los items ya cargados en comidas viejas no actualizan macros/nombre/notas. Esto rompe la coherencia entre biblioteca y diario nutricional.

### Que deberia hacer Antigravity

- Traer a `app-main.js` los helpers viejos:
  - `normalizeRecipeKeyApp`
  - `scaleRecipeMacrosApp`
  - `getRecipeUsageFactorApp`
  - `rebuildMealItemFromRecipeApp`
  - `mealItemUsesRecipeApp`
  - `recalculateMealsUsingRecipe`
- Conectar:

```js
<${RecipesView}
  session=${session}
  onRecipeUpdated=${recalculateMealsUsingRecipe}
/>
```

- Asegurar que `recalculateMealsUsingRecipe()` actualice `allWeeks`, `lsDaySave()` y `saveDayRemote()` para cada dia tocado.

## P1 - HOY medicacion -> stock de salud

Archivos actuales:

- `app-main.js`
- `app-habits.js`
- `app-health.js`

Referencia vieja:

- `index (1).html` aprox. `9491-9635`

### Problema actual

En la modular actual, `updateMed()` en `app-main.js` solo actualiza el tracker:

```js
meds: { ...(day.meds || {}), [field]: value }
```

En la vieja, `updateMed()` tambien llamaba:

```js
syncMedsInventoryFromToggle(med, v, targetDateKey);
```

Ese helper ajustaba `app_inventory.meds_stock`, localStorage, historial y fechas como:

- `last_taken_at`
- `last_roaccutan_at`
- `last_dinner_meds_at`
- `last_dinner_logical_date`

### Impacto

Marcar Roaccutan o combo cena desde HOY ya no descuenta/devuelve stock de Salud. Tambien se pierde la logica especial de cena cuando despues de medianoche corresponde imputar la cena al dia logico anterior.

### Que deberia hacer Antigravity

- Reinstalar `syncMedsInventoryFromToggle()` en `app-main.js` o extraerlo a un modulo compartido.
- Hacer que `updateMed()` calcule `targetDateKey` como antes:
  - medicacion de cena usa `getDinnerLogicalDateKey(now)` cuando corresponde
  - Roaccutan usa el dia calendario actual
- Actualizar tracker del `targetDateKey`, no siempre del `activeDay`.
- Actualizar `app_inventory.meds_stock` y emitir `enzo-health-changed`.

## P1 - Salud -> tracker diario remoto

Archivos actuales:

- `app-main.js`
- `app-health.js`

Referencia vieja:

- `index (1).html` aprox. `9491-9523`

### Problema actual

`HealthView` llama `onSyncDailyMeds(partial, dateKey)`, pero en `app-main.js` el callback actual solo hace `upd(...)`. La persistencia remota general de `app-main.js` solo compara y guarda el `activeDayRef.current`.

Si Salud sincroniza otro dia distinto al activo, queda muy probable que:

- localStorage se actualice por el loop general
- Supabase no reciba `saveDayRemote()` para ese `dateKey`

En la vieja, `syncTodayMedsFromHealth()` guardaba explicitamente:

```js
await saveDayRemote(todayDate, nextDayState, null, nextDayState._revision || null);
```

### Que deberia hacer Antigravity

- Reemplazar el inline de `onSyncDailyMeds` por una funcion tipo `syncTodayMedsFromHealth`.
- Que esa funcion:
  - calcule week/day desde `targetDateKey`
  - actualice `allWeeks`
  - haga `lsDaySave(targetDateKey, nextDayState)`
  - llame `saveDayRemote(supabase, targetDateKey, nextDayState, session, revision)`

## P1 - Edicion de item de comida

Archivos actuales:

- `app-habits.js`
- `app-main.js`

Referencia vieja:

- `index (1).html` aprox. `2701-2707`
- `index (1).html` aprox. `2821-2855`
- `index (1).html` aprox. `3345`

### Problema actual

`HabitsPanel` recibe `onReplaceItem`, pero no lo usa. En la UI actual solo se puede borrar item. En la vieja habia boton editar: ponia el item en `aiDraft`, y al analizar reemplazaba la fila existente. Si el item anterior tenia stock, lo restauraba.

### Que deberia hacer Antigravity

- Reinstalar `editingMealItem`.
- Agregar boton editar por item.
- En `analyzeMeal()` / `analyzeSingleMealEntry()`:
  - si hay `editingMealItem`, llamar `onReplaceItem(mealIndex, itemIndex, nextItem, previousItem)`
  - si no, llamar `onAddItem(mealIndex, nextItem)`

## P1 - Comida compuesta -> split en varias filas

Archivos actuales:

- `app-habits.js`

Referencia vieja:

- `index (1).html` aprox. `2728-2788`
- `index (1).html` aprox. `3259-3306`

### Problema actual

La app modular actual manda todo el texto completo a una sola llamada de IA. La vieja detectaba entradas tipo:

- `300g arroz + 200g pollo`
- `1 yogur, 1 banana`
- `2 tostadas con 1 huevo`

y proponia cargarlas como varias filas editables.

### Que deberia hacer Antigravity

- Traer:
  - `splitMealDraftParts`
  - `cleanMealPartPrefix`
  - `getMealAnalysisParts`
  - `prepareMealSplitEditor`
  - `confirmMealSplitPreview`
  - `analyzeMealParts`
- Renderizar la vista previa editable antes de llamar IA.

## P2 - Chips de recetas sugeridas en cada comida

Archivos actuales:

- `app-habits.js`

Referencia vieja:

- `index (1).html` aprox. `2620-2675`
- `index (1).html` aprox. `3206-3318`

### Problema actual

La app modular actual consulta recetas solo al tocar IA. La vieja cargaba `savedRecipes`, mostraba chips debajo del input y permitia completar el draft con una receta guardada.

### Que deberia hacer Antigravity

- Reinstalar estado:

```js
const [savedRecipes, setSavedRecipes] = useState([]);
const [recipesLoading, setRecipesLoading] = useState(true);
const [recipesError, setRecipesError] = useState('');
```

- Cargar recetas en `useEffect`.
- Refrescar en `focus` / `visibilitychange`.
- Agregar `pushRecipeSuggestionIntoDraft()`.
- Renderizar chips `+ receta`.

## P2 - Guardar comida como receta

Archivos actuales:

- `app-habits.js`
- `app-recipes.js`

Referencia vieja:

- `index (1).html` aprox. `2946-2995`
- `index (1).html` aprox. `3370`

### Problema actual

La modular actual puede cargar items, pero ya no aparece el flujo "GUARDAR COMO RECETA" desde una comida del diario.

### Que deberia hacer Antigravity

- Reinstalar `saveMealAsRecipe(mealIndex)`.
- Crear receta en `user_recipes` con:
  - `recipe_name`
  - `base_qty: 1`
  - `base_unit: 'porcion'`
  - macros desde `mealTotals(meal)`
  - ingredients desde `meal.items`
  - notes: `'Guardada desde una comida del diario'`
- Refrescar `savedRecipes`.

## Resumen de prioridad

1. Primero arreglar el contrato `findRecipeMatch()` -> `analyzeMeal()`. Sin eso no reconoce recetas guardadas.
2. Despues restaurar metadata de receta y stock en los items.
3. Conectar `RecipesView.onRecipeUpdated` con `recalculateMealsUsingRecipe`.
4. Restaurar `syncMedsInventoryFromToggle()` para que HOY y SALUD vuelvan a hablar entre si.
5. Luego sumar comodidad: editar items, split preview, chips y guardar comida como receta.

