import { h, render } from 'https://esm.sh/preact';
import { useState, useEffect, useCallback, useRef, useMemo, useErrorBoundary } from 'https://esm.sh/preact/hooks';
import htm from 'https://esm.sh/htm';

const html = htm.bind(h);

export const createApp = (deps) => {
  const {
    supabase, DEVICE_ID,
    // Core
    V3, metaGet, metaSet, lsWeekSave, lsWeekLoad, lsAllWeekKeys,
    lsDaySave, lsDayLoad, lsAllDayKeys, lsRoutineSave, lsRoutineLoad, lsAllRoutineKeys,
    lsNotifSave, lsNotifLoad, fetchJsonWithTimeout, saveDayRemote, saveWeeklyRemote,
    saveRoutineRemote, bootstrapRemoteState, applyBootstrapToState, buildAllWeeks,
    loadLocalCaches, hydrate, newWeek, newDay, pn, fn, ft, pickNewestPayload, getRC,
    getDinnerLogicalDateKey, localDateKey, getDayDate, getWeekKey, addWeeks, formatWeekLabel,
    // Gym
    getPlanMode, getRoutineAssignments, getRoutineForWeek, isGymClosedDate, didTrainDay, buildPlanDayMapping,
    // Utils
    formatTaskDate, priorityColor, normalizeSubtasks, computeNextRecurringDueAt,
    isValidDateValue, isDateKey, isWeekKey, isBeforeStart, stripRoutineMeta,
    // Constants
    TARGETS, HOME_FOODS, TRAINING_PLAN_VERSION, TRAINING_PLAN_EFFECTIVE_WEEK, TRAINING_PLAN_START, START_WEEK,
    MEDS_STOCK_DEFAULT, MEDS_STOCK_KEY, BOOK_DEFAULT, DAY_KEYS, trainingPlanRoutines, HOLIDAYS_2026,
    // Components
    IChevD, ICheck, IPlay, IPause, IReset, ICal, ISync, IHome, IBar, ITarget, IBook, IBell, IEdit, IList, IDumb, IActivity, IClock, IChevL, IChevR,
    Card, SectionAccordion, Inp, CheckRow,
    ProteinProgress, WaterTracker, SmartCena, NutritionReviewCard,
    DashboardStatCard, DashboardActionCard, DashboardTagChip,
    // Views
    createProductivityView, createHealthView, createRecipesView, createStudyView, createBooksView,
    createProgressViews, createTimerView, createNotifView, createGymPanel, createLoginView, createRoutineEditor,
    createTodayDashboard,
    // Habits
    createHabitsPanel
  } = deps;

  // Initialize modularized views
  const ProductivityView = createProductivityView(deps);
  const HealthView = createHealthView(deps);
  const RecipesView = createRecipesView(deps);
  const StudyView = createStudyView(deps);
  const BooksView = createBooksView(deps);
  const { WeekSummary, ProgressView } = createProgressViews(deps);
  const FloatingTimer = createTimerView(deps);
  const NotifView = createNotifView(deps);
  const { GymPanel, RoutineManager } = createGymPanel(deps);
  const LoginView = createLoginView(deps);
  const TodayDashboard = createTodayDashboard(deps);
  const { HabitsPanel, getYesterdayFast, getRelativeDaySnapshot } = createHabitsPanel(deps);
  const RoutineEditor = createRoutineEditor(deps);
  const RoutineEditor = createRoutineEditor(deps);

  return function App() {
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [outboxCount, setOutboxCount] = useState(0);
    const [syncLog, setSyncLog] = useState({ lastSync: null, lastError: null });
    const [view, setView] = useState(() => {
      const p = new URLSearchParams(window.location.search).get('view');
      return (p && ['today','week','progress','tasks','recipes','notif','routines','study','health','books'].includes(p)) ? p : 'today';
    });
    const [error] = useErrorBoundary();
    if (error) {
      return html`<div style="color:red;padding:20px;font-family:monospace;background:black;height:100vh;">RENDER CRASH: ${String(error)} ${error.stack}</div>`;
    }

    const [chartsReady, setChartsReady] = useState(() => !!window.Recharts);
    const [routineData, setRoutineData] = useState(() => {
      const v3Keys = lsAllRoutineKeys();
      if(v3Keys.length > 0) {
        const r = {};
        v3Keys.forEach(id => { const d = lsRoutineLoad(id); if(d) r[id] = d; });
        if(Object.keys(r).length > 0) return r;
      }
      return trainingPlanRoutines;
    });
    const [currentWk, setCurrentWk] = useState(() => getWeekKey(new Date()));
    const [activeDay, setActiveDay] = useState(() => String(new Date().getDay()));
    const activeDayRef = useRef(activeDay);
    useEffect(() => { activeDayRef.current = activeDay; }, [activeDay]);
    const [allWeeks, setAllWeeks] = useState({});
    const [syncLoadStatus, setSyncLoadStatus] = useState('idle');
    const [syncLoadMsg, setSyncLoadMsg] = useState('');
    const [timerLeft, setTimerLeft] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [moduleAlerts, setModuleAlerts] = useState({ study:0, health:false, books:false, recipes:0, notif:false });
    const timerRef = useRef(null);
    const audioRef = useRef(typeof Audio !== 'undefined' ? new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=') : null);
    const bootstrapAppliedRef = useRef(false);
    const saveTimerRef = useRef(null);
    const prevTrackerRef = useRef(null);
    const prevWeeklyRef = useRef(null);

    const navigateTo = (tab) => {
      setView(tab);
      if(!chartsReady && (tab === 'week' || tab === 'progress')) {
        window._loadRecharts && window._loadRecharts().then(() => {
          window._RC = window.Recharts || {};
          setChartsReady(true);
        });
      }
    };

    const upd = (fn_upd) => {
      setAllWeeks(prev => {
        const wk = prev[currentWk] || newWeek(currentWk);
        return { ...prev, [currentWk]: fn_upd(wk) };
      });
    };

    const isDeloadWeek = useCallback((wkKey = '') => {
      const base = new Date(`${TRAINING_PLAN_START}T12:00:00`);
      const week = new Date(`${wkKey}T12:00:00`);
      if (!isValidDateValue(base) || !isValidDateValue(week)) return false;
      const diff = Math.floor((week - base) / (7 * 24 * 3600 * 1000));
      return diff >= 6 && diff % 6 === 0;
    }, []);

    const ensureSession = useCallback((wkKey, dayKey) => {
      setAllWeeks(prev => {
        const wd = prev[wkKey] || newWeek(wkKey);
        const assignments = getRoutineAssignments(wd);
        const rid = assignments[dayKey];
        const rForWeek = getRoutineForWeek(rid, routineData, wkKey, isDeloadWeek);
        if(!rid || !rForWeek) {
          if(wd.sessions[dayKey]) return { ...prev, [wkKey]: { ...wd, sessions: { ...wd.sessions, [dayKey]: null } } };
          return prev;
        }
        if(wd.sessions[dayKey] && wd.sessions[dayKey]._routineId === rid) return prev;
        const session = rForWeek.exercises.map((ex, ei) => ({
          ...ex,
          id: `ex-${wkKey}-${dayKey}-${ei}`,
          sets: ex.sets.map((s, si) => ({
            ...s,
            id: `s-${wkKey}-${dayKey}-${ei}-${si}`,
            completed: false,
            idealReps: s.reps
          }))
        }));
        session._routineId = rid;
        session._routineName = rForWeek.name;
        return { ...prev, [wkKey]: { ...wd, sessions: { ...wd.sessions, [dayKey]: session } } };
      });
    }, [routineData]);

    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if(params.get('dev') === '1' || params.get('bypass') === '1') {
        setSession({ user: { id: '00000000-0000-0000-0000-000000000000', email: 'guest@enzo.training' } });
        setAuthLoading(false);
        return;
      }
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setAuthLoading(false);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
        if(!new URLSearchParams(window.location.search).get('dev')) {
          setSession(sess);
          setAuthLoading(false);
        }
      });
      return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
      if(metaGet('training_plan_version') === TRAINING_PLAN_VERSION) return;
      metaSet('training_plan_version', TRAINING_PLAN_VERSION);
      setRoutineData(trainingPlanRoutines);
      // saveRoutines logic local logic
      Object.entries(trainingPlanRoutines).forEach(([id, data]) => lsRoutineSave(id, { ...data, _updatedAt: new Date().toISOString() }));
    }, []);

    const refreshModuleAlerts = useCallback(async () => {
      try {
        const [ { data: invRows }, { data: studyRows }, { data: recipeRows } ] = await Promise.all([
          supabase.from('app_inventory').select('key,data').in('key', ['meds_stock', 'reading_progress']),
          supabase.from('study_plan').select('subject,topics'),
          supabase.from('user_recipes').select('stock_qty,low_stock_threshold')
        ]);
        const inventory = Object.fromEntries((invRows || []).map(row => [row.key, row.data || {}]));
        const meds = { ...MEDS_STOCK_DEFAULT, ...(inventory.meds_stock || {}) };
        const book = { ...BOOK_DEFAULT, ...(inventory.reading_progress || {}) };
        const studyPending = (studyRows || []).flatMap(row => row.topics || []).filter(topic => !topic?.done).length;
        const recipesLow = (recipeRows || []).filter(row => pn(row.stock_qty) > 0 && pn(row.low_stock_threshold) > 0 && pn(row.stock_qty) <= pn(row.low_stock_threshold)).length;
        const lastBackupAt = metaGet('last_backup_at');
        const backupDue = !lastBackupAt || Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 3600000) >= 72;
        setModuleAlerts({ study: studyPending, health: pn(meds.roaccutan) <= 2 || pn(meds.minoxidil_finasteride) <= 2, books: pn(book.current_page) > 0 && pn(book.current_page) < pn(book.total_pages), recipes: recipesLow, notif: backupDue });
      } catch(_) {}
    }, []);

    useEffect(() => {
      refreshModuleAlerts();
      const h = setInterval(refreshModuleAlerts, 60000 * 5); // cada 5 min
      return () => clearInterval(h);
    }, [refreshModuleAlerts]);

    const restoreRemovedItemStock = useCallback((removedItem) => {
      if(!removedItem?.recipe_id) return;
      supabase.from('user_recipes').select('id, stock_qty').eq('id', removedItem.recipe_id).single().then(({ data }) => {
        if(!data) return;
        const delta = parseFloat(removedItem.stock_delta || 0);
        if(delta > 0) {
          supabase.from('user_recipes').update({ stock_qty: (parseFloat(data.stock_qty) || 0) + delta, updated_at: new Date().toISOString() }).eq('id', removedItem.recipe_id).then(()=>{});
        }
      });
    }, []);

    const addMealItem = (mealIdx, item) => upd(w => {
      const meals = [...(w.tracker[activeDay].meals || [])];
      meals[mealIdx] = { ...meals[mealIdx], items: [...(meals[mealIdx].items || []), item] };
      return { ...w, tracker: { ...w.tracker, [activeDay]: { ...w.tracker[activeDay], meals } } };
    });

    const removeMealItem = (mealIdx, itemIdx, removedItem) => {
      upd(w => {
        const meals = [...(w.tracker[activeDay].meals || [])];
        meals[mealIdx] = { ...meals[mealIdx], items: (meals[mealIdx].items || []).filter((_, i) => i !== itemIdx) };
        return { ...w, tracker: { ...w.tracker, [activeDay]: { ...w.tracker[activeDay], meals } } };
      });
      if(removedItem) restoreRemovedItemStock(removedItem);
    };

    const replaceMealItem = (mealIdx, itemIdx, item, prevItem) => {
      upd(w => {
        const meals = [...(w.tracker[activeDay].meals || [])];
        const items = [...(meals[mealIdx].items || [])];
        items[itemIdx] = item;
        meals[mealIdx] = { ...meals[mealIdx], items };
        return { ...w, tracker: { ...w.tracker, [activeDay]: { ...w.tracker[activeDay], meals } } };
      });
      if(prevItem) restoreRemovedItemStock(prevItem);
    };

    const handleSetComplete = (ei, si, restSecs) => upd(w => {
      const s = [...(w.sessions[activeDay] || [])];
      if(!s[ei]) return w;
      const sets = [...s[ei].sets];
      const was = sets[si].completed;
      sets[si] = { ...sets[si], completed: !was };
      s[ei] = { ...s[ei], sets };
      if(!was && restSecs > 0) { setTimerLeft(restSecs); setTimerActive(true); }
      return { ...w, sessions: { ...w.sessions, [activeDay]: s } };
    });

    const handleSetInput = (ei, si, field, val) => upd(w => {
      const s = [...(w.sessions[activeDay] || [])];
      if(!s[ei]) return w;
      const sets = [...s[ei].sets];
      sets[si] = { ...sets[si], [field]: val };
      s[ei] = { ...s[ei], sets };
      return { ...w, sessions: { ...w.sessions, [activeDay]: s } };
    });

    const handleCompleteSession = () => upd(w => {
      const s = [...(w.sessions[activeDay] || [])].map(ex => ({ ...ex, sets: ex.sets.map(st => ({ ...st, completed: true })) }));
      const td = w.tracker[activeDay] || newDay();
      const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
      return { ...w, tracker: { ...w.tracker, [activeDay]: { ...td, gymEndTime: td.gymEndTime || nowTime } }, sessions: { ...w.sessions, [activeDay]: s } };
    });

    const handleResetSessionChecks = () => upd(w => {
      const s = [...(w.sessions[activeDay] || [])].map(ex => ({ ...ex, sets: ex.sets.map(st => ({ ...st, completed: false })) }));
      return { ...w, sessions: { ...w.sessions, [activeDay]: s } };
    });

    const handleRoutineChange = (value) => {
      upd(w => {
        const dm = { ...w.dayMapping };
        const ns = { ...w.sessions };
        const assignments = getRoutineAssignments(w);
        const nextAssignments = { ...assignments };
        if (value) {
          DAY_KEYS.forEach(k => {
            if (assignments[k] === value && k !== activeDay) {
              nextAssignments[k] = '';
              delete ns[k];
            }
          });
        }
        nextAssignments[activeDay] = value;
        delete ns[activeDay];
        return { ...w, dayMapping: { ...dm, ...nextAssignments, _planMode: getPlanMode(w) }, sessions: ns };
      });
      if (value) setTimeout(() => ensureSession(currentWk, activeDay), 50);
    };

    const handlePlanModeChange = (nextMode) => {
      upd(w => ({
        ...w,
        dayMapping: { ...w.dayMapping, ...buildPlanDayMapping(nextMode, currentWk, (dk) => isGymClosedDate(dk, HOLIDAYS_2026), getDayDate), _planMode: nextMode },
        sessions: {}
      }));
      DAY_KEYS.forEach(dayKey => setTimeout(() => ensureSession(currentWk, dayKey), 20));
    };

    const handleApplyOverload = (candidates) => {
      const updatedRoutines = JSON.parse(JSON.stringify(routineData));
      const rid = (allWeeks[currentWk]?.dayMapping || {})[activeDay];
      if(!rid || !updatedRoutines[rid]) return;
      candidates.forEach(cand => {
        const ex = updatedRoutines[rid].exercises.find(e => e.name === cand.name);
        if(!ex) return;
        ex.sets = ex.sets.map(s => ({ ...s, weight: (pn(s.weight) + 2.5).toFixed(1).replace('.', ',') }));
      });
      setRoutineData(updatedRoutines);
      saveRoutineRemote(supabase, stripRoutineMeta, rid, updatedRoutines[rid], updatedRoutines[rid]._revision || null, session);
      Object.entries(updatedRoutines).forEach(([id, data]) => lsRoutineSave(id, { ...data, _updatedAt: new Date().toISOString() }));
    };

    useEffect(() => {
      const { weeklyCache, dailyCache, routinesCache } = loadLocalCaches();
      const localAllWeeks = buildAllWeeks(weeklyCache, dailyCache, hydrate);
      const initWk = currentWk >= START_WEEK ? currentWk : START_WEEK;
      if(!localAllWeeks[initWk]) localAllWeeks[initWk] = newWeek(initWk);
      setAllWeeks(localAllWeeks);
      if(Object.keys(routinesCache).length > 0) setRoutineData(prev => ({ ...prev, ...routinesCache }));

      supabase.auth.getSession().then(async ({ data: { session: s } }) => {
        if(!s || s.user.email === 'guest@enzo.training') return;
        try {
          const bData = await bootstrapRemoteState(supabase, getWeekKey, addWeeks);
          const { weeklyCache: wc2, dailyCache: dc2, routinesCache: rc2 } = applyBootstrapToState(bData, weeklyCache, dailyCache);
          setAllWeeks(buildAllWeeks(wc2, dc2, hydrate));
          bootstrapAppliedRef.current = true;
          if(Object.keys(rc2).length > 0) setRoutineData(prev => ({ ...prev, ...rc2 }));
          setSyncLog(prev => ({ ...prev, lastSync: new Date().toLocaleTimeString('es-AR') }));
        } catch(e) { console.warn('[App] Bootstrap Error:', e); setSyncLog(prev => ({ ...prev, lastError: e.message?.slice(0,60) })); }
      });
    }, []);

    useEffect(() => {
      if(Object.keys(allWeeks).length === 0) return;
      Object.entries(allWeeks).forEach(([wkKey, wkData]) => {
        if(!isDateKey(wkKey)) return;
        lsWeekSave(wkKey, { dayMapping: wkData.dayMapping, bodyWeight: wkData.bodyWeight||'' });
        Object.entries(wkData.tracker||{}).forEach(([dayIdx, dayData]) => {
          lsDaySave(getDayDate(wkKey, parseInt(dayIdx)), { ...dayData, _session: wkData.sessions?.[dayIdx] || null });
        });
      });
      if(bootstrapAppliedRef.current) {
        bootstrapAppliedRef.current = false;
        const wkData = allWeeks[currentWk];
        if(wkData) {
          prevWeeklyRef.current = JSON.stringify({ bw: wkData.bodyWeight, dm: wkData.dayMapping });
          prevTrackerRef.current = JSON.stringify(wkData.tracker?.[activeDayRef.current]);
        }
        return;
      }
      const wkData = allWeeks[currentWk];
      if(!wkData) return;
      const dayStr = activeDayRef.current;
      const weeklyStr = JSON.stringify({ bw: wkData.bodyWeight, dm: wkData.dayMapping });
      if(weeklyStr !== prevWeeklyRef.current) {
        prevWeeklyRef.current = weeklyStr;
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveWeeklyRemote(supabase, currentWk, wkData.bodyWeight||null, wkData.dayMapping||{}, wkData._revision||null, session), 1500);
        return;
      }
      const trackerStr = JSON.stringify(wkData.tracker?.[dayStr]);
      if(trackerStr !== prevTrackerRef.current) {
        prevTrackerRef.current = trackerStr;
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          const dKey = getDayDate(currentWk, parseInt(dayStr));
          saveDayRemote(supabase, dKey, wkData.tracker?.[dayStr], session, wkData.tracker?.[dayStr]?._revision||null);
        }, 1500);
      }
    }, [allWeeks]);

    useEffect(() => ensureSession(currentWk, activeDay), [currentWk, activeDay, routineData, allWeeks[currentWk]?.dayMapping]);

    const handleSaveRoutines = async (updated) => {
      setRoutineData(updated);
      Object.entries(updated).forEach(([id, data]) => {
        lsRoutineSave(id, { ...data, _updatedAt: new Date().toISOString() });
        saveRoutineRemote(supabase, stripRoutineMeta, id, data, data?._revision || null, session).catch(() => {});
      });
      try { localStorage.setItem('enzo_routines_v1', JSON.stringify(updated)); } catch (_) {}
    };

    const navWeek = (dir) => {
      const nextWeek = addWeeks(currentWk, dir);
      if (isBeforeStart(nextWeek)) return;
      setCurrentWk(nextWeek);
      setAllWeeks(prev => prev[nextWeek] ? prev : { ...prev, [nextWeek]: newWeek(nextWeek) });
    };

    const isAtStart = currentWk <= START_WEEK;
    const isCurrentWeekLocal = (weekKey) => getWeekKey(new Date()) === weekKey;

    if(authLoading) return html`<div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#64748b;">Iniciando seguridad...</div>`;
    if(!session) return html`<${LoginView} onDevBypass=${() => window.location.search += (window.location.search ? '&' : '?') + 'dev=1'} />`;

    const wd = allWeeks[currentWk] || newWeek(currentWk);
    const tracker = wd.tracker[activeDay] || newDay();
    const gymSession = wd.sessions[activeDay] || [];
    
    const routineAssignments = getRoutineAssignments(wd);
    const planMode = getPlanMode(wd);
    const selectableRoutineIds = String(planMode) === '5' ? ['1','2','3','4','5'] : ['1','2','4','5'];
    const selectableRoutines = selectableRoutineIds.map(id => routineData[id]).filter(Boolean);
    const routineId = routineAssignments[activeDay];
    const routineInfo = routineId ? getRoutineForWeek(routineId, routineData, currentWk, isDeloadWeek) : null;
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

    const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayWk = getWeekKey(yesterdayDate);
    const yesterdayIdx = String(yesterdayDate.getDay());
    const prevDayTracker = (allWeeks[yesterdayWk]?.tracker?.[yesterdayIdx]) || {};
    const yesterdayFastMsg = getYesterdayFast(allWeeks, currentWk, activeDay);
    const navBadges = { study: moduleAlerts.study > 0 ? (moduleAlerts.study > 9 ? '9+' : String(moduleAlerts.study)) : '', health: moduleAlerts.health ? '!' : '', books: moduleAlerts.books ? '•' : '', recipes: moduleAlerts.recipes > 0 ? (moduleAlerts.recipes > 9 ? '9+' : String(moduleAlerts.recipes)) : '', notif: moduleAlerts.notif ? '!' : '' };

    return html`
      <div style="max-width:480px;margin:0 auto;position:relative;min-height:100dvh;background:#05070A;display:flex;flex-direction:column;">
        <header style="position:sticky;top:0;z-index:100;background:rgba(5,7,10,0.8);backdrop-filter:blur(12px);padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.03);display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10B981,#3B82F6);display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px rgba(16,185,129,0.3);">
              <${IDumb} s=${20} c="#05070A"/>
            </div>
            <div>
              <h1 style="margin:0;font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#fff;line-height:1;">ENZO <span style="color:#10B981;">TRAINING</span></h1>
              <p style="margin:2px 0 0;font-size:10px;color:#64748b;font-weight:700;">${view === 'today' ? 'DIARIO NUTRICIONAL' : view.toUpperCase()}</p>
            </div>
          </div>
          <button onClick=${() => navigateTo('notif')} style="padding:8px;border:none;background:transparent;color:#94A3B8;cursor:pointer;">
             <${IBell} s=${20} />
          </button>
        </header>

        <main style="flex:1;padding:16px;display:flex;flex-direction:column;gap:16px;padding-bottom:100px;">
          ${view === 'today' && html`
            <div style="display:flex;flex-direction:column;gap:12px;">
              <!-- Navegación de Semana -->
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <button class="btn-icon" style=${`background:#162035;border:1px solid #1E2D45;opacity:${isAtStart ? '0.3' : '1'};width:32px;height:32px;border-radius:8px;color:white;cursor:pointer;`} onClick=${()=>navWeek(-1)} disabled=${isAtStart}>
                  <${IChevL} s=${16}/>
                </button>
                <div style="flex:1;text-align:center;">
                  <p style="margin:0;font-size:13px;font-weight:700;color:white;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.03em;">${formatWeekLabel(currentWk)}</p>
                  ${isCurrentWeekLocal(currentWk) && html`<span style="font-size:9px;font-family:'JetBrains Mono',monospace;color:#10B981;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">SEMANA ACTUAL</span>`}
                </div>
                <button class="btn-icon" style=${`background:#162035;border:1px solid #1E2D45;opacity:${isCurrentWeekLocal(currentWk) ? '0.3' : '1'};width:32px;height:32px;border-radius:8px;color:white;cursor:pointer;`} onClick=${()=>navWeek(1)} disabled=${isCurrentWeekLocal(currentWk)}>
                  <${IChevR} s=${16}/>
                </button>
              </div>

              <!-- Tabs de Días -->
              <div class="hide-scroll" style="display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;">
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
                      style=${`flex:1;min-width:38px;padding:8px 4px;border-radius:10px;border:1px solid ${active ? (closed ? '#EF4444' : '#10B981') : (closed ? 'rgba(239,68,68,0.35)' : '#1E2D45')};background:${active ? (closed ? 'rgba(239,68,68,0.18)' : '#10B981') : (closed ? 'rgba(127,29,29,0.18)' : '#162035')};cursor:pointer;position:relative;transition:all 0.2s ease;`}>
                      <p style=${`margin:0;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:${active ? 'white' : closed ? '#FCA5A5' : '#64748b'};`}>${day.abbr}</p>
                      <p style=${`margin:0;font-size:9px;font-weight:500;color:${active ? 'rgba(255,255,255,0.75)' : closed ? '#FCA5A5' : '#475569'};`}>${day.label}</p>
                      ${hasRoutine && !active && html`<div style="position:absolute;top:4px;right:4px;width:5px;height:5px;border-radius:50%;background:#6366F1;"></div>`}
                      ${closed && html`<div style="position:absolute;top:3px;left:3px;width:5px;height:5px;border-radius:50%;background:#EF4444;"></div>`}
                      ${done > 0 && html`<div style="position:absolute;bottom:3px;right:3px;font-size:8px;font-family:'JetBrains Mono',monospace;color:#10B981;font-weight:800;">${done}</div>`}
                    </button>
                  `;
                })}
              </div>

              <div class="glass-card" style="padding:12px;display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:10px;text-transform:uppercase;color:#64748b;">Split semanal</span>
                    <select class="inp" style="min-width:118px;font-size:12px;padding:8px 10px;background:#0F1729;border:1px solid #1E2D45;color:white;border-radius:8px;" value=${planMode} onChange=${e=>handlePlanModeChange(e.target.value)}>
                      <option value="4">4 dias</option>
                      <option value="5">5 dias</option>
                    </select>
                    ${isDeloadWeek(currentWk) && html`<span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;background:rgba(245,158,11,0.12);color:#FCD34D;">DESCARGA - RIR 4-5</span>`}
                  </div>
                  <span style="font-size:11px;color:#94A3B8;">
                    ${planMode === '4' ? 'Máximo 2 días seguidos. El tercero va descanso.' : 'Distribución de 5 días con los mismos ejercicios.'}
                  </span>
                </div>

                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
                  <div>
                    <h2 style="margin:0;font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:800;letter-spacing:0.04em;color:white;">
                      ${routineInfo?.fullName || `DÍA ${activeDay}: Descanso`}
                    </h2>
                    ${routineInfo?.description && html`<p style="margin:2px 0 0;font-size:13px;color:#6366F1;">${routineInfo.description}</p>`}
                  </div>
                  <select class="inp" style="min-width:120px;font-size:12px;padding:8px 10px;background:#1E2D45;border:1px solid #334155;color:white;border-radius:8px;" value=${routineId || ''} onChange=${e=>handleRoutineChange(e.target.value)}>
                    <option value="">Descanso</option>
                    ${selectableRoutines.map(r => html`<option value=${r.id}>${r.name}</option>`)}
                  </select>
                </div>
              </div>

              ${(activeDayClosed || hitTwoConsecutiveRule || isDeloadWeek(currentWk)) && html`
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${activeDayClosed && html`
                    <div style="padding:10px 12px;border-radius:10px;background:rgba(127,29,29,0.18);border:1px solid rgba(239,68,68,0.35);">
                      <p style="margin:0;font-size:12px;color:#FCA5A5;font-weight:700;">Gimnasio cerrado para este día.</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#CBD5E1;">Si igual entrenaste, podés asignar la rutina manualmente desde el selector.</p>
                    </div>
                  `}
                  ${hitTwoConsecutiveRule && html`
                    <div style="padding:10px 12px;border-radius:10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);">
                      <p style="margin:0;font-size:12px;color:#FCD34D;font-weight:700;">Ya entrenaste 2 días seguidos: hoy toca descanso.</p>
                      <p style="margin:4px 0 0;font-size:11px;color:#CBD5E1;">La app te deja forzarlo manualmente, pero el split de 4 días recomienda frenar.</p>
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
              <${HabitsPanel} tracker=${tracker} selectedDateKey=${getDayDate(currentWk, parseInt(activeDay))} yesterdayFastMsg=${yesterdayFastMsg} onChange=${(f,v) => upd(w => ({...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],[f]:v}}}))} onMed=${(m,v) => upd(w => ({...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],meds:{...(w.tracker[activeDay].meds||{}),[m]:v}}}}))} onMeal=${addMealItem} onAddItem=${addMealItem} onRemoveItem=${removeMealItem} onReplaceItem=${replaceMealItem}/>
              <${GymPanel} session=${effectiveGymSession} tracker=${tracker} onSetComplete=${handleSetComplete} onInput=${handleSetInput} onHabit=${(f,v) => upd(w => ({...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],[f]:v}}}))} onApplyOverload=${handleApplyOverload} onCompleteSession=${handleCompleteSession} onResetSessionChecks=${handleResetSessionChecks} />
              
              ${effectiveGymSession.length === 0 && !routineId && html`
                <${Card}>
                  <div style="text-align:center;padding:24px 0;">
                    <p style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;color:#cbd5e1;margin:0;">Día de descanso</p>
                    <p style="font-size:13px;color:#64748b;margin:4px 0 0;">Recuperá y registrá tus habitos arriba.</p>
                  </div>
                <//>
              `}
            </div>
          `}
          ${view === 'tasks' && html`<${ProductivityView} session=${session} />`}
          ${view === 'week' && html`<${WeekSummary} weekData=${allWeeks[currentWk]} weekKey=${currentWk} />`}
          ${view === 'progress' && html`<${ProgressView} session=${session} allWeeks=${allWeeks} chartsReady=${chartsReady} />`}
          ${view === 'recipes' && html`<${RecipesView} session=${session} />`}
          ${view === 'study' && html`<${StudyView} session=${session} />`}
          ${view === 'health' && html`<${HealthView} session=${session} todayMeds=${tracker.meds||{}} previousDayMeds=${prevDayTracker.meds||{}} weekTracker=${wd.tracker||{}} healthWeekKey=${currentWk} bodyWeight=${wd.bodyWeight||''} onBodyWeight=${v => upd(w => ({...w, bodyWeight: v}))} onSyncDailyMeds=${(partial, dk) => upd(w => {const dayIdx = new Date(dk+'T12:00:00').getDay(); const dayKey = String(dayIdx); const td = w.tracker[dayKey] || newDay(); return {...w, tracker: {...w.tracker, [dayKey]: {...td, meds: {...(td.meds||{}), ...partial}}}}})} onOpenDay=${d => {const dayIdx = new Date(d+'T12:00:00').getDay(); setActiveDay(String(dayIdx)); setView('today');}} />`}
          ${view === 'books' && html`<${BooksView} session=${session} />`}
          ${view === 'notif' && html`<${NotifView} session=${session} />`}
          ${view === 'routines' && html`
            <div style="display:flex;flex-direction:column;gap:16px;">
              <${RoutineEditor} routines=${routineData} onSave=${handleSaveRoutines} />
              <${RoutineManager} weekKey=${currentWk} weekData=${wd} routineData=${routineData} onMappingChange=${(dm) => upd(w => ({...w, dayMapping: dm}))} />
            </div>
          `}
        </main>

        <nav style="position:fixed;bottom:0;left:0;right:0;max-width:480px;margin:0 auto;background:rgba(10,15,30,0.95);backdrop-filter:blur(16px);border-top:1px solid #1E2D45;padding-bottom:env(safe-area-inset-bottom);overflow-x:auto;">
           <div style="display:flex;min-width:max-content;padding:0 4px;">
              ${[
                {id:'today',    icon:html`<${IHome} s=${20}/>`, label:'HOY'},
                {id:'week',     icon:html`<${ICal}  s=${20}/>`, label:'SEMANA'},
                {id:'progress', icon:html`<${IBar}  s=${20}/>`, label:'PROGR'},
                {id:'tasks',    icon:html`<${IList} s=${20}/>`, label:'TAREAS'},
                {id:'study',    icon:html`<${ITarget} s=${20}/>`, label:'ESTUD'},
                {id:'health',   icon:html`<${IBell} s=${20}/>`, label:'SALUD'},
                {id:'books',    icon:html`<${IBook} s=${20}/>`, label:'OCIO'},
                {id:'recipes',  icon:html`<${IActivity} s=${20}/>`, label:'RECET'},
                {id:'notif',    icon:html`<${IClock} s=${20}/>`, label:'ALERTA'},
                {id:'routines', icon:html`<${IEdit} s=${20}/>`, label:'RUTINA'},
              ].map(tab => html`
                <button onClick=${() => navigateTo(tab.id)} style=${`flex:none;width:56px;padding:12px 0;border:none;background:transparent;color:${view === tab.id ? '#10B981' : '#64748B'};cursor:pointer;display:flex;flex-direction:column;align-items:center;position:relative;`}>
                   ${navBadges[tab.id] && html`
                     <span style=${`position:absolute;top:6px;right:6px;min-width:${navBadges[tab.id].length > 1 ? '16px' : '12px'};height:12px;padding:0 3px;border-radius:999px;background:${tab.id==='health' ? '#EF4444' : '#F59E0B'};color:#fff;font-size:8px;font-weight:800;font-family:'JetBrains Mono',monospace;display:flex;align-items:center;justify-content:center;line-height:1;`}>
                       ${navBadges[tab.id]}
                     </span>
                   `}
                   ${tab.icon}
                   <span style="font-size:9px;margin-top:2px;font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.05em;">${tab.label}</span>
                </button>
              `)}
           </div>
        </nav>

        ${(timerActive || timerLeft > 0) && html`<${FloatingTimer} left=${timerLeft} active=${timerActive} onToggle=${() => setTimerActive(a => !a)} onReset=${() => { setTimerLeft(0); setTimerActive(false); }} />`}
      </div>
    `;
  };
};
