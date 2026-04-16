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
    getDinnerLogicalDateKey, localDateKey, getDayDate, getWeekKey, addWeeks,
    // Gym
    getPlanMode, getRoutineAssignments, getRoutineForWeek, isGymClosedDate, didTrainDay,
    // Utils
    formatTaskDate, priorityColor, normalizeSubtasks, computeNextRecurringDueAt,
    isValidDateValue, isDateKey, isWeekKey, isBeforeStart, stripRoutineMeta,
    // Constants
    TARGETS, HOME_FOODS, TRAINING_PLAN_VERSION, TRAINING_PLAN_EFFECTIVE_WEEK, START_WEEK,
    MEDS_STOCK_DEFAULT, MEDS_STOCK_KEY, BOOK_DEFAULT, DAY_KEYS, trainingPlanRoutines,
    // Components
    IChevD, ICheck, IPlay, IPause, IReset, ICal, ISync, IHome, IBar, ITarget, IBook, IBell, IEdit, IList, IDumb, IActivity, IClock,
    Card, SectionAccordion, Inp, CheckRow,
    ProteinProgress, WaterTracker, SmartCena, NutritionReviewCard,
    DashboardStatCard, DashboardActionCard, DashboardTagChip,
    // Views
    createProductivityView, createHealthView, createRecipesView, createStudyView, createBooksView,
    createProgressViews, createTimerView, createNotifView, createGymPanel, createLoginView,
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

    const ensureSession = useCallback((wkKey, dayKey) => {
      setAllWeeks(prev => {
        const wd = prev[wkKey] || newWeek(wkKey);
        const assignments = getRoutineAssignments(wd);
        const rid = assignments[dayKey];
        const rForWeek = getRoutineForWeek(rid, routineData, wkKey, () => {
          const base = new Date(`${deps.TRAINING_PLAN_START}T12:00:00`);
          const week = new Date(`${wkKey}T12:00:00`);
          if(!isValidDateValue(base) || !isValidDateValue(week)) return false;
          const diff = Math.floor((week - base) / (7 * 24 * 3600 * 1000));
          return diff >= 6 && diff % 6 === 0;
        });
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

    if(authLoading) return html`<div style="height:100vh;display:flex;align-items:center;justify-content:center;color:#64748b;">Iniciando seguridad...</div>`;
    if(!session) return html`<${LoginView} onDevBypass=${() => window.location.search += (window.location.search ? '&' : '?') + 'dev=1'} />`;

    const wd = allWeeks[currentWk] || newWeek(currentWk);
    const tracker = wd.tracker[activeDay] || newDay();
    const gymSession = wd.sessions[activeDay] || [];
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
            <${TodayDashboard} session=${session} tracker=${tracker} gymSession=${gymSession} onOpenRoutines=${() => navigateTo('routines')} selectedDateKey=${getDayDate(currentWk, parseInt(activeDay))} onOpenTasks=${() => navigateTo('tasks')} onOpenStudy=${() => navigateTo('study')} onOpenBooks=${() => navigateTo('books')} onOpenHealth=${() => navigateTo('health')} onOpenRecipes=${() => navigateTo('recipes')} onOpenNotif=${() => navigateTo('notif')} />
            <${HabitsPanel} tracker=${tracker} selectedDateKey=${getDayDate(currentWk, parseInt(activeDay))} yesterdayFastMsg=${yesterdayFastMsg} onChange=${(f,v) => upd(w => ({...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],[f]:v}}}))} onMed=${(m,v) => upd(w => ({...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],meds:{...(w.tracker[activeDay].meds||{}),[m]:v}}}}))} onMeal=${(i,f,v) => upd(w => {const meals=[...w.tracker[activeDay].meals];meals[i]={...meals[i],[f]:v};return{...w,tracker:{...w.tracker,[activeDay]:{...w.tracker[activeDay],meals}}};})}/>
            <${GymPanel} session=${gymSession} tracker=${tracker} onSetComplete=${(ei,si,rs) => upd(w => {const s=[...(w.sessions[activeDay]||[])];const sets=[...s[ei].sets];sets[si]={...sets[si],completed:!sets[si].completed};s[ei]={...s[ei],sets};if(sets[si].completed){setTimerLeft(rs);setTimerActive(true)};return{...w,sessions:{...w.sessions,[activeDay]:s}};})} />
          `}
          ${view === 'tasks' && html`<${ProductivityView} session=${session} />`}
          ${view === 'week' && html`<${WeekSummary} weekData=${allWeeks[currentWk]} weekKey=${currentWk} />`}
          ${view === 'progress' && html`<${ProgressView} session=${session} allWeeks=${allWeeks} chartsReady=${chartsReady} />`}
          ${view === 'recipes' && html`<${RecipesView} session=${session} />`}
          ${view === 'study' && html`<${StudyView} session=${session} />`}
          ${view === 'health' && html`<${HealthView} session=${session} todayMeds=${tracker.meds||{}} weekTracker=${wd.tracker||{}} healthWeekKey=${currentWk} onSyncDailyMeds=${(partial, dateKey) => {/* Placeholder hook */}} />`}
          ${view === 'books' && html`<${BooksView} session=${session} />`}
          ${view === 'notif' && html`<${NotifView} session=${session} />`}
          ${view === 'routines' && html`<${RoutineManager} weekKey=${currentWk} weekData=${wd} onMappingChange=${(dm) => upd(w => ({...w, dayMapping: dm}))} />`}
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
