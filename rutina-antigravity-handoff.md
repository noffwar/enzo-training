# Handoff: traer rutina vieja a HOY, modularizada

Referencia vieja: `C:\Users\castr\Downloads\index (1).html`

Objetivo: recuperar en `HOY` el flujo viejo de rutina sin volver al monolito:

- elegir split semanal `4 dias` / `5 dias`
- elegir la rutina del dia desde HOY
- mostrar titulo, descripcion, avisos de descanso/cerrado/descarga
- cargar `GymPanel` solo si hay rutina asignada (`effectiveGymSession`)
- mantener detalles editables: reps, peso, RPE, horarios, notas, completar sesion, reset, sobrecarga

## 1. Arreglar helpers base

En `app-core.js`, `getPlanMode` debe respetar `_planMode`. Ahora infiere por cantidad de rutinas, pero el viejo guardaba explicitamente el modo:

```js
export const getPlanMode = (weekData) =>
  String(weekData?.dayMapping?._planMode || '4');
```

Tambien conviene traer la parte vieja de feriados/cerrado. Si no se quiere importar `HOLIDAYS_2026` en core, mover estos helpers a `app-gym.js` o `app-utils.js`:

```js
export const isHoliday2026 = (dateStr='', holidays = {}) =>
  dateStr.startsWith('2026-') && !!holidays[dateStr];

export const getHolidayLabel = (dateStr='', holidays = {}) =>
  holidays[dateStr] || '';

export const isSundayDate = (dateStr='') => {
  if(!dateStr) return false;
  return new Date(`${dateStr}T12:00:00`).getDay() === 0;
};

export const isGymClosedDate = (dateStr='', holidays = {}) =>
  isSundayDate(dateStr) || isHoliday2026(dateStr, holidays);
```

Si se dejan en `app-core.js`, pasar `HOLIDAYS_2026` desde deps o importarlo desde `app-constants.js`.

## 2. En `app-main.js`, traer derivaciones de rutina despues de `wd/tracker/gymSession`

Actualmente HOY usa `gymSession` directo. El viejo calculaba rutina activa y una sesion efectiva:

```js
const routineAssignments = getRoutineAssignments(wd);
const planMode = getPlanMode(wd);
const selectableRoutineIds = String(planMode) === '5'
  ? ['1','2','3','4','5']
  : ['1','2','4','5'];
const selectableRoutines = selectableRoutineIds
  .map(id => routineData[id])
  .filter(Boolean);
const routineId = routineAssignments[activeDay];
const routineInfo = routineId
  ? getRoutineForWeek(routineId, routineData, currentWk, isDeloadWeek)
  : null;
const effectiveGymSession = routineId ? gymSession : [];
const activeDateKey = getDayDate(currentWk, parseInt(activeDay, 10));
const activeDayClosed = isGymClosedDate(activeDateKey, HOLIDAYS_2026);
const previousDayKey = DAY_KEYS[(DAY_KEYS.indexOf(activeDay) + DAY_KEYS.length - 1) % DAY_KEYS.length];
const previousTwoDayKey = DAY_KEYS[(DAY_KEYS.indexOf(activeDay) + DAY_KEYS.length - 2) % DAY_KEYS.length];
const hitTwoConsecutiveRule = planMode === '4'
  && !!routineId
  && !activeDayClosed
  && !didTrainDay(wd, activeDay)
  && didTrainDay(wd, previousDayKey)
  && didTrainDay(wd, previousTwoDayKey)
  && !isDeloadWeek(currentWk);
```

`isDeloadWeek` puede quedar como helper local:

```js
const isDeloadWeek = useCallback((wkKey='') => {
  const base = new Date(`${TRAINING_PLAN_START}T12:00:00`);
  const week = new Date(`${wkKey}T12:00:00`);
  if(!isValidDateValue(base) || !isValidDateValue(week)) return false;
  const diff = Math.floor((week - base) / (7 * 24 * 3600 * 1000));
  return diff >= 6 && diff % 6 === 0;
}, []);
```

Y usarlo tambien en `ensureSession`:

```js
const rForWeek = getRoutineForWeek(rid, routineData, wkKey, isDeloadWeek);
```

## 3. En `app-main.js`, traer handlers del viejo para split y rutina del dia

Estos van junto a los handlers actuales de gym:

