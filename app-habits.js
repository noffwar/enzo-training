import { h } from 'https://esm.sh/preact';
import { useState, useEffect, useCallback, useRef, useMemo } from 'https://esm.sh/preact/hooks';
import htm from 'https://esm.sh/htm';

const html = htm.bind(h);

export const createHabitsPanel = (deps) => {
  const {
    pn, fn, ft, dayTotals, getMedicationStatusForView, getFastStats,
    Card, SectionAccordion, Inp, CheckRow,
    ProteinProgress, WaterTracker, SmartCena, NutritionReviewCard,
    IChevD, ICheck, IPlay, IPause, IReset, ICal, ISync, IHome, IBar, ITarget, IBook, IBell, IEdit, IList, IDumb, IActivity, IClock,
    supabase, DEVICE_ID, fetchJsonWithTimeout, TARGETS, HOME_FOODS,
    localDateKey, getDayDate, getWeekKey, isValidDateValue, mealTotals
  } = deps;

  // --- Helpers Locales (Legacy Restoration) ---

  const getYesterdayFast = (allWeeks, currentWk, activeDay) => {
    try {
      const todayDt = new Date(getDayDate(currentWk, parseInt(activeDay, 10)) + 'T12:00:00');
      const prevDt = new Date(todayDt); prevDt.setDate(prevDt.getDate() - 1);
      const prevWk = getWeekKey(prevDt);
      const prevDayIdx = prevDt.getDay();
      const prevTracker = allWeeks[prevWk]?.tracker?.[prevDayIdx];
      if(prevTracker && prevTracker.fasted && prevTracker.fastStartTime && prevTracker.fastHours) {
        const [sH, sM] = prevTracker.fastStartTime.split(':').map(Number);
        const dur = pn(prevTracker.fastHours);
        if(!isNaN(sH) && dur > 0) {
          const startDateTime = new Date(prevDt);
          startDateTime.setHours(sH, sM, 0, 0);
          const endDateTime = new Date(startDateTime.getTime() + (dur * 3600000));
          const todayStart = new Date(todayDt); todayStart.setHours(0,0,0,0);
          if(endDateTime > todayStart) {
             const finH = String(endDateTime.getHours()).padStart(2,'0');
             const finM = String(endDateTime.getMinutes()).padStart(2,'0');
             return `⏳ Ayuno de ayer en curso: finaliza a las ${finH}:${finM}`;
          }
        }
      }
    } catch(e) {}
    return null;
  };

  const getRelativeDaySnapshot = (allWeeks, currentWk, activeDay, offsetDays) => {
    try {
      const baseDate = new Date(getDayDate(currentWk, parseInt(activeDay, 10)) + 'T12:00:00');
      baseDate.setDate(baseDate.getDate() + offsetDays);
      const wkKey = getWeekKey(baseDate);
      const dayIdx = String(baseDate.getDay());
      const tracker = allWeeks[wkKey]?.tracker?.[dayIdx] || null;
      return {
        dateKey: getDayDate(wkKey, parseInt(dayIdx, 10)),
        tracker
      };
    } catch(_) {
      return { dateKey:'', tracker:null };
    }
  };

  const normalizeFoodText = (s='') =>
    String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

  const normalizeRecipeText = normalizeFoodText;

  const parseLeadingRecipeAmount = (text='') => {
    const raw = String(text || '').trim().toLowerCase();
    if(!raw) return null;
    let match = raw.match(/^(\d+)\s*\/\s*(\d+)(?:\s+(.*))?$/);
    if(match) return { value: parseFloat(match[2])?parseFloat(match[1])/parseFloat(match[2]):0, rest:String(match[3]||'').trim(), label:`${match[1]}/${match[2]}` };
    match = raw.match(/^(media|medio)(?:\s+(.*))?$/);
    if(match) return { value: 0.5, rest: String(match[2] || '').trim(), label: match[1] };
    match = raw.match(/^(una|un|1)\s+y\s+media(?:\s+(.*))?$/);
    if(match) return { value: 1.5, rest: String(match[2] || '').trim(), label: String(match[0] || '').trim() };
    match = raw.match(/^(\d+(?:[.,]\d+)?)(?:\s+y\s+media)?(?:\s+(.*))?$/);
    if(match) {
      const base = parseFloat(String(match[1]).replace(',', '.'));
      const hasHalf = /\s+y\s+media(?:\s|$)/.test(raw);
      return { value: base + (hasHalf ? 0.5 : 0), rest: String(match[2] || '').trim(), label: hasHalf ? `${match[1]} y media` : String(match[1]) };
    }
    return null;
  };

  const parseRecipeAmount = (text='') => {
    const raw = String(text || '').toLowerCase().trim();
    const lead = parseLeadingRecipeAmount(raw);
    const amountPart = lead ? raw.slice(0, raw.length - lead.rest.length).trim() : raw;
    const m = amountPart.match(/(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|media|medio|una\s+y\s+media|un\s+y\s+media|1\s+y\s+media)\s*(kg|g|gramos?|porciones?|porcion|u|unidades?)/);
    if(!m) return null;
    const parsed = parseLeadingRecipeAmount(`${m[1]} x`) || { value: parseFloat(String(m[1]).replace(',', '.')) || 0 };
    return { value: parsed.value, unit: m[2] };
  };

  const parseRecipeCountNoun = (text='') => {
    const parsed = parseLeadingRecipeAmount(text);
    if(!parsed || !(parsed.value > 0) || !parsed.rest) return null;
    return { value: parsed.value, noun: normalizeRecipeText(parsed.rest || ''), label: parsed.label || '', rawRest: String(parsed.rest || '').trim() };
  };

  const stripRecipeAmount = (text='') => {
    const parsed = parseLeadingRecipeAmount(text);
    if(parsed?.rest) return normalizeRecipeText(parsed.rest);
    return normalizeRecipeText(String(text).replace(/(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+|media|medio|una\s+y\s+media|un\s+y\s+media|1\s+y\s+media)\s*(kg|g|gramos?|porciones?|porcion|u|unidades?)/ig, ' '));
  };

  const singularizeWord = (word='') => {
    const w = String(word || '').trim();
    if(!w) return '';
    if(w.endsWith('es') && w.length > 4) return w.slice(0, -2);
    if(w.endsWith('s') && w.length > 3) return w.slice(0, -1);
    return w;
  };

  const normalizeRecipeKey = (text='') =>
    normalizeRecipeText(text).split(' ').filter(Boolean).map(singularizeWord).join(' ');

  const unitToGrams = (value, unit) => {
    const u = String(unit||'').toLowerCase();
    if(u === 'kg') return value * 1000;
    if(['g','gramo','gramos'].includes(u)) return value;
    return null;
  };

  const unitToPortions = (value, unit) => {
    const u = String(unit||'').toLowerCase();
    if(['porcion','porciones'].includes(u)) return value;
    return null;
  };

  const formatRecipeQty = (value, unit) => {
    const n = Number(value);
    const rounded = Math.round(n * 100) / 100;
    let clean = '';
    if(Number.isInteger(rounded)) {
      clean = String(rounded);
    } else {
      const whole = Math.trunc(rounded);
      const fraction = Math.abs(rounded - whole);
      if(Math.abs(fraction - 0.5) < 0.01) {
        clean = whole === 0 ? '1/2' : `${whole} 1/2`;
      } else {
        clean = String(rounded).replace('.', ',');
      }
    }
    return `${clean} ${unit}`.trim();
  };

  const normalizeStockUnit = (unit='') => {
    const u = normalizeRecipeText(unit);
    if(!u) return '';
    if(['g','gramo','gramos'].includes(u)) return 'g';
    if(u === 'kg') return 'kg';
    if(['porcion','porciones'].includes(u)) return 'porcion';
    if(['unidad','unidades','u'].includes(u)) return 'unidad';
    return u;
  };

  const scaleRecipeMacros = (recipe, factor) => {
    const m = recipe.macros || {};
    return {
      cals: Math.round((parseFloat(m.cals)||0)*factor),
      prot: Math.round((parseFloat(m.prot)||0)*factor),
      carb: Math.round((parseFloat(m.carb)||0)*factor),
      fat:  Math.round((parseFloat(m.fat)||0)*factor)
    };
  };

  const recipeHasIngredientList = (recipe) => Array.isArray(recipe?.ingredients) && recipe.ingredients.some(it => String(it?.name||'').trim());

  const recipeTracksPantryStock = (recipe) => {
    if(!recipe) return false;
    if(recipeHasIngredientList(recipe)) return false;
    return !(recipe.stock_qty == null || recipe.stock_qty === '') && !!normalizeStockUnit(recipe.stock_unit || '');
  };

  const getRecipeUsageFactor = (recipe, item) => {
    const bQ = parseFloat(recipe?.base_qty) || 1;
    const bU = normalizeStockUnit(recipe?.base_unit || '');
    const sU = normalizeStockUnit(recipe?.stock_unit || '');
    const delta = parseFloat(item?.stock_delta);
    const dU = normalizeStockUnit(item?.stock_delta_unit || item?.stock_unit || '');
    if(delta > 0 && dU) {
      const dG = unitToGrams(delta, dU); const bG = unitToGrams(bQ, bU);
      if(dG && bG) return dG / bG;
      const dP = unitToPortions(delta, dU); const bP = unitToPortions(bQ, bU);
      if(dP && bP) return dP / bP;
      if(dU === 'unidad' && (bU === 'unidad' || sU === 'unidad')) return delta / bQ;
      if(dU === 'porcion' && bU === 'porcion') return delta / bQ;
    }
    const bC = parseFloat(recipe?.macros?.cals) || 0;
    const iC = parseFloat(item?.cals) || 0;
    if(bC > 0 && iC > 0) return iC / bC;
    return 1;
  };

  const findRecipeMatch = (recipes, inputText) => {
    const raw = String(inputText || '').trim();
    if(!raw) return null;
    const normalizedFull = normalizeRecipeText(raw);
    const normalizedNameOnly = stripRecipeAmount(raw);
    const normalizedFullKey = normalizeRecipeKey(raw);
    const normalizedNameKey = normalizeRecipeKey(normalizedNameOnly);
    const parsedAmount = parseRecipeAmount(raw);
    const parsedCountNoun = parseRecipeCountNoun(raw);
    const parsedCountNounKey = parsedCountNoun ? normalizeRecipeKey(parsedCountNoun.noun) : '';
    const exactMatches = [];
    const fuzzyMatches = [];

    for(const recipe of (recipes || [])) {
      const names = [recipe.recipe_name, ...(recipe.aliases||[])].filter(Boolean).map(normalizeRecipeText);
      const keys = [recipe.recipe_name, ...(recipe.aliases||[])].filter(Boolean).map(normalizeRecipeKey);
      
      const exact = names.includes(normalizedFull) || names.includes(normalizedNameOnly) || keys.includes(normalizedFullKey) || keys.includes(normalizedNameKey) || (parsedCountNounKey && keys.includes(parsedCountNounKey));
      
      const fuzzy = !exact && (
        keys.some(k => {
          if(!k) return false;
          const words = k.split(' ').filter(Boolean);
          if(words.length === 1 && words[0].length <= 3) return false;
          return normalizedFullKey.startsWith(k) || normalizedNameKey.startsWith(k) || k.startsWith(normalizedFullKey) || k.startsWith(normalizedNameKey) || normalizedFullKey.endsWith(` ${k}`) || normalizedNameKey.endsWith(` ${k}`);
        }) || (parsedCountNounKey && keys.some(k => k && (parsedCountNounKey.includes(k) || k.includes(parsedCountNounKey))))
      );

      if(!exact && !fuzzy) continue;

      let factor = 1;
      let qty = formatRecipeQty(recipe.base_qty || 1, recipe.base_unit || 'porcion');
      let stockDelta = parseFloat(recipe.base_qty) || 1;
      let stockDeltaUnit = normalizeStockUnit(recipe.base_unit || 'porcion');

      if(parsedAmount?.value > 0) {
        const baseQty = parseFloat(recipe.base_qty) || 1;
        const inputGrams = unitToGrams(parsedAmount.value, parsedAmount.unit);
        const baseGrams = unitToGrams(baseQty, recipe.base_unit);
        if(inputGrams && baseGrams) {
          factor = inputGrams / baseGrams;
          qty = `${formatRecipeQty(parsedAmount.value, parsedAmount.unit)} (${recipe.base_unit})`;
          stockDelta = parsedAmount.value;
          stockDeltaUnit = normalizeStockUnit(parsedAmount.unit);
        }
      } else if(parsedCountNoun?.value > 0 && (normalizeStockUnit(recipe.base_unit || '') === 'unidad' || normalizeStockUnit(recipe.stock_unit || '') === 'unidad' || normalizeStockUnit(recipe.base_unit || '') === 'porcion')) {
        const baseQty = parseFloat(recipe.base_qty) || 1;
        factor = parsedCountNoun.value / baseQty;
        qty = formatRecipeQty(parsedCountNoun.value, normalizeStockUnit(recipe.base_unit || '') === 'porcion' ? (parsedCountNoun.value === 1 ? 'porcion':'porciones') : (parsedCountNoun.value === 1 ? 'unidad':'unidades'));
        stockDelta = parsedCountNoun.value;
        stockDeltaUnit = normalizeStockUnit(recipe.base_unit || '') === 'porcion' ? 'porcion' : 'unidad';
      }

      const result = {
        name: recipe.recipe_name,
        qty,
        nota: recipe.notes || 'Receta guardada',
        recipe_id: recipe.id,
        recipe_name: recipe.recipe_name,
        stock_qty: recipeTracksPantryStock(recipe) ? recipe.stock_qty : null,
        stock_unit: recipeTracksPantryStock(recipe) ? (recipe.stock_unit || '') : '',
        low_stock_threshold: recipe.low_stock_threshold,
        stock_trackable: recipeTracksPantryStock(recipe),
        stock_delta: stockDelta,
        stock_delta_unit: stockDeltaUnit,
        ...scaleRecipeMacros(recipe, factor)
      };
      if(exact) exactMatches.push(result); else fuzzyMatches.push(result);
    }

    if(exactMatches.length === 1) return { kind:'exact', item: exactMatches[0] };
    if(exactMatches.length > 1) return { kind:'ambiguous', options: exactMatches.slice(0,3) };
    if(fuzzyMatches.length === 1) return { kind:'fuzzy', item: fuzzyMatches[0] };
    if(fuzzyMatches.length > 1) return { kind:'ambiguous', options: fuzzyMatches.slice(0,3) };
    return null;
  };

  const splitMealDraftParts = (text='') => {
    const raw = String(text || '').trim();
    if(!raw) return [];
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const normalizedForSplit = normalized
      .replace(/\s+y\s+(?=(\d+|,|media|medio|una|un)\b)/ig, ' | ')
      .replace(/,\s*(?=(\d+|,|media|medio|una|un)\b)/ig, ' | ')
      .replace(/\s*\+\s*(?=(\d+|,|media|medio|una|un)\b)/ig, ' | ');
    const parts = normalizedForSplit.split(/\s*\|\s*/i).map(part => part.trim()).filter(Boolean);
    return parts.length > 1 ? parts : [normalized];
  };

  const cleanMealPartPrefix = (text='') => String(text || '').replace(/^(?:con|mas|más|acompañado de|acompanado de|postre|de postre|bebida|de bebida)\s*:?\s+/i, '').trim();

  // --- HabitsPanel Component ---

  const HabitsPanel = ({tracker:t, selectedDateKey, yesterdayFastMsg, onChange, onMed, onMeal, onAddItem, onRemoveItem, onReplaceItem}) => {
    const [open, setOpen] = useState(true);
    const [aiLoading, setAiLoading] = useState([false,false,false]);
    const [aiError, setAiError] = useState(['','','']);
    const [savedRecipes, setSavedRecipes] = useState([]);
    const [recipesLoading, setRecipesLoading] = useState(false);
    
    // Split States
    const [mealSplitEditOpen, setMealSplitEditOpen] = useState([false,false,false]);
    const [mealSplitDrafts, setMealSplitDrafts] = useState(['','','']);
    
    // Edit State
    const [editingMealItem, setEditingMealItem] = useState({ mealIndex:-1, itemIndex:-1 });
    
    // Stock Busy
    const [stockBusyKey, setStockBusyKey] = useState('');
    const [recipeMsg, setRecipeMsg] = useState(['','','']);
    const [recipeSaving, setRecipeSaving] = useState([false,false,false]);

    const recipesRef = useRef(null);

    const getRecipes = async () => {
      if(recipesRef.current) return recipesRef.current;
      setRecipesLoading(true);
      const { data, error } = await supabase.from('user_recipes')
        .select('id, recipe_name, aliases, base_qty, base_unit, stock_qty, stock_unit, low_stock_threshold, macros, ingredients, notes')
        .order('updated_at', { ascending: false });
      setRecipesLoading(false);
      if(!error && data) {
        recipesRef.current = data;
        setSavedRecipes(data);
        return data;
      }
      return [];
    };

    useEffect(() => {
      getRecipes();
    }, []);

    const updateMealDraft = (mealIndex, text) => {
      onMeal(mealIndex, 'aiDraft', text);
      setMealSplitEditOpen(prev => { const n=[...prev]; n[mealIndex]=false; return n; });
    };

    const analyzeSingleMealEntry = async (mealIndex, text) => {
      try {
        const recipes = await getRecipes();
        const recipeSearch = findRecipeMatch(recipes, text);
        
        const recipeHit = recipeSearch?.item || (recipeSearch?.options ? recipeSearch.options[0] : null);
        if(recipeHit) {
          const shouldUseLibrary = recipeSearch?.kind === 'exact' ? true : window.confirm(`Encontré "${recipeHit.name}" en tu biblioteca. ¿Usar ese valor guardado?`);
          if(shouldUseLibrary) {
            const finalItem = { ...recipeHit };
            if(editingMealItem.mealIndex === mealIndex && editingMealItem.itemIndex >= 0) {
              onReplaceItem(mealIndex, editingMealItem.itemIndex, finalItem);
              setEditingMealItem({ mealIndex:-1, itemIndex:-1 });
            } else {
              onAddItem(mealIndex, finalItem);
            }
            if(finalItem.stock_trackable) await discountItemStock(mealIndex, finalItem);
            return;
          }
        }

        const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/get-macros', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ meal: text })
        });
        if(!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

        const nextItem = {
          name: data.name || text,
          qty:  data.qty  || '1 porción',
          cals: Math.round(parseFloat(data.cals)||0),
          prot: Math.round(parseFloat(data.prot)||0),
          carb: Math.round(parseFloat(data.carb)||0),
          fat:  Math.round(parseFloat(data.fat) ||0),
          nota: data.nota || ''
        };
        
        if(editingMealItem.mealIndex === mealIndex && editingMealItem.itemIndex >= 0) {
          onReplaceItem(mealIndex, editingMealItem.itemIndex, nextItem);
          setEditingMealItem({ mealIndex:-1, itemIndex:-1 });
        } else {
          onAddItem(mealIndex, nextItem);
        }
      } catch(e) {
        throw e;
      }
    };

    const analyzeMeal = async (mealIndex) => {
      const text = String(t.meals?.[mealIndex]?.aiDraft || '').trim();
      if(!text) return;

      const parts = splitMealDraftParts(text).map(cleanMealPartPrefix).filter(Boolean);
      if(parts.length > 1 && !mealSplitEditOpen[mealIndex]) {
        setMealSplitDrafts(prev => { const n=[...prev]; n[mealIndex]=parts.join('\n'); return n; });
        setMealSplitEditOpen(prev => { const n=[...prev]; n[mealIndex]=true; return n; });
        return;
      }

      setAiLoading(prev => { const n=[...prev]; n[mealIndex]=true; return n; });
      setAiError(prev   => { const n=[...prev]; n[mealIndex]='';   return n; });

      try {
        const finalParts = mealSplitEditOpen[mealIndex] ? mealSplitDrafts[mealIndex].split('\n').filter(Boolean) : parts;
        for(const p of finalParts) {
          await analyzeSingleMealEntry(mealIndex, p);
        }
        updateMealDraft(mealIndex, '');
      } catch(e) {
        console.error('[IA]', e);
        setAiError(prev => { const n=[...prev]; n[mealIndex]=e.message||'Error'; return n; });
      } finally {
        setAiLoading(prev => { const n=[...prev]; n[mealIndex]=false; return n; });
      }
    };

    const discountItemStock = async (mealIdx, item) => {
      if(!item.recipe_id || !item.stock_trackable) return;
      setStockBusyKey(`${mealIdx}:${item.recipe_id}`);
      try {
        const { data, error } = await supabase.from('user_recipes').select('stock_qty').eq('id', item.recipe_id).single();
        if(error) throw error;
        const nextQty = Math.max(0, (parseFloat(data.stock_qty)||0) - pn(item.stock_delta));
        await supabase.from('user_recipes').update({ stock_qty: nextQty, updated_at: new Date().toISOString() }).eq('id', item.recipe_id);
        recipesRef.current = null;
        await getRecipes();
      } catch(e) { console.error('[STOCK]', e); }
      finally { setStockBusyKey(''); }
    };

    const saveMealAsRecipe = async (mealIdx) => {
      const meal = t.meals?.[mealIdx];
      if(!meal?.items?.length) return;
      const recipeName = window.prompt('Nombre de la receta:', `Mi Comida ${mealIdx+1}`);
      if(!recipeName) return;
      
      setRecipeSaving(prev => { const n=[...prev]; n[mealIdx]=true; return n; });
      try {
        const totals = mealTotals(meal);
        const payload = {
          recipe_name: recipeName,
          base_qty: 1, base_unit: 'porcion',
          macros: totals,
          ingredients: meal.items.map(it => ({ name: it.name, qty: it.qty })),
          notes: 'Guardada desde el diario'
        };
        const { error } = await supabase.from('user_recipes').insert(payload);
        if(error) throw error;
        recipesRef.current = null;
        await getRecipes();
      } catch(e) { alert(e.message); }
      finally { setRecipeSaving(prev => { const n=[...prev]; n[mealIdx]=false; return n; }); }
    };

    const medStatus = getMedicationStatusForView({ selectedDateKey, medsState: t.meds || {}, now: new Date() });

    return html`
      <${SectionAccordion} icon=${html`<${IActivity} s=${18} c="text-green" style="margin-right:8px;"/>`} title="Parámetros Diarios" isOpen=${open} onToggle=${()=>setOpen(!open)}>
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${yesterdayFastMsg && html`
            <div class="glass-card" style="padding:10px 12px;background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.2);margin-bottom:4px;">
              <p style="margin:0;font-size:12px;color:#A5B4FC;font-weight:700;display:flex;align-items:center;gap:6px;">
                <${IClock} s=${14}/> ${yesterdayFastMsg}
              </p>
            </div>
          `}

          <!-- Nutricion & Cardio -->
          <div style="padding:12px;border-radius:10px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;display:flex;flex-direction:column;gap:10px;">
            <p style="margin:0 0 14px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#F59E0B;border-bottom:1px solid rgba(245,158,11,0.15);padding-bottom:6px;">NUTRICIÓN & CARDIO</p>
            
            <${CheckRow} label="Ayuno realizado" checked=${t.fasted} onChange=${v=>onChange('fasted',v)}>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <${Inp} label="Inicio (HH:MM)" type="time" value=${t.fastStartTime} onChange=${v=>onChange('fastStartTime',v)}/>
                <${Inp} label="Duración (hs)" value=${t.fastHours} onChange=${v=>onChange('fastHours',v)} placeholder="Ej: 16"/>
              </div>
              ${(() => {
                const fs = getFastStats(t, selectedDateKey);
                if (!fs.active || !fs.startTime) return null;
                const hh = Math.floor(fs.elapsed);
                const mm = Math.floor((fs.elapsed * 60) % 60);
                const timeStr = `${hh}h ${mm}m`;
                const label = fs.isComplete 
                  ? html`<span style="display:flex;align-items:center;gap:4px;">¡META CUMPLIDA! <${ICheck} s=${12} c="#10B981"/> (${timeStr})</span>`
                  : `PROGRESO: ${fs.pct}% (${timeStr})`;
                return html`<span class="badge" style=${`background:${fs.isComplete ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)'};color:#10B981;font-size:10px;padding:4px 8px;border-radius:6px;font-weight:700;border:1px solid ${fs.isComplete ? 'rgba(16,185,129,0.3)' : 'transparent'};`}>${label}</span>`;
              })()}
            <//>

            <${CheckRow} label="Mate / Café" checked=${t.mateOrCoffee} onChange=${v=>onChange('mateOrCoffee',v)}>
              <${Inp} label="Hora" type="time" value=${t.mateOrCoffeeTime} onChange=${v=>onChange('mateOrCoffeeTime',v)}/>
            <//>

            <${CheckRow} label="Caminata" checked=${t.walked} onChange=${v=>onChange('walked',v)}>
              <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;">
                <${Inp} label="Pasos" value=${t.steps} onChange=${v=>onChange('steps',v)} placeholder="Ej: 10.000"/>
                <${Inp} label="Inicio" type="time" value=${t.walkStartTime} onChange=${v=>onChange('walkStartTime',v)}/>
                <${Inp} label="Fin" type="time" value=${t.walkEndTime} onChange=${v=>onChange('walkEndTime',v)}/>
              </div>
            <//>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.03);">
              <div class="glass-card" style="padding:10px;border-color:rgba(239,68,68,0.2);background:rgba(10,15,30,0.5);">
                <p style="margin:0 0 6px;font-size:10px;color:#64748b;text-transform:uppercase;">Roacutan</p>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" checked=${!!t.meds?.roacuttan} onChange=${e=>onMed('roacuttan',e.target.checked)}/>
                  <span style=${`font-size:13px;font-weight:700;color:${t.meds?.roacuttan?'#FCA5A5':'#94A3B8'};`}>${medStatus.roaccutanLabel}</span>
                </label>
              </div>
              <div class="glass-card" style=${`padding:10px;border-color:${medStatus.dinnerRelevant?'rgba(99,102,241,0.3)':'#1E2D45'};background:rgba(10,15,30,0.5);opacity:${medStatus.dinnerRelevant?1:0.5};`}>
                <p style="margin:0 0 6px;font-size:10px;color:#64748b;text-transform:uppercase;">Cena Combo</p>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" checked=${!!t.meds?.finasteride} onChange=${e=>{ onMed('finasteride',e.target.checked); onMed('minoxidil',e.target.checked); }}/>
                  <span style=${`font-size:13px;font-weight:700;color:${t.meds?.finasteride?'#A5B4FC':'#94A3B8'};`}>${medStatus.dinnerLabel}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Alimentacion -->
          <div style="padding:12px;border-radius:10px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;">
            <p style="margin:0 0 14px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#10B981;border-bottom:1px solid rgba(16,185,129,0.15);padding-bottom:6px;">ALIMENTACIÓN</p>
            <div style="display:flex;flex-direction:column;gap:12px;">
              ${[0,1,2].map(mIdx => {
                const meal = t.meals?.[mIdx] || { items: [] };
                const totals = mealTotals(meal);
                return html`
                  <div class="glass-card" style="padding:12px;background:rgba(22,32,53,0.6);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                      <span style="font-size:12px;font-weight:700;color:#6366F1;">Comida ${mIdx+1}</span>
                      <button onClick=${()=>saveMealAsRecipe(mIdx)} style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:10px;background:transparent;border:1px solid #1E2D45;color:#64748B;padding:2px 8px;border-radius:6px;cursor:pointer;letter-spacing:0.05em;">
                        ${recipeSaving[mIdx] ? '...' : 'RECETA'}
                      </button>
                    </div>
                    
                    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
                      ${(meal.items||[]).map((it, iIdx) => html`
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                          <div style="flex:1;">
                            <p style="margin:0;font-size:13px;color:#cbd5e1;"><span style="color:#10B981;font-weight:700;">${it.qty}</span> ${it.name}</p>
                            <p style="margin:2px 0 0;font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${it.cals}kcal · ${it.prot}P · ${it.carb}C · ${it.fat}G</p>
                          </div>
                          <div style="display:flex;gap:4px;">
                            <button onClick=${() => {
                              setEditingMealItem({ mealIndex: mIdx, itemIndex: iIdx });
                              onMeal(mIdx, 'aiDraft', `${it.qty} ${it.name}`);
                            }} style="background:transparent;border:none;color:#6366F1;font-size:14px;cursor:pointer;padding:0 8px;">✎</button>
                            <button onClick=${()=>onRemoveItem(mIdx, iIdx)} style="background:transparent;border:none;color:#EF4444;font-size:14px;cursor:pointer;padding:0 8px;">×</button>
                          </div>
                        </div>
                      `)}
                    </div>

                    ${mealSplitEditOpen[mIdx] && html`
                      <textarea 
                        value=${mealSplitDrafts[mIdx]}
                        onInput=${e => setMealSplitDrafts(prev => { const n=[...prev]; n[mIdx]=e.target.value; return n; })}
                        placeholder="Una fila por alimento..."
                        style="width:100%;background:rgba(0,0,0,0.25);border:1px solid #6366F1;border-radius:6px;padding:8px 10px;color:#cbd5e1;font-size:13px;min-height:80px;margin-bottom:8px;font-family:'JetBrains Mono',monospace;"
                      />
                    `}

                    <div style="display:flex;gap:8px;margin-top:8px;">
                      <input
                        type="text"
                        value=${meal.aiDraft || ''}
                        onInput=${e => updateMealDraft(mIdx, e.target.value)}
                        onKeyDown=${e => { if(e.key === 'Enter' && !aiLoading[mIdx]) analyzeMeal(mIdx); }}
                        placeholder=${editingMealItem.mealIndex === mIdx ? "Editando ítem..." : "Añadir alimento..."}
                        disabled=${aiLoading[mIdx]}
                        style="flex:1;background:rgba(0,0,0,0.3);border:1px solid #1E2D45;border-radius:8px;padding:10px 12px;color:#cbd5e1;font-size:13px;"
                      />
                      <button
                        onClick=${() => analyzeMeal(mIdx)}
                        disabled=${aiLoading[mIdx] || !String(meal.aiDraft || '').trim()}
                        style="background:rgba(99,102,241,0.25);color:#A5B4FC;border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:0 18px;font-weight:800;font-family:'Barlow Condensed',sans-serif;font-size:13px;cursor:pointer;opacity:${aiLoading[mIdx]?0.5:1};letter-spacing:0.05em;"
                      >
                        ${aiLoading[mIdx] ? '...' : 'IA 🧠'}
                      </button>
                    </div>
                    
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:10px;">
                      ${savedRecipes.filter(r => {
                        const draft = normalizeFoodText(meal.aiDraft || '');
                        return !draft || normalizeFoodText(r.recipe_name).includes(draft);
                      }).slice(0, 5).map(r => html`
                        <button onClick=${() => updateMealDraft(mIdx, r.recipe_name)} style="background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);color:#10B981;font-size:10px;font-weight:700;font-family:'Barlow Condensed',sans-serif;padding:3px 8px;border-radius:6px;cursor:pointer;letter-spacing:0.03em;">
                          + ${r.recipe_name}
                        </button>
                      `)}
                    </div>

                    <!-- Totales por Comida -->
                    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.03);">
                      ${[
                        {label:'Kcal', val:Math.round(totals.cals), color:'#F59E0B'},
                        {label:'Prot', val:Math.round(totals.prot)+'g', color:'#10B981'},
                        {label:'Carb', val:Math.round(totals.carb)+'g', color:'#6366F1'},
                        {label:'Grasas',val:Math.round(totals.fat)+'g', color:'#EF4444'},
                      ].map(stat => html`
                        <div style="text-align:center;padding:6px 4px;background:rgba(10,15,30,0.4);border-radius:6px;border:1px solid rgba(255,255,255,0.02);">
                          <p style="margin:0;font-size:8px;text-transform:uppercase;color:#64748b;letter-spacing:0.05em;">${stat.label}</p>
                          <p style=${`margin:2px 0 0;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${stat.color};`}>${stat.val}</p>
                        </div>
                      `)}
                    </div>

                    ${aiError[mIdx] && html`<p style="color:#EF4444;font-size:11px;margin:8px 0 0;">Error: ${aiError[mIdx]}</p>`}
                  </div>
                `;
              })}
            </div>
          </div>

          <!-- Descanso -->
          <div style="padding:12px;border-radius:10px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;display:flex;flex-direction:column;gap:10px;">
            <p style="margin:0 0 14px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#6366F1;border-bottom:1px solid rgba(99,102,241,0.15);padding-bottom:6px;">DESCANSO</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <${Inp} label="Dormí (hs)" value=${t.sleepHours} onChange=${v=>onChange('sleepHours',v)} placeholder="Ej: 7,5"/>
              <${Inp} label="Despertares" value=${t.wakeups} onChange=${v=>onChange('wakeups',v)} placeholder="Veces"/>
            </div>
            <div>
              <label style="display:block;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">Calidad del sueño</label>
              <select class="inp" value=${t.sleepQuality || ''} onChange=${e=>onChange('sleepQuality',e.target.value)} style="background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:8px 12px;color:white;width:100%;">
                <option value="">Seleccionar...</option>
                <option>Excelente</option>
                <option>Bien</option>
                <option>Regular</option>
                <option>Mal</option>
              </select>
            </div>
            <${CheckRow} label="Dormí siesta?" checked=${t.napped} onChange=${v=>onChange('napped',v)}>
              <${Inp} label="Horas de siesta" value=${t.napHours} onChange=${v=>onChange('napHours',v)} placeholder="Ej: 1,5"/>
            <//>
          </div>
        </div>
      <//>
    `;
  };

  return { HabitsPanel, findRecipeMatch, getYesterdayFast, getRelativeDaySnapshot };
};
