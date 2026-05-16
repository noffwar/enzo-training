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
    getDinnerLogicalDateKey, localDateKey, getDayDate, getWeekKey, addWeeks, formatWeekLabel, dayTotals,
    // Gym
    getPlanMode, getRoutineAssignments, getRoutineForWeek, isGymClosedDate, didTrainDay, buildPlanDayMapping,
    // Utils
    formatTaskDate, priorityColor, normalizeSubtasks, computeNextRecurringDueAt,
    isValidDateValue, isDateKey, isWeekKey, isBeforeStart, stripRoutineMeta,
    // Constants
    TARGETS, HOME_FOODS, TRAINING_PLAN_VERSION, TRAINING_PLAN_EFFECTIVE_WEEK, TRAINING_PLAN_START, START_WEEK,
    MEDS_STOCK_DEFAULT, MEDS_STOCK_KEY, READING_PROGRESS_KEY, BOOK_DEFAULT, DAY_KEYS, DAYS, trainingPlanRoutines, HOLIDAYS_2026,
    HEALTH_HISTORY_FILTERS, getHealthEntryMeta,
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
    createHabitsPanel,
    // Sync UI
    SyncStatusIndicator, ConflictNotifier,
    // Lazy Loaders
    viewLoaders
  } = deps;

  const { GymPanel } = createGymPanel(deps);
  const TodayDashboard = createTodayDashboard(deps);
  const LoginView = createLoginView(deps);
  const { HabitsPanel, getYesterdayFast, getRelativeDaySnapshot } = createHabitsPanel(deps);
  const FloatingTimer = createTimerView(deps);

  return function App() {
    const [view, setView] = useState(() => {
      const p = new URLSearchParams(window.location.search).get('view');
      return (p && ['today','week','progress','tasks','recipes','notif','routines','study','health','books'].includes(p)) ? p : 'today';
    });
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loadedViews, setLoadedViews] = useState({});
    const [viewLoading, setViewLoading] = useState(false);

    // Error Boundary Component for Dynamic Views
    const ViewErrorBoundary = ({ children }) => {
      const [err, resetErr] = useErrorBoundary();
      if (err) {
        return html`
          <div style="padding:40px 20px;text-align:center;background:rgba(239,68,68,0.05);border-radius:16px;border:1px solid rgba(239,68,68,0.2);margin:20px;">
            <p style="color:#EF4444;font-size:40px;margin:0 0 10px;">⚠️</p>
            <p style="color:#FCA5A5;font-size:16px;font-weight:700;margin:0 0 10px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;text-transform:uppercase;">Error al cargar la vista</p>
            <p style="color:#94A3B8;font-size:11px;font-family:'JetBrains Mono',monospace;word-break:break-all;">${String(err)}</p>
            <button onClick=${resetErr} style="margin-top:20px;padding:8px 16px;border-radius:8px;border:none;background:#EF4444;color:#080D1A;font-weight:900;font-family:'Barlow Condensed',sans-serif;font-size:12px;cursor:pointer;letter-spacing:0.05em;text-transform:uppercase;">Reintentar</button>
          </div>
        `;
      }
      return children;
    };

    // Dynamic Loader
    const ensureViewLoaded = useCallback(async (viewName) => {
      if(loadedViews[viewName] || viewName === 'today' || !viewLoaders[viewName]) return;
      setViewLoading(true);
      try {
        const module = await viewLoaders[viewName]();
        const factoryKey = `create${viewName.charAt(0).toUpperCase()}${viewName.slice(1)}${viewName==='progress'?'Views':'View'}`;
        
        let component;
        if(viewName === 'progress' || viewName === 'week') {
          component = module.createProgressViews ? module.createProgressViews(deps) : null;
        } else if(typeof module[factoryKey] === 'function') {
          component = module[factoryKey](deps);
        } else if(typeof module.default === 'function') {
          component = module.default(deps);
        }
        
        if(component) {
          setLoadedViews(prev => ({ ...prev, [viewName]: component }));
        } else {
          console.error(`[Lazy] No factory found for ${viewName} (key: ${factoryKey})`);
        }
      } catch(e) { console.error(`[Lazy] Failed to load ${viewName}:`, e); }
      finally { setViewLoading(false); }
    }, [loadedViews]);

    useEffect(() => {
      ensureViewLoaded(view);
    }, [view, ensureViewLoaded]);

    const [outboxCount, setOutboxCount] = useState(0);
    const [syncLog, setSyncLog] = useState({ lastSync: null, lastError: null });
    const [syncStatus, setSyncStatus] = useState('synced'); // synced | syncing | conflict | offline
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
    const audioRef = useRef(null); // Will initialize with a short beep if needed

    // Timer Persistence Recovery
    const workerRef = useRef(null);
    const wakeLockRef = useRef(null);

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) { }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(()=>{});
        wakeLockRef.current = null;
      }
    };

    useEffect(() => {
      const savedEnd = localStorage.getItem('enzo_timer_end');
      if(savedEnd) {
        const remaining = Math.round((parseInt(savedEnd) - Date.now()) / 1000);
        if(remaining > 0) {
          setTimerLeft(remaining);
          setTimerActive(true);
        } else {
          localStorage.removeItem('enzo_timer_end');
        }
      }
      
      // Request Notification Permission
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }, []);

    useEffect(() => {
      if(localStorage.getItem('fixed_sets_v2') !== 'true') {
        localStorage.setItem('fixed_sets_v2', 'true');
        setRoutineData(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          Object.values(next).forEach(routine => {
            if(!routine.exercises) return;
            routine.exercises.forEach(ex => {
              if(Array.isArray(ex.sets) && ex.sets.length > 3) {
                ex.sets = ex.sets.slice(0, 3);
              }
            });
          });
          Object.entries(next).forEach(([id, data]) => lsRoutineSave(id, { ...data, _updatedAt: new Date().toISOString() }));
          return next;
        });
      }
    }, []);

    useEffect(() => {
      const handleVisChange = () => {
        if (document.visibilityState === 'visible' && timerActive) {
          requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisChange);
      return () => document.removeEventListener('visibilitychange', handleVisChange);
    }, [timerActive]);
    const bootstrapAppliedRef = useRef(false);
    const saveTimerRef = useRef(null);
    const prevTrackerRef = useRef(null);
    const prevWeeklyRef = useRef(null);

    const upd = (fn) => setAllWeeks(prev => {
      const wk = { ...(prev[currentWk] || newWeek(currentWk)) };
      const nextWk = fn(wk);
      return { ...prev, [currentWk]: nextWk };
    });

    const navigateTo = (tab) => {
      setView(tab);
      if(!chartsReady && (tab === 'week' || tab === 'progress')) {
        window._loadRecharts && window._loadRecharts().then(() => {
          window._RC = window.Recharts || {};
          setChartsReady(true);
        });
      }
    };

    const getWeekAndDayFromDateKey = (dateKey) => {
      const d = new Date(dateKey + 'T12:00:00');
      return { weekKey: getWeekKey(d), dayIdx: String(d.getDay()) };
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
      console.log('[Auth] Initializing...');
      const params = new URLSearchParams(window.location.search);
      if(params.get('dev') === '1' || params.get('bypass') === '1') {
        console.log('[Auth] Dev bypass active');
        setSession({ user: { id: '00000000-0000-0000-0000-000000000000', email: 'guest@enzo.training' } });
        setAuthLoading(false);
        return;
      }
      
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) console.error('[Auth] getSession error:', error);
        console.log('[Auth] getSession resolved:', !!data?.session);
        setSession(data?.session || null);
        setAuthLoading(false);
      }).catch(err => {
        console.error('[Auth] getSession critical error:', err);
        setAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
        console.log('[Auth] State change:', _event, !!sess);
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
    
    // Timer Countdown Logic
    useEffect(() => {
      if(!timerActive || timerLeft <= 0) {
        if(workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        releaseWakeLock();
        
        if (timerLeft <= 0) localStorage.removeItem('enzo_timer_end');
        return;
      }

      requestWakeLock();

      if(!localStorage.getItem('enzo_timer_end')) {
        localStorage.setItem('enzo_timer_end', (Date.now() + timerLeft * 1000).toString());
      }

      if(!workerRef.current) {
        const workerCode = `
          let interval;
          self.onmessage = function(e) {
            if(e.data === 'start') {
              interval = setInterval(() => self.postMessage('tick'), 1000);
            } else if(e.data === 'stop') {
              clearInterval(interval);
            }
          };
        `;
        const blob = new Blob([workerCode], {type: 'application/javascript'});
        workerRef.current = new Worker(URL.createObjectURL(blob));
        workerRef.current.onmessage = () => {
          const savedEnd = localStorage.getItem('enzo_timer_end');
          if(!savedEnd) {
            setTimerActive(false);
            setTimerLeft(0);
            return;
          }
          const remaining = Math.round((parseInt(savedEnd) - Date.now()) / 1000);
          
          if(remaining <= 0) {
            setTimerActive(false);
            setTimerLeft(0);
            localStorage.removeItem('enzo_timer_end');
            
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("¡Tiempo de descanso terminado!", {
                body: "Es hora de tu siguiente serie.",
                icon: "/icon-192.png",
                silent: false
              });
            }
            if ("vibrate" in navigator) {
              navigator.vibrate([300, 100, 300]);
            }
            const beep = new Audio('data:audio/wav;base64,UklGRl9vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19vT19v');
            beep.volume = 0.2;
            beep.play().catch(() => {});
          } else {
            setTimerLeft(remaining);
          }
        };
        workerRef.current.postMessage('start');
      }

      return () => {
        if(workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        releaseWakeLock();
      };
    }, [timerActive]);

    const normalizeRecipeKeyApp = (text='') => {
      const s = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
      return s.split(' ').filter(Boolean).map(w => (w.endsWith('es') && w.length > 4) ? w.slice(0, -2) : (w.endsWith('s') && w.length > 3) ? w.slice(0, -1) : w).join(' ');
    };

    const recalculateMealsUsingRecipe = async (recipe) => {
      if(!recipe) return;
      const modifiedDays = [];
      setAllWeeks(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(wkKey => {
          const wk = { ...next[wkKey] };
          let wkChanged = false;
          Object.keys(wk.tracker || {}).forEach(dayIdx => {
            const day = { ...wk.tracker[dayIdx] };
            let dayChanged = false;
            const nextMeals = (day.meals || []).map(meal => {
              let mealChanged = false;
              const nextItems = (meal.items || []).map(item => {
                if(item.recipe_id === recipe.id || (item.name && normalizeRecipeKeyApp(item.name) === normalizeRecipeKeyApp(recipe.recipe_name))) {
                  mealChanged = true;
                  dayChanged = true;
                  wkChanged = true;
                  changed = true;
                  const factor = (() => {
                    const bC = parseFloat(recipe.macros?.cals) || 0;
                    const iC = parseFloat(item.cals) || 0;
                    if(bC > 0 && iC > 0) return iC / bC;
                    return 1;
                  })();
                  return {
                    ...item,
                    recipe_id: recipe.id,
                    name: recipe.recipe_name,
                    nota: recipe.notes || item.nota || 'Receta guardada',
                    cals: Math.round((parseFloat(recipe.macros?.cals) || 0) * factor),
                    prot: Math.round((parseFloat(recipe.macros?.prot) || 0) * factor),
                    carb: Math.round((parseFloat(recipe.macros?.carb) || 0) * factor),
                    fat: Math.round((parseFloat(recipe.macros?.fat) || 0) * factor)
                  };
                }
                return item;
              });
              return mealChanged ? { ...meal, items: nextItems } : meal;
            });
            if(dayChanged) {
              day.meals = nextMeals;
              day._updatedAt = new Date().toISOString();
              day._dirty = true;
              wk.tracker[dayIdx] = day;
              const dk = getDayDate(wkKey, parseInt(dayIdx));
              modifiedDays.push({ dk, day });
            }
          });
          if(wkChanged) {
            next[wkKey] = wk;
          }
        });
        return changed ? next : prev;
      });

      // Side effects
      for(const { dk, day } of modifiedDays) {
        lsDaySave(dk, day);
        saveDayRemote(supabase, dk, day, session, day._revision).catch(() => {});
      }
    };

    const syncMedsInventoryFromToggle = async (med, prevMeds = {}, nextMeds = {}, targetDateKey) => {
      try {
        const deltaRoaccutan = (med === 'roacuttan') ? (nextMeds.roacuttan ? -1 : 1) : 0;
        
        let deltaCombo = 0;
        const isDinnerMed = med === 'finasteride' || med === 'minoxidil';
        if (isDinnerMed) {
          const wasTakingAny = prevMeds.finasteride || prevMeds.minoxidil;
          const isTakingAny = nextMeds.finasteride || nextMeds.minoxidil;
          if (!wasTakingAny && isTakingAny) deltaCombo = -1;
          else if (wasTakingAny && !isTakingAny) deltaCombo = 1;
        }

        if (deltaRoaccutan === 0 && deltaCombo === 0 && med !== 'roacuttan' && !isDinnerMed) return;
        
        const { data: invRow } = await supabase.from('app_inventory').select('data').eq('key', 'meds_stock').maybeSingle();
        const base = { ...MEDS_STOCK_DEFAULT, ...(invRow?.data || {}) };
        const nowIso = new Date().toISOString();
        const nextVal = !!nextMeds[med];
        
        const nextPayload = {
          ...base,
          roaccutan: Math.max(0, pn(base.roaccutan) + deltaRoaccutan),
          minoxidil_finasteride: Math.max(0, pn(base.minoxidil_finasteride) + deltaCombo),
          _updatedAt: nowIso,
          last_taken_at: nextVal ? nowIso : base.last_taken_at,
          last_roaccutan_at: (med === 'roacuttan' && nextVal) ? nowIso : base.last_roaccutan_at,
          last_dinner_meds_at: (isDinnerMed && nextVal) ? nowIso : base.last_dinner_meds_at,
          last_dinner_logical_date: (isDinnerMed && nextVal) ? targetDateKey : base.last_dinner_logical_date
        };

        localStorage.setItem(MEDS_STOCK_KEY, JSON.stringify(nextPayload));
        window.dispatchEvent(new CustomEvent('enzo-health-changed', { detail: nextPayload }));
        await supabase.from('app_inventory').upsert({ key: 'meds_stock', data: nextPayload, updated_at: nowIso }, { onConflict: 'key' });
      } catch(e) { console.warn('[MEDS_SYNC]', e); }
    };

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


    const syncTodayMedsFromHealth = async (partial, dateKey) => {
      const { weekKey, dayIdx } = getWeekAndDayFromDateKey(dateKey);
      let dayToSave = null;
      setAllWeeks(prev => {
        const wk = prev[weekKey] || newWeek(weekKey);
        const day = wk.tracker[dayIdx] || newDay();
        dayToSave = { ...day, meds: { ...(day.meds || {}), ...partial }, _updatedAt: new Date().toISOString(), _dirty: true };
        return { ...prev, [weekKey]: { ...wk, tracker: { ...wk.tracker, [dayIdx]: dayToSave } } };
      });
      if (dayToSave) {
        lsDaySave(dateKey, dayToSave);
        await saveDayRemote(supabase, dateKey, dayToSave, session, dayToSave._revision).catch(() => {});
      }
    };

    const updateMed = async (field, value) => {
      const now = new Date();
      const selectedDate = getDayDate(currentWk, parseInt(activeDay, 10));
      const todayDate = localDateKey(now);
      const dinnerLogicalDate = getDinnerLogicalDateKey(now);
      const isDinnerMed = field === 'finasteride' || field === 'minoxidil';
      
      const targetDateKey = (isDinnerMed && selectedDate === todayDate && dinnerLogicalDate !== todayDate)
        ? dinnerLogicalDate
        : selectedDate;
        
      const { weekKey, dayIdx } = getWeekAndDayFromDateKey(targetDateKey);

      let prevMeds = {};
      let nextMeds = {};
      let dayToSave = null;

      setAllWeeks(prev => {
        const wk = prev[weekKey] || newWeek(weekKey);
        const day = wk.tracker[dayIdx] || newDay();
        prevMeds = day.meds || {};
        nextMeds = { ...prevMeds, [field]: value };
        
        dayToSave = {
          ...day,
          meds: nextMeds,
          _updatedAt: new Date().toISOString(),
          _dirty: true
        };
        return { 
          ...prev, 
          [weekKey]: { ...wk, tracker: { ...wk.tracker, [dayIdx]: dayToSave } } 
        };
      });

      if (dayToSave) {
        lsDaySave(targetDateKey, dayToSave);
        saveDayRemote(supabase, targetDateKey, dayToSave, session, dayToSave._revision).catch(() => {});
        syncMedsInventoryFromToggle(field, prevMeds, nextMeds, targetDateKey);
      }
    };

    const updateHabit = (field, value) => upd(w => {
      const day = w.tracker[activeDay] || newDay();
      return {
        ...w,
        tracker: { ...w.tracker, [activeDay]: { ...day, [field]: value } }
      };
    });

    const updateYesterdayFastDuration = () => {
      const pSnapshot = getRelativeDaySnapshot(allWeeks, currentWk, activeDay, -1);
      if(!pSnapshot || !pSnapshot.tracker || !pSnapshot.tracker.fastStartTime) return;
      
      const [sH, sM] = pSnapshot.tracker.fastStartTime.split(':').map(Number);
      if(isNaN(sH)) return;
      
      const yesterdayDate = new Date(pSnapshot.dateKey + 'T12:00:00');
      yesterdayDate.setHours(sH, sM, 0, 0);
      
      const now = new Date();
      if(now < yesterdayDate) return;
      
      const diffMs = now.getTime() - yesterdayDate.getTime();
      const diffHours = (diffMs / 3600000).toFixed(1).replace('.', ',');
      
      const { weekKey, dayIdx } = getWeekAndDayFromDateKey(pSnapshot.dateKey);
      
      let dayToSave = null;
      setAllWeeks(prev => {
        const wk = prev[weekKey] || newWeek(weekKey);
        const day = wk.tracker[dayIdx] || newDay();
        dayToSave = { ...day, fastHours: diffHours, _updatedAt: new Date().toISOString(), _dirty: true };
        return { ...prev, [weekKey]: { ...wk, tracker: { ...wk.tracker, [dayIdx]: dayToSave } } };
      });
      
      if (dayToSave) {
        lsDaySave(pSnapshot.dateKey, dayToSave);
        saveDayRemote(supabase, pSnapshot.dateKey, dayToSave, session, dayToSave._revision).catch(() => {});
      }
    };
    const updateMeal = (mealIdx, field, value) => upd(w => {
      const day = w.tracker[activeDay] || newDay();
      const meals = [...(day.meals || newDay().meals)];
      meals[mealIdx] = { ...(meals[mealIdx] || newDay().meals[0]), [field]: value };
      return {
        ...w,
        tracker: { ...w.tracker, [activeDay]: { ...day, meals } }
      };
    });

    const addMealItem = (mealIdx, item) => upd(w => {
      const day = w.tracker[activeDay] || newDay();
      const meals = [...(day.meals || [])];
      meals[mealIdx] = { ...meals[mealIdx], items: [...(meals[mealIdx]?.items || []), item] };
      return { ...w, tracker: { ...w.tracker, [activeDay]: { ...day, meals } } };
    });

    const removeMealItem = (mealIdx, itemIdx, removedItem) => {
      upd(w => {
        const day = w.tracker[activeDay] || newDay();
        const meals = [...(day.meals || [])];
        const nextItems = (meals[mealIdx]?.items || []).filter((_, i) => i !== itemIdx);
        meals[mealIdx] = { ...meals[mealIdx], items: nextItems };
        return { ...w, tracker: { ...w.tracker, [activeDay]: { ...day, meals } } };
      });
      if(removedItem) restoreRemovedItemStock(removedItem);
    };

    const replaceMealItem = (mealIdx, itemIdx, item, prevItem) => {
      upd(w => {
        const day = w.tracker[activeDay] || newDay();
        const meals = [...(day.meals || [])];
        const items = [...(meals[mealIdx]?.items || [])];
        items[itemIdx] = item;
        meals[mealIdx] = { ...meals[mealIdx], items };
        return { ...w, tracker: { ...w.tracker, [activeDay]: { ...day, meals } } };
      });
      if(prevItem) restoreRemovedItemStock(prevItem);
    };

    const handleSetComplete = (ei, si, restSecs) => {
      const wd = allWeeks[currentWk] || newWeek(currentWk);
      const session = wd.sessions?.[activeDay] || [];
      const was = session[ei]?.sets?.[si]?.completed;

      upd(w => {
        const s = [...(w.sessions[activeDay] || [])];
        if(!s[ei]) return w;
        const sets = [...s[ei].sets];
        sets[si] = { ...sets[si], completed: !was };
        s[ei] = { ...s[ei], sets };
        // Force tracker modification to ensure robust saving
        const td = w.tracker[activeDay] || newDay();
        return { ...w, tracker: { ...w.tracker, [activeDay]: { ...td, _updatedAt: new Date().toISOString() } }, sessions: { ...w.sessions, [activeDay]: s } };
      });

      if (!was && restSecs > 0) {
        setTimerLeft(restSecs); 
        setTimerActive(true); 
        localStorage.setItem('enzo_timer_end', (Date.now() + restSecs * 1000).toString());
      }
    };

    const handleSaveSession = async () => {
      const wkData = allWeeks[currentWk];
      if(!wkData) return;
      
      // 1. Update local state to mark as dirty and trigger haptics
      upd(w => {
        const td = w.tracker[activeDay] || newDay();
        return { ...w, tracker: { ...w.tracker, [activeDay]: { ...td, _updatedAt: new Date().toISOString(), _dirty: true } } };
      });
      window.haptic?.('success');

      // 2. Explicitly trigger remote sync for immediate feedback
      const dKey = getDayDate(currentWk, parseInt(activeDay));
      try {
        setSyncStatus('syncing');
        await saveDayRemote(supabase, dKey, wkData.tracker?.[activeDay], wkData.sessions?.[activeDay], wkData.tracker?.[activeDay]?._revision||null);
        setSyncStatus('synced');
      } catch(e) {
        console.error('[App] Save Session Error:', e);
        setSyncStatus('conflict');
      }
    };


    const handleSetInput = (ei, si, field, val) => upd(w => {
      const s = [...(w.sessions[activeDay] || [])];
      if(!s[ei]) return w;
      const sets = [...s[ei].sets];
      sets[si] = { ...sets[si], [field]: val };
      s[ei] = { ...s[ei], sets };
      const td = w.tracker[activeDay] || newDay();
      return { ...w, tracker: { ...w.tracker, [activeDay]: { ...td, _updatedAt: new Date().toISOString() } }, sessions: { ...w.sessions, [activeDay]: s } };
    });

    const handleCompleteSession = () => upd(w => {
      const s = [...(w.sessions[activeDay] || [])].map(ex => ({ ...ex, sets: ex.sets.map(st => ({ ...st, completed: true })) }));
      const td = w.tracker[activeDay] || newDay();
      const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
      return { ...w, tracker: { ...w.tracker, [activeDay]: { ...td, gymEndTime: td.gymEndTime || nowTime } }, sessions: { ...w.sessions, [activeDay]: s } };
    });

    const handleResetSessionChecks = () => upd(w => {
      const s = [...(w.sessions[activeDay] || [])].map(ex => ({ ...ex, sets: ex.sets.map(st => ({ ...st, completed: false })) }));
      const td = w.tracker[activeDay] || newDay();
      return { ...w, tracker: { ...w.tracker, [activeDay]: { ...td, _updatedAt: new Date().toISOString() } }, sessions: { ...w.sessions, [activeDay]: s } };
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

      const checkOutbox = async () => {
        if(!window.idb) return;
        try {
          const db = await deps.openOutboxDB();
          if(!db) return;
          const items = await db.getAll('outbox');
          const hasConflict = items.some(i => i.status === 'conflict');
          const isSyncing = items.some(i => !i.status || i.status === 'queued');
          if(hasConflict) setSyncStatus('conflict');
          else if(isSyncing) setSyncStatus('syncing');
          else if(!navigator.onLine) setSyncStatus('offline');
          else setSyncStatus('synced');
          setOutboxCount(items.length);
        } catch(_) {}
      };
      
      const interval = setInterval(checkOutbox, 3000);
      checkOutbox();
      const onOutboxChange = () => checkOutbox();
      window.addEventListener('enzo-outbox-changed', onOutboxChange);

      supabase.auth.getSession().then(async ({ data: { session: s } }) => {
        if(!s || s.user.email === 'guest@enzo.training') return;
        try {
          const bData = await bootstrapRemoteState(supabase, getWeekKey, addWeeks);
          const { weeklyCache: wc2, dailyCache: dc2, routinesCache: rc2 } = applyBootstrapToState(bData, weeklyCache, dailyCache);
          setAllWeeks(prev => ({ ...prev, ...buildAllWeeks(wc2, dc2, hydrate) }));
          bootstrapAppliedRef.current = true;
          if(Object.keys(rc2).length > 0) setRoutineData(prev => ({ ...prev, ...rc2 }));
          setSyncLog(prev => ({ ...prev, lastSync: new Date().toLocaleTimeString('es-AR') }));
        } catch(e) { console.warn('[App] Bootstrap Error:', e); setSyncLog(prev => ({ ...prev, lastError: e.message?.slice(0,60) })); }
      });
      return () => {
        clearInterval(interval);
        window.removeEventListener('enzo-outbox-changed', onOutboxChange);
      };
    }, []);

    useEffect(() => {
      if(Object.keys(allWeeks).length === 0) return;
      
      const wkData = allWeeks[currentWk];
      if(!wkData) return;

      if(bootstrapAppliedRef.current) {
        bootstrapAppliedRef.current = false;
        prevWeeklyRef.current = JSON.stringify({ bw: wkData.bodyWeight, dm: wkData.dayMapping });
        prevTrackerRef.current = JSON.stringify(wkData.tracker?.[activeDayRef.current]);
        return;
      }

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
    }, [allWeeks[currentWk]]);

    useEffect(() => {
      if(Object.keys(allWeeks).length === 0) return;
      const t = setTimeout(() => {
        Object.entries(allWeeks).forEach(([wkKey, wkData]) => {
          if(!isDateKey(wkKey)) return;
          lsWeekSave(wkKey, { dayMapping: wkData.dayMapping, bodyWeight: wkData.bodyWeight||'', _revision: wkData._revision, _updatedAt: wkData._updatedAt });
          Object.entries(wkData.tracker||{}).forEach(([dayIdx, dayData]) => {
            lsDaySave(getDayDate(wkKey, parseInt(dayIdx)), { ...dayData, _session: wkData.sessions?.[dayIdx] || null });
          });
        });
      }, 500);
      return () => clearTimeout(t);
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

    const cloneMealFromPreviousDay = async () => {
      const { dateKey: prevDateKey, tracker: prevTracker } = getRelativeDaySnapshot(allWeeks, currentWk, activeDay, -1);
      if(!prevTracker || !prevTracker.meals || prevTracker.meals.length === 0) {
        alert('No hay comidas para copiar del día anterior.');
        return;
      }
      if(!confirm('¿Copiar todas las comidas del día anterior?')) return;
      
      upd(w => {
        const t = w.tracker[activeDay] || newDay();
        return {
          ...w,
          tracker: {
            ...w.tracker,
            [activeDay]: {
              ...t,
              meals: JSON.parse(JSON.stringify(prevTracker.meals)).map(m => ({ ...m, lastBite: '' })),
              _dirty: true
            }
          }
        };
      });
    };

    const navWeek = async (dir) => {
      const nextWeek = addWeeks(currentWk, dir);
      if (isBeforeStart(nextWeek)) return;
      setCurrentWk(nextWeek);
      if(!allWeeks[nextWeek]) {
        // Fallback placeholder
        setAllWeeks(prev => ({ ...prev, [nextWeek]: newWeek(nextWeek) }));
        // Try fetch specifically this week if not in memory
        try {
          const { data, error } = await supabase.rpc('get_bootstrap_state', { p_from: nextWeek });
          if(!error && data) {
            const { weeklyCache: wc, dailyCache: dc } = applyBootstrapToState(data, {}, {});
            setAllWeeks(prev => ({ ...prev, ...buildAllWeeks(wc, dc, hydrate) }));
          }
        } catch(_) {}
      }
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

    const previousSnapshot = getRelativeDaySnapshot(allWeeks, currentWk, activeDay, -1);
    const yesterdayFastMsg = getYesterdayFast(allWeeks, currentWk, activeDay);
    const navBadges = { study: moduleAlerts.study > 0 ? (moduleAlerts.study > 9 ? '9+' : String(moduleAlerts.study)) : '', health: moduleAlerts.health ? '!' : '', books: moduleAlerts.books ? '•' : '', recipes: moduleAlerts.recipes > 0 ? (moduleAlerts.recipes > 9 ? '9+' : String(moduleAlerts.recipes)) : '', notif: moduleAlerts.notif ? '!' : '' };

    return html`
      <div style="min-height:100vh;background:#080D1A;display:flex;flex-direction:column;font-family:'Barlow',sans-serif;">
        <header style="position:sticky;top:0;z-index:20;background:rgba(8,13,26,0.97);backdrop-filter:blur(20px);border-bottom:1px solid #1E2D45;padding-top:env(safe-area-inset-top, 0);">
          <div style="max-width:640px;margin:0 auto;padding:16px 16px 8px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:linear-gradient(135deg,#10B981,#6366F1);border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(16,185,129,0.3);">
                  <${IDumb} s=${24} c="#080D1A"/>
                </div>
                <h1 style="margin:0;font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:900;letter-spacing:0.1em;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,0.3);">ENZO <span style="color:#10B981;">TRAINING</span></h1>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <${SyncStatusIndicator} status=${syncStatus} count=${outboxCount} onClick=${() => deps.flushOutbox(supabase, stripRoutineMeta)} />
                <button onClick=${() => navigateTo('notif')} class="btn-icon" style="background:transparent;border-color:transparent;color:#64748b;">
                  <${IBell} s=${18} />
                </button>
              </div>
            </div>

            ${syncStatus === 'conflict' && html`<${ConflictNotifier} onResolve=${() => deps.flushOutbox(supabase, stripRoutineMeta)} />`}

            ${view === 'today' && html`
              <div style="display:flex;flex-direction:column;gap:8px;">
                <!-- Semana y Split Control -->
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                  <div style="display:flex;align-items:center;background:rgba(22,32,53,0.4);border:1px solid #1E2D45;border-radius:12px;padding:2px 6px;">
                    <button class="btn-icon" style="width:28px;height:28px;background:transparent;border:none;opacity:${isAtStart ? 0.2 : 1}" onClick=${()=>navWeek(-1)}>
                      <${IChevL} s=${14} c="#94A3B8"/>
                    </button>
                    <span style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;color:white;min-width:100px;text-align:center;letter-spacing:0.04em;text-transform:uppercase;">${formatWeekLabel(currentWk)}</span>
                    <button class="btn-icon" style="width:28px;height:28px;background:transparent;border:none;opacity:${isCurrentWeekLocal(currentWk) ? 0.2 : 1}" onClick=${()=>navWeek(1)}>
                      <${IChevR} s=${14} c="#94A3B8"/>
                    </button>
                  </div>
                  <select class="inp" style="width:auto;min-width:100px;font-size:11px;padding:4px 8px;height:28px;background:#162035;border-color:#1E2D45;" value=${planMode} onChange=${e=>handlePlanModeChange(e.target.value)}>
                    <option value="4">Split 4 Días</option>
                    <option value="5">Split 5 Días</option>
                  </select>
                </div>

                <!-- Tabs de Días -->
                <div style="display:flex;gap:6px;padding-bottom:2px;" class="hide-scroll">
                  ${DAYS.map(day => {
                    const active = activeDay === day.key;
                    const dateKey = getDayDate(currentWk, parseInt(day.key, 10));
                    const numDay = dateKey.split('-')[2];
                    const closed = isGymClosedDate(dateKey, HOLIDAYS_2026);
                    const hasRoutine = routineAssignments[day.key] !== '';
                    
                    const borderColor = active 
                      ? (closed ? '#EF4444' : '#10B981') 
                      : (closed ? 'rgba(239,68,68,0.2)' : '#1E2D45');
                    
                    const bg = active 
                      ? (closed ? 'rgba(239,68,68,0.25)' : 'linear-gradient(180deg, #10B981 0%, #059669 100%)') 
                      : (closed ? 'transparent' : 'rgba(22,32,53,0.3)');

                    return html`
                      <button onClick=${() => { setActiveDay(day.key); setView('today'); }}
                        style=${`flex:1;min-width:44px;padding:8px 2px;border-radius:12px;border:1px solid ${borderColor};background:${bg};cursor:pointer;position:relative;display:flex;flex-direction:column;align-items:center;transition:all 0.2s;box-shadow:${active ? '0 4px 12px rgba(16,185,129,0.2)' : 'none'};`}>
                        <span style=${`font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:800;color:${active ? 'rgba(255,255,255,0.8)' : closed ? '#FCA5A5' : '#64748b'};text-transform:uppercase;letter-spacing:0.05em;`}>${day.abbr}</span>
                        <span style=${`font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:${active ? 'white' : closed ? '#EF4444' : '#cbd5e1'};margin-top:-2px;`}>${numDay}</span>
                        ${hasRoutine && html`
                          <div style=${`width:4px;height:4px;border-radius:50%;background:${active ? 'white' : '#6366F1'};margin-top:2px;`}></div>
                        `}
                      </button>
                    `;
                  })}
                </div>
              </div>
            `}
          </div>
        </header>

        <main key=${view} class="fade-up" style="max-width:640px;margin:0 auto;padding:10px 16px calc(88px + env(safe-area-inset-bottom, 12px));width:100%;">
          ${view === 'today' && html`
            <div style="display:flex;flex-direction:column;gap:10px;">
              <!-- 1. Split Name & Selector -->
              <div class="glass-card" style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;background:rgba(10,15,30,0.4);">
                <div style="flex:1;">
                  <h2 style="margin:0;font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:white;">
                    ${routineInfo?.fullName || `DÍA ${activeDay}: Descanso`}
                  </h2>
                  ${routineInfo?.description && html`<p style="margin:2px 0 0;font-size:12px;color:#6366F1;">${routineInfo.description}</p>`}
                </div>
                <select class="inp" style="width:auto;min-width:110px;font-size:11px;padding:6px 10px;background:#162035;border-color:#1E2D45;" value=${routineId || ''} onChange=${e=>handleRoutineChange(e.target.value)}>
                  <option value="">Descanso</option>
                  ${selectableRoutines.map(r => html`<option value=${r.id}>${r.name}</option>`)}
                </select>
              </div>

              <!-- 2. Today Dashboard (Compact) -->
              <${TodayDashboard} 
                session=${session} 
                tracker=${tracker} 
                selectedDateKey=${activeDateKey} 
                onOpenTasks=${() => navigateTo('tasks')} 
                onOpenStudy=${() => navigateTo('study')} 
                onOpenBooks=${() => navigateTo('books')} 
                onOpenHealth=${() => navigateTo('health')} 
                onOpenRecipes=${() => navigateTo('recipes')} 
                onOpenNotif=${() => navigateTo('notif')} 
                onCloneMeal=${cloneMealFromPreviousDay}
                chartsReady=${chartsReady}
                allWeeks=${allWeeks}
              />
              
              <!-- 3. HabitsPanel (Ayuno, Caminata, Comidas, Sueño) -->
              <${HabitsPanel} 
                tracker=${tracker} 
                selectedDateKey=${getDayDate(currentWk, parseInt(activeDay))} 
                yesterdayFastMsg=${yesterdayFastMsg} 
                onChange=${updateHabit} 
                onMed=${updateMed} 
                onMeal=${updateMeal} 
                onAddItem=${addMealItem} 
                onRemoveItem=${removeMealItem} 
                onReplaceItem=${replaceMealItem}
                onUpdateYesterdayFast=${updateYesterdayFastDuration}
                dinnerMeds=${(activeDateKey === localDateKey(new Date()) && getDinnerLogicalDateKey(new Date()) !== activeDateKey) ? previousSnapshot.tracker?.meds : tracker.meds}
              />
              
              <!-- 4. Macros Restantes -->
              <div class="glass-card" style="padding:10px 12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
                ${[
                  {label:'Prot restante', val:Math.max(0,Math.round(TARGETS.prot - dayTotals(tracker.meals||[]).prot))+'g', color:'#10B981'},
                  {label:'Carbos disp.',  val:Math.max(0,Math.round((TARGETS.kcal - TARGETS.prot*4 - dayTotals(tracker.meals||[]).fat*9)/4 - dayTotals(tracker.meals||[]).carb))+'g', color:'#6366F1'},
                  {label:'Kcal objetivo', val:fn(TARGETS.kcal), color:'#F59E0B'},
                ].map(({label,val,color})=>html`
                  <div>
                    <p style="margin:0;font-size:9px;text-transform:uppercase;color:#64748b;">${label}</p>
                    <p style="margin:0;font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:white;">${val}</p>
                  </div>
                `)}
              </div>
              
              <!-- 5. Hydration -->
              <${WaterTracker}
                val=${tracker.water || 0}
                onChange=${v => updateHabit('water', v)}
                roacuttan=${tracker.meds?.roacuttan || false}
              />
              
              <!-- 6. Micros y Sugerencias -->
              <${NutritionReviewCard}
                currentDateKey=${activeDateKey}
                currentTracker=${tracker}
                previousDateKey=${previousSnapshot.dateKey}
                previousTracker=${previousSnapshot.tracker}
              />

              <!-- 7. IA Assistant -->
              <${SmartCena}
                currentProt=${dayTotals(tracker.meals || []).prot}
                tracker=${tracker}
              />

              <!-- 8. Gym Routine (Al final como tracker dedicado) -->
              <${GymPanel} 
                session=${effectiveGymSession} 
                tracker=${tracker} 
                onSetComplete=${handleSetComplete} 
                onInput=${handleSetInput} 
                onHabit=${(f,v) => updateHabit(f,v)} 
                onApplyOverload=${handleApplyOverload} 
                onCompleteSession=${handleCompleteSession} 
                onResetSessionChecks=${handleResetSessionChecks} 
                onSaveSession=${handleSaveSession}
                allWeeks=${allWeeks}
              />
            </div>
          `}

          <${ViewErrorBoundary} key=${view}>
            ${view === 'tasks'    && (loadedViews.tasks ? html`<${loadedViews.tasks} session=${session} />` : html`<div style="color:#64748b;text-align:center;padding:40px;">Cargando Tareas...</div>`)}
            ${view === 'week'     && ((loadedViews.progress || loadedViews.week) ? html`<${(loadedViews.progress || loadedViews.week).WeekSummary} weekData=${allWeeks[currentWk]} weekKey=${currentWk} />` : html`<div style="color:#64748b;text-align:center;padding:40px;">Cargando Semana...</div>`)}
            ${view === 'progress' && (loadedViews.progress ? html`<${loadedViews.progress.ProgressView} session=${session} allWeeks=${allWeeks} chartsReady=${chartsReady} />` : html`<div style="color:#64748b;text-align:center;padding:40px;">Cargando Progreso...</div>`)}
            ${view === 'recipes'  && (loadedViews.recipes ? html`<${loadedViews.recipes} session=${session} onRecipeUpdated=${recalculateMealsUsingRecipe} />` : html`<div style="color:#64748b;text-align:center;padding:40px;">Cargando Recetas...</div>`)}
            ${view === 'study'    && (loadedViews.study ? html`<${loadedViews.study} session=${session} onSyncStudyAlerts=${refreshModuleAlerts} />` : html`<div style="color:#64748b;text-align:center;padding:40px;">Cargando Estudio...</div>`)}
            ${view === 'health'   && (loadedViews.health ? html`<${loadedViews.health} 
              session=${session} 
              todayMeds=${tracker.meds||{}} 
              previousDayMeds=${previousSnapshot.tracker?.meds || {}} 
              weekTracker=${wd.tracker||{}} 
              healthWeekKey=${currentWk} 
              bodyWeight=${wd.bodyWeight||''} 
              onBodyWeight=${v => upd(w => ({...w, bodyWeight: v}))} 
              onSyncDailyMeds=${syncTodayMedsFromHealth} 
              onOpenDay=${d => { const { dayIdx } = getWeekAndDayFromDateKey(d); setActiveDay(dayIdx); setView('today'); }} 
            />` : html`<div style="color:#64748b;text-align:center;padding:40px;">Cargando Salud...</div>`)}
            ${view === 'books' && (loadedViews.books ? html`<${loadedViews.books} session=${session} READING_PROGRESS_KEY=${READING_PROGRESS_KEY} />` : html`<div style="color:#64748b;text-align:center;padding:40px;">Cargando Libros...</div>`)}
            ${view === 'notif'    && (loadedViews.notif ? html`<${loadedViews.notif} session=${session} />` : html`<div style="color:#64748b;text-align:center;padding:40px;">Cargando Notificaciones...</div>`)}
          <//>
        </main>

        <nav class="bottom-nav" style="position:fixed;bottom:0;left:0;right:0;z-index:30;background:rgba(8,13,26,0.98);backdrop-filter:blur(20px);border-top:1px solid #1E2D45;padding-bottom:env(safe-area-inset-bottom, 0);">
          <div style="max-width:640px;margin:0 auto;display:flex;">
            ${[
              {id:'today',    label:'HOY',     icon:html`<${IHome} s=${18}/>`},
              {id:'week',     label:'SEMANA',  icon:html`<${ICal}  s=${18}/>`},
              {id:'progress', label:'PROGRESO',icon:html`<${IBar}  s=${18}/>`},
              {id:'tasks',    label:'TAREAS',  icon:html`<${IList} s=${18}/>`},
              {id:'study',    label:'ESTUDIO', icon:html`<${ITarget} s=${18}/>`},
              {id:'health',   label:'SALUD',   icon:html`<${IBell} s=${18}/>`},
              {id:'books',    label:'LIBROS',  icon:html`<${IBook} s=${18}/>`},
              {id:'recipes',  label:'RECETAS', icon:html`<${IActivity} s=${18}/>`},
              {id:'notif',    label:'ALERTAS', icon:html`<${IClock} s=${18}/>`}
            ].map(tab => {
              const active = view === tab.id;
              return html`
                <button onClick=${() => navigateTo(tab.id)} style=${`flex:1;padding:12px 2px;border:none;background:transparent;color:${active ? '#10B981' : '#374151'};cursor:pointer;display:flex;flex-direction:column;align-items:center;position:relative;`}>
                  ${navBadges[tab.id] && html`
                    <span style=${`position:absolute;top:5px;right:5px;width:12px;height:12px;border-radius:50%;background:${tab.id==='health'?'#EF4444':'#F59E0B'};color:#fff;font-size:7px;font-weight:800;display:flex;align-items:center;justify-content:center;`}>
                      ${navBadges[tab.id]}
                    </span>
                  `}
                  ${tab.icon}
                  <span style="font-size:9px;margin-top:5px;font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:0.08em;color:inherit;">${tab.id === 'progress' ? 'PROGRESO' : tab.label}</span>
                  ${active && html`<div class="nav-indicator"></div>`}
                </button>
              `;
            })}
          </div>
        </nav>

        ${(timerActive || timerLeft > 0) && html`<${FloatingTimer} left=${timerLeft} active=${timerActive} onToggle=${() => setTimerActive(a => !a)} onReset=${() => { setTimerLeft(0); setTimerActive(false); }} />`}
      </div>
    `;
  };
};