```js
const handleRoutineChange = (value) => {
  upd(w => {
    const dm = { ...w.dayMapping };
    const ns = { ...w.sessions };
    const assignments = getRoutineAssignments(w);
    const nextAssignments = { ...assignments };

    if(value) {
      DAY_KEYS.forEach(k => {
        if(assignments[k] === value && k !== activeDay) {
          nextAssignments[k] = '';
          delete ns[k];
        }
      });
    }

    nextAssignments[activeDay] = value;
    delete ns[activeDay];

    return {
      ...w,
      dayMapping: { ...dm, ...nextAssignments, _planMode: getPlanMode(w) },
      sessions: ns
    };
  });

  if(value) setTimeout(() => ensureSession(currentWk, activeDay), 50);
};

const handlePlanModeChange = (nextMode) => {
  upd(w => ({
    ...w,
    dayMapping: {
      ...w.dayMapping,
      ...buildPlanDayMapping(nextMode, currentWk, (dateKey) => isGymClosedDate(dateKey, HOLIDAYS_2026), getDayDate)
    },
    sessions: {}
  }));

  DAY_KEYS.forEach(dayKey => setTimeout(() => ensureSession(currentWk, dayKey), 20));
};
```

Importante: `buildPlanDayMapping` ya existe en `app-gym.js`, pero `app-main.js` tiene que recibirlo desde deps:

```js
getPlanMode, getRoutineAssignments, getRoutineForWeek, buildPlanDayMapping, isGymClosedDate, didTrainDay,
```

Y `HOLIDAYS_2026`, `TRAINING_PLAN_START`, `DAYS`, `DAY_KEYS` desde constants.

## 4. En HOY, insertar el selector de split + rutina antes del dashboard

Reemplazar el bloque de `view === 'today'` para que arranque asi:

```js
${view === 'today' && html`
  <div style="display:flex;flex-direction:column;gap:12px;">
    <div class="glass-card" style="padding:12px;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:10px;text-transform:uppercase;color:#64748b;">Split semanal</span>
          <select class="inp" style="min-width:118px;font-size:12px;padding:8px 10px;" value=${planMode} onChange=${e=>handlePlanModeChange(e.target.value)}>
            <option value="4">4 dias</option>
            <option value="5">5 dias</option>
          </select>
          ${isDeloadWeek(currentWk) && html`<span class="badge" style="background:rgba(245,158,11,0.12);color:#FCD34D;">DESCARGA - RIR 4-5</span>`}
        </div>
        <span style="font-size:11px;color:#94A3B8;">
          ${planMode === '4' ? 'Maximo 2 dias seguidos. El tercero va descanso.' : 'Distribucion de 5 dias con los mismos ejercicios.'}
        </span>
      </div>

      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div>
          <h2 style="margin:0;font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:800;letter-spacing:0.04em;color:white;">
            ${routineInfo?.fullName || `DIA ${activeDay}: Descanso`}
          </h2>
          ${routineInfo?.description && html`<p style="margin:2px 0 0;font-size:13px;color:#6366F1;">${routineInfo.description}</p>`}
        </div>
        <select class="inp" style="min-width:120px;font-size:12px;padding:8px 10px;" value=${routineId || ''} onChange=${e=>handleRoutineChange(e.target.value)}>
          <option value="">Descanso</option>
          ${selectableRoutines.map(r => html`<option value=${r.id}>${r.name}</option>`)}
        </select>
      </div>
    </div>

    ${(activeDayClosed || hitTwoConsecutiveRule || isDeloadWeek(currentWk)) && html`
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${activeDayClosed && html`
          <div style="padding:10px 12px;border-radius:10px;background:rgba(127,29,29,0.18);border:1px solid rgba(239,68,68,0.35);">
            <p style="margin:0;font-size:12px;color:#FCA5A5;font-weight:700;">Gimnasio cerrado para este dia.</p>
            <p style="margin:4px 0 0;font-size:11px;color:#CBD5E1;">Si igual entrenaste, podes asignar la rutina manualmente desde el selector.</p>
          </div>
        `}
        ${hitTwoConsecutiveRule && html`
          <div style="padding:10px 12px;border-radius:10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);">
            <p style="margin:0;font-size:12px;color:#FCD34D;font-weight:700;">Ya entrenaste 2 dias seguidos: hoy toca descanso.</p>
            <p style="margin:4px 0 0;font-size:11px;color:#CBD5E1;">La app te deja forzarlo manualmente, pero el split de 4 dias recomienda frenar.</p>
          </div>
        `}
        ${isDeloadWeek(currentWk) && html`
          <div style="padding:10px 12px;border-radius:10px;background:rgba(99,102,241,0.10);border:1px solid rgba(99,102,241,0.26);">
            <p style="margin:0;font-size:12px;color:#C7D2FE;font-weight:700;">Semana de descarga activa.</p>
            <p style="margin:4px 0 0;font-size:11px;color:#CBD5E1;">La app reduce a 2 series por ejercicio y sube el objetivo a RIR 4-5.</p>
          </div>
        `}
      </div>
    `}

    <${TodayDashboard} session=${session} tracker=${tracker} gymSession=${effectiveGymSession} onOpenRoutines=${() => navigateTo('routines')} selectedDateKey=${activeDateKey} onOpenTasks=${() => navigateTo('tasks')} onOpenStudy=${() => navigateTo('study')} onOpenBooks=${() => navigateTo('books')} onOpenHealth=${() => navigateTo('health')} onOpenRecipes=${() => navigateTo('recipes')} onOpenNotif=${() => navigateTo('notif')} />

    <${HabitsPanel} tracker=${tracker} selectedDateKey=${activeDateKey} yesterdayFastMsg=${yesterdayFastMsg} onChange=${(f,v) => upd(w => ({...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],[f]:v}}}))} onMed=${(m,v) => upd(w => ({...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],meds:{...(w.tracker[activeDay].meds||{}),[m]:v}}}}))} onMeal=${addMealItem} onAddItem=${addMealItem} onRemoveItem=${removeMealItem} onReplaceItem=${replaceMealItem}/>

    <${GymPanel} session=${effectiveGymSession} tracker=${tracker} onSetComplete=${handleSetComplete} onInput=${handleSetInput} onHabit=${(f,v) => upd(w => ({...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],[f]:v}}}))} onApplyOverload=${handleApplyOverload} onCompleteSession=${handleCompleteSession} onResetSessionChecks=${handleResetSessionChecks} />

    ${effectiveGymSession.length === 0 && !routineId && html`
      <${Card}>
        <div style="text-align:center;padding:24px 0;">
          <p style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:#cbd5e1;margin:0;">Dia de descanso</p>
          <p style="font-size:13px;color:#64748b;margin:4px 0 0;">Recupera y registra tus habitos arriba.</p>
        </div>
      <//>
    `}
  </div>
