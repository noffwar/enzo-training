import { h } from 'https://esm.sh/preact';
import { useState, useEffect, useCallback, useRef, useMemo } from 'https://esm.sh/preact/hooks';
import htm from 'https://esm.sh/htm';

const html = htm.bind(h);

export const createHabitsPanel = (deps) => {
  const {
    pn, fn, ft, dayTotals, getMedicationStatusForView, getFastStats,
    Card, SectionAccordion, Inp, CheckRow,
    ProteinProgress, WaterTracker, SmartCena, NutritionReviewCard,
    IChevD, ICheck, IPlay, IPause, IReset, ICal, ISync, IHome, IBar, ITarget, IBook, IBell, IEdit, IList, IDumb, IActivity,
    supabase, DEVICE_ID, fetchJsonWithTimeout, TARGETS, HOME_FOODS,
    localDateKey, getDayDate, getWeekKey, isValidDateValue
  } = deps;

  // Helpers internos movidos desde index.html
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

  const normalizeRecipeText = (s='') =>
    String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

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
    const nFull = normalizeRecipeText(raw);
    const nName = stripRecipeAmount(raw);
    const nFullK = normalizeRecipeKey(raw);
    const nNameK = normalizeRecipeKey(nName);
    const pLead = parseLeadingRecipeAmount(raw);
    const pLeadK = pLead ? normalizeRecipeKey(pLead.rest) : '';

    for(const r of (recipes || [])) {
      const names = [r.recipe_name, ...(r.aliases||[])].filter(Boolean).map(normalizeRecipeText);
      const keys = [r.recipe_name, ...(r.aliases||[])].filter(Boolean).map(normalizeRecipeKey);
      if(names.includes(nFull) || names.includes(nName) || keys.includes(nFullK) || keys.includes(nNameK) || (pLeadK && keys.includes(pLeadK))) return r;
    }
    return null;
  };

  const HabitsPanel = ({tracker:t, selectedDateKey, yesterdayFastMsg, onChange, onMed, onMeal, onAddItem, onRemoveItem, onReplaceItem}) => {
    const [open, setOpen] = useState(true);
    const [aiLoading, setAiLoading] = useState([false,false,false]);
    const fs = getFastStats(t);
    const macros = dayTotals(t.meals);
    const medStatus = getMedicationStatusForView({ selectedDateKey, medsState: t.meds || {}, now: new Date() });

    return html`
      <${SectionAccordion} icon="🎯" title="Hábitos y Nutrición" isOpen=${open} onToggle=${()=>setOpen(!open)}>
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${yesterdayFastMsg && html`<p style="margin:0;font-size:12px;color:#F59E0B;font-weight:700;">${yesterdayFastMsg}</p>`}
          
          <!-- Agua -->
          <${WaterTracker} val=${t.water||0} onChange=${v=>onChange('water', v)} roacuttan=${!!t.meds?.roacuttan} />

          <!-- Meds -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="glass-card" style="padding:10px;border-color:rgba(239,68,68,0.2);">
              <p style="margin:0 0 6px;font-size:10px;color:#64748b;text-transform:uppercase;">Roacutan</p>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" checked=${!!t.meds?.roacuttan} onChange=${e=>onMed('roacuttan',e.target.checked)}/>
                <span style=${`font-size:13px;font-weight:700;color:${t.meds?.roacuttan?'#FCA5A5':'#94A3B8'};`}>${medStatus.roaccutanLabel}</span>
              </label>
            </div>
            <div class="glass-card" style=${`padding:10px;border-color:${medStatus.dinnerRelevant?'rgba(99,102,241,0.3)':'#1E2D45'};opacity:${medStatus.dinnerRelevant?1:0.5};`}>
              <p style="margin:0 0 6px;font-size:10px;color:#64748b;text-transform:uppercase;">Cena Combo</p>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" checked=${!!t.meds?.finasteride} onChange=${e=>{ onMed('finasteride',e.target.checked); onMed('minoxidil',e.target.checked); }}/>
                <span style=${`font-size:13px;font-weight:700;color:${t.meds?.finasteride?'#A5B4FC':'#94A3B8'};`}>${medStatus.dinnerLabel}</span>
              </label>
            </div>
          </div>

          <!-- Comidas -->
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${(t.meals||[]).map((meal, mIdx) => html`
              <div class="glass-card" style="padding:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <span style="font-size:12px;font-weight:700;color:#E2E8F0;">Comida ${mIdx+1}</span>
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="time" value=${meal.firstBite||''} onBlur=${e=>onMeal(mIdx,'firstBite',e.target.value)}
                      style="background:transparent;border:none;color:#94A3B8;font-size:11px;font-family:'JetBrains Mono',monospace;"/>
                    <span style="color:#475569;">-</span>
                    <input type="time" value=${meal.lastBite||''} onBlur=${e=>onMeal(mIdx,'lastBite',e.target.value)}
                      style="background:transparent;border:none;color:#94A3B8;font-size:11px;font-family:'JetBrains Mono',monospace;"/>
                  </div>
                </div>
                <!-- Items list -->
                <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
                  ${(meal.items||[]).map((it, iIdx) => html`
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                      <div style="flex:1;">
                        <p style="margin:0;font-size:13px;color:#cbd5e1;">${it.name} ${it.qty?`· ${it.qty}`:''}</p>
                        <p style="margin:2px 0 0;font-size:10px;color:#64748b;font-family:'JetBrains Mono',monospace;">${it.cals}kcal · ${it.prot}P · ${it.carb}C · ${it.fat}G</p>
                      </div>
                      <button onClick=${()=>onRemoveItem(mIdx, iIdx)} style="background:transparent;border:none;color:#EF4444;font-size:16px;cursor:pointer;padding:0 8px;">×</button>
                    </div>
                  `)}
                </div>
                <${Inp} placeholder="Añadir alimento o receta..." onChange=${v=>onAddItem(mIdx,v)} />
              </div>
            `)}
          </div>

          <!-- Totales y Dash -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="glass-card" style="padding:10px;text-align:center;">
              <p style="margin:0;font-size:9px;color:#64748b;text-transform:uppercase;">Calorías Totales</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#FBBF24;">${Math.round(macros.cals)}</p>
            </div>
            <div class="glass-card" style="padding:10px;text-align:center;">
              <p style="margin:0;font-size:9px;color:#64748b;text-transform:uppercase;">Proteínas (P)</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#10B981;">${Math.round(macros.prot)}g</p>
            </div>
          </div>
          <${ProteinProgress} current=${macros.prot} TARGETS=${TARGETS} fn=${fn} />
          <${SmartCena} currentProt=${macros.prot} tracker=${t} TARGETS=${TARGETS} HOME_FOODS=${HOME_FOODS} dayTotals=${dayTotals} pn=${pn} />
        </div>
      <//>
    `;
  };

  return { HabitsPanel, findRecipeMatch, getYesterdayFast, getRelativeDaySnapshot };
};