`}
```

## 5. Criterios de aceptacion

- En HOY se ve primero el selector de split semanal.
- Cambiar de 4 a 5 dias regenera `dayMapping` y limpia sesiones viejas.
- En HOY se puede cambiar la rutina del dia sin ir a la pestana Rutina.
- Si una rutina se asigna a otro dia, se limpia la asignacion anterior y su sesion huerfana.
- Si el dia queda en descanso, `GymPanel` recibe `[]` y aparece el estado de descanso.
- Si hay rutina, `GymPanel` permite editar reps/peso/RPE, horarios y notas.
- La sobrecarga aplica +2,5 kg a la rutina base y persiste con `saveRoutineRemote`.
- Semana de descarga usa `getRoutineForWeek(..., isDeloadWeek)` y muestra solo 2 series con RIR 4-5.

## 6. Hallazgos extra al revisar de nuevo

Parte de lo anterior ya parece aplicado en `app-main.js`, pero quedan tres faltantes importantes.

### 6.1. Corregir duplicado fatal en `app-core.js`

`app-core.js` quedo con dos exports llamados `isGymClosedDate`. Eso rompe el modulo:

```txt
SyntaxError: Identifier 'isGymClosedDate' has already been declared
```

Dejar solo la version nueva con feriados:

```js
export const isHoliday2026 = (dateStr = '', holidays = {}) =>
  dateStr.startsWith('2026-') && !!holidays[dateStr];

export const getHolidayLabel = (dateStr = '', holidays = {}) =>
  holidays[dateStr] || '';

export const isSundayDate = (dateStr = '') => {
  if (!dateStr) return false;
  return new Date(`${dateStr}T12:00:00`).getDay() === 0;
};

export const isGymClosedDate = (dateStr = '', holidays = {}) =>
  isSundayDate(dateStr) || isHoliday2026(dateStr, holidays);
```

Eliminar la version vieja que solo chequea domingo.

### 6.2. Falta navegacion de semana y tabs de dias

El viejo no solo tenia selector de split/rutina: tambien tenia navegacion semanal y tabs L/M/X/J/V/S/D arriba. Sin eso, `activeDay` existe en estado pero casi no se puede cambiar desde HOY.

Traer estos derivados/handlers a `app-main.js`:

```js
const navWeek = (dir) => {
  const nextWeek = addWeeks(currentWk, dir);
  if(isBeforeStart(nextWeek)) return;
  setCurrentWk(nextWeek);
  setAllWeeks(prev => prev[nextWeek] ? prev : { ...prev, [nextWeek]: newWeek(nextWeek) });
};

const isAtStart = currentWk <= START_WEEK;
const isCurrentWeek = (weekKey) => getWeekKey(new Date()) === weekKey;
```

Agregar `DAYS`, `IChevL`, `IChevR`, `formatWeekLabel` a deps/destructuring si no estan disponibles en `app-main.js`.

Bloque de UI viejo para adaptar arriba del selector de split:

```js
<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
  <button class="btn-icon" style=${`background:#162035;border:1px solid #1E2D45;opacity:${isAtStart ? '0.3' : '1'};`} onClick=${()=>navWeek(-1)} disabled=${isAtStart}>
    <${IChevL} s=${16}/>
  </button>
  <div style="flex:1;text-align:center;">
    <p style="margin:0;font-size:13px;font-weight:600;color:white;">${formatWeekLabel(currentWk)}</p>
    ${isCurrentWeek(currentWk) && html`<span style="font-size:10px;font-family:'JetBrains Mono',monospace;color:#10B981;">SEMANA ACTUAL</span>`}
  </div>
  <button class="btn-icon" style="background:#162035;border:1px solid #1E2D45;" onClick=${()=>navWeek(1)} disabled=${isCurrentWeek(currentWk)}>
    <${IChevR} s=${16}/>
  </button>
</div>

<div class="hide-scroll" style="display:flex;gap:4px;overflow-x:auto;">
  ${DAYS.map(day => {
    const active = activeDay === day.key;
    const hasRoutine = routineAssignments[day.key] !== '';
    const sess = hasRoutine ? (wd.sessions[day.key] || []) : [];
    const done = sess.reduce((acc, ex) => acc + ex.sets.filter(set => set.completed).length, 0);
    const total = sess.reduce((acc, ex) => acc + ex.sets.length, 0);
    const dateKey = getDayDate(currentWk, parseInt(day.key, 10));
    const closed = isGymClosedDate(dateKey, HOLIDAYS_2026);
    return html`
      <button onClick=${()=>{ setActiveDay(day.key); setView('today'); }}
        style=${`flex:1;min-width:38px;padding:8px 4px;border-radius:10px;border:1px solid ${active ? (closed ? '#EF4444' : '#10B981') : (closed ? 'rgba(239,68,68,0.35)' : '#1E2D45')};background:${active ? (closed ? 'rgba(239,68,68,0.18)' : '#10B981') : (closed ? 'rgba(127,29,29,0.18)' : '#162035')};cursor:pointer;position:relative;`}>
        <p style=${`margin:0;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:${active ? 'white' : closed ? '#FCA5A5' : '#64748b'};`}>${day.abbr}</p>
        <p style=${`margin:0;font-size:9px;color:${active ? 'rgba(255,255,255,0.75)' : closed ? '#FCA5A5' : '#374151'};`}>${day.label}</p>
        ${hasRoutine && !active && html`<div style="position:absolute;top:4px;right:4px;width:5px;height:5px;border-radius:50%;background:#6366F1;"></div>`}
        ${closed && html`<div style="position:absolute;top:3px;left:3px;width:5px;height:5px;border-radius:50%;background:#EF4444;"></div>`}
        ${done > 0 && html`<div style="position:absolute;bottom:3px;right:3px;font-size:8px;font-family:'JetBrains Mono',monospace;color:#10B981;">${done}/${total}</div>`}
      </button>
    `;
  })}
</div>
```

### 6.3. La pestana Rutina actual no equivale al viejo editor

En el viejo, `view === 'routines'` montaba `RoutineEditor`, no un simple manager de asignacion semanal:

```js
${view === 'routines' && html`<${RoutineEditor} routines=${routineData} onSave=${handleSaveRoutines}/>`}
```

El editor viejo permitia:

- elegir rutina base
- editar nombre de ejercicio
- editar reps, kg, RIR y pausa
- agregar/quitar series
- agregar/quitar ejercicios
- sincronizar `restSecs` cuando cambia `restStr`
- guardar todo con `saveRoutines(updated)`

Como HOY ya puede manejar split y asignacion diaria, la pestana `RUTINA` deberia ser el editor de detalles. Si se quiere conservar tambien el mapeo semanal, combinar ambos: primero editor, abajo planner semanal.

Handler necesario en `app-main.js`:

```js
const handleSaveRoutines = async (updated) => {
  setRoutineData(updated);
  Object.entries(updated).forEach(([id, data]) => {
    lsRoutineSave(id, { ...data, _updatedAt: new Date().toISOString() });
    saveRoutineRemote(supabase, stripRoutineMeta, id, data, data?._revision || null, session).catch(()=>{});
  });
};
```

Tambien conviene mantener compatibilidad legacy si todavia se usa `ROUTINES_STORAGE_KEY`:

```js
try { localStorage.setItem(ROUTINES_STORAGE_KEY, JSON.stringify(updated)); } catch(_) {}
```

### 6.4. `RoutineManager` necesita `routineData`

El manager actual tiene labels hardcodeados:

```js
['1', 'Dia 1: Torso A']
```

Si queda vivo, deberia recibir `routineData` y renderizar `Object.values(routineData)` para no desincronizar nombres editados desde el editor.

