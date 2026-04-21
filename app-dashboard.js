export const createTodayDashboard = ({
  html,
  useState,
  useEffect,
  useMemo,
  useCallback,
  supabase,
  BOOK_DEFAULT,
  MEDS_STOCK_DEFAULT,
  pn,
  metaGet,
  safeLocalSet,
  fetchJsonWithTimeout,
  getMedicationStatusForView,
  computeNextRecurringDueAt,
  normalizeSubtasks,
  formatTaskDate,
  DashboardStatCard,
  DashboardActionCard,
  DashboardTagChip,
  FastingProgressBar,
  getWeekKey,
  localDateKey,
  lsDayLoad,
  TARGETS,
  mealTotals,
  dayTotals
}) => {
  return function TodayDashboard({
    session,
    tracker = {},
    selectedDateKey,
    onOpenTasks,
    onOpenStudy,
    onOpenBooks,
    onOpenHealth,
    onOpenRecipes,
    onOpenNotif,
    onCloneMeal,
    chartsReady,
    allWeeks
  }) {
    const [summary, setSummary] = useState({
      pending:0, dueToday:0, notes:0, high:0, nextTask:null,
      studyPending:0, studyDone:0, studySubjects:0,
      book:null, bookPct:0,
      meds:null, medsLow:false,
      pantryLow:0,
      backupDue:false,
      backupLabel:''
    });
    const [loading, setLoading] = useState(true);
    const [fastingProgress, setFastingProgress] = useState(null);
    const [comparison, setComparison] = useState(null);
    const [weather, setWeather] = useState({ loading:true, data:null, error:'' });

    const weatherGymAdvice = useMemo(() => {
      const w = weather.data;
      if(!w) return { label:'Sin recomendacion de tiempo', color:'#94A3B8', detail:'' };
      const severe = w.zonda || w.hail_risk || w.lightning_risk || w.storm_risk_today === 'alto' || (Number(w.wind_gusts) || 0) >= 60;
      const caution = !severe && (w.storm_risk_today === 'medio' || (Number(w.rain_probability) || 0) >= 55 || (Number(w.wind_gusts) || 0) >= 40);
      if(severe) {
        return {
          label:'Hoy mejor evaluar antes de ir al gym',
          color:'#FCA5A5',
          detail:'Tiempo inestable o con alerta fuerte. Si salis, revisa condiciones al momento.'
        };
      }
      if(caution) {
        return {
          label:'Gym con cautela',
          color:'#FBBF24',
          detail:'Hay inestabilidad o viento marcado. Conviene chequear el tiempo antes de salir.'
        };
      }
      return {
        label:'Tiempo favorable para salir',
        color:'#86EFAC',
        detail:'No se ve un riesgo fuerte en las próximas horas.'
      };
    }, [weather.data]);

    const loadSummary = useCallback(async () => {
      setLoading(true);
      try {
        // Calc Fasting
        try {
          const now = new Date();
          const prevDt = new Date(now); prevDt.setDate(prevDt.getDate() - 1);
          const prevTracker = lsDayLoad(localDateKey(prevDt)); 
          if(prevTracker?.fasted && prevTracker.fastStartTime && prevTracker.fastHours) {
            const [sH, sM] = prevTracker.fastStartTime.split(':').map(Number);
            const dur = pn(prevTracker.fastHours);
            if(!isNaN(sH) && dur > 0) {
              const startDateTime = new Date(prevDt);
              startDateTime.setHours(sH, sM, 0, 0);
              const endDateTime = new Date(startDateTime.getTime() + (dur * 3600000));
              if(endDateTime > now) {
                const current = (now - startDateTime) / 3600000;
                const finH = String(endDateTime.getHours()).padStart(2,'0');
                const finM = String(endDateTime.getMinutes()).padStart(2,'0');
                setFastingProgress({ current, total: dur, startTime: prevTracker.fastStartTime, endTime: `${finH}:${finM}` });
              } else setFastingProgress(null);
            } else setFastingProgress(null);
          } else setFastingProgress(null);

          // Comparison Logic
          if(prevTracker) {
            const yesterdayTotals = mealTotals(prevTracker.meals || []);
            const todayTotals = mealTotals(tracker.meals || []);
            setComparison({
              kcal: { diff: todayTotals.cals - yesterdayTotals.cals, label: 'Kcal' },
              prot: { diff: todayTotals.prot - yesterdayTotals.prot, label: 'Prot' },
              water: { diff: (tracker.water || 0) - (prevTracker.water || 0), label: 'Agua' }
            });
          }
        } catch(_) { setFastingProgress(null); }

        const [
          { data: taskRows, error: taskErr },
          { data: noteRows, error: noteErr },
          { data: invRows, error: invErr },
          { data: studyRows, error: studyErr },
          { data: recipeRows, error: recipeErr }
        ] = await Promise.all([
          supabase.from('tasks')
            .select('id,title,due_at,priority,status,category,details,subtasks,recurrence,auto_email_reminder,email_reminder_sent_at')
            .eq('user_id', session.user.id)
            .order('due_at', { ascending: true, nullsFirst: false }),
          supabase.from('notes')
            .select('id,kind,content,created_at')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false }),
          supabase.from('app_inventory')
            .select('key,data')
            .in('key', ['meds_stock', 'reading_progress', 'sweets_sauces_stock']),
          supabase.from('study_plan')
            .select('subject,topics')
            .order('subject', { ascending: true }),
          supabase.from('user_recipes')
            .select('recipe_name,stock_qty,low_stock_threshold')
        ]);
        if(taskErr) throw taskErr;
        if(noteErr) throw noteErr;
        if(invErr) throw invErr;
        if(studyErr) throw studyErr;
        if(recipeErr) throw recipeErr;

        const tasks = taskRows || [];
        const notes = (noteRows || []).filter(n => n.kind !== 'converted');
        const inventory = Object.fromEntries((invRows || []).map(row => [row.key, row.data || {}]));
        
        // Fallbacks locales para robustez (especialmente modo bypass/dev)
        if (!inventory.meds_stock) {
          try {
            const localMeds = JSON.parse(localStorage.getItem('enzo_meds_stock_v3') || 'null');
            if (localMeds) inventory.meds_stock = localMeds;
          } catch(_) {}
        }
        if (!inventory.reading_progress) {
          try {
            const localBooks = JSON.parse(localStorage.getItem('enzo_reading_progress_v3') || 'null');
            if (localBooks) inventory.reading_progress = localBooks;
          } catch(_) {}
        }

        const study = studyRows || [];
        const recipes = recipeRows || [];
        const now = new Date();
        const endOfToday = new Date(now); endOfToday.setHours(23,59,59,999);
        const pending = tasks.filter(t => t.status !== 'done');
        const dueToday = pending.filter(t => t.due_at && new Date(t.due_at) <= endOfToday);
        const nextTask = pending
          .filter(t => t.due_at)
          .sort((a,b)=>new Date(a.due_at)-new Date(b.due_at))[0] || pending[0] || null;
        const meds = { ...MEDS_STOCK_DEFAULT, ...(inventory.meds_stock || {}) };
        const book = { ...BOOK_DEFAULT, ...(inventory.reading_progress || {}) };
        const bookPct = Math.max(0, Math.min(100, Math.round((pn(book.current_page) / Math.max(1, pn(book.total_pages))) * 100) || 0));
        const studyTopics = study.flatMap(row => Array.isArray(row.topics) ? row.topics : []);
        const studyPending = studyTopics.filter(topic => !topic?.done).length;
        const studyDone = studyTopics.filter(topic => !!topic?.done).length;
        const pantryLow = recipes.filter(row => {
          const qty = pn(row.stock_qty);
          const threshold = pn(row.low_stock_threshold);
          return qty > 0 && threshold > 0 && qty <= threshold;
        }).length;
        const lastBackupAt = metaGet('last_backup_at');
        const lastBackupMs = lastBackupAt ? new Date(lastBackupAt).getTime() : 0;
        const hoursSinceBackup = lastBackupMs ? Math.floor((Date.now() - lastBackupMs) / 3600000) : null;
        const backupDue = !lastBackupMs || hoursSinceBackup >= 72;
        const backupLabel = !lastBackupMs
          ? 'Nunca hiciste backup manual'
          : `Ultimo backup hace ${hoursSinceBackup}h`;

        setSummary({
          pending: pending.length,
          dueToday: dueToday.length,
          notes: notes.length,
          high: pending.filter(t => (t.priority || 'normal') === 'high').length,
          nextTask,
          studyPending,
          studyDone,
          studySubjects: study.length,
          book,
          bookPct,
          meds,
          medsLow: pn(meds.roaccutan) <= 2 || pn(meds.minoxidil_finasteride) <= 2,
          pantryLow,
          backupDue,
          backupLabel
        });
      } catch(_) {
        setSummary({
          pending:0, dueToday:0, notes:0, high:0, nextTask:null,
          studyPending:0, studyDone:0, studySubjects:0,
          book:null, bookPct:0,
          meds:null, medsLow:false,
          pantryLow:0,
          backupDue:false,
          backupLabel:''
        });
      } finally {
        setLoading(false);
      }
    }, [session.user.id]);

    const quickUpdateTask = useCallback(async (task, status) => {
      if(!task?.id) return;
      try {
        const basePatch = {
          status,
          email_reminder_sent_at: status === 'pending' ? null : task.email_reminder_sent_at || null,
          updated_at: new Date().toISOString()
        };
        const { error } = await supabase.from('tasks')
          .update(basePatch)
          .eq('id', task.id)
          .eq('user_id', session.user.id);
        if(error) throw error;

        if(status === 'done' && (task.recurrence || 'none') !== 'none'){
          const nextDueAt = computeNextRecurringDueAt(task);
          const { error: nextErr } = await supabase.from('tasks').insert({
            user_id: session.user.id,
            title: task.title,
            details: task.details || null,
            subtasks: normalizeSubtasks(task.subtasks || []),
            priority: task.priority || 'normal',
            category: task.category || 'personal',
            recurrence: task.recurrence || 'none',
            status: 'pending',
            auto_email_reminder: task.auto_email_reminder !== false,
            due_at: nextDueAt,
            email_reminder_sent_at: null
          });
          if(nextErr) throw nextErr;
        }
        loadSummary();
      } catch(_) {}
    }, [loadSummary, session.user.id]);

    useEffect(() => {
      loadSummary();
    }, [loadSummary, selectedDateKey]);

    useEffect(() => {
      const h = () => loadSummary();
      window.addEventListener('enzo-health-changed', h);
      return () => window.removeEventListener('enzo-health-changed', h);
    }, [loadSummary]);

    const loadWeather = useCallback(async () => {
      const cacheKey = 'enzo_weather_san_rafael';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if(isLocal) {
        setWeather({ loading:false, data:null, error:'Clima desactivado en local (Netlify functions requeridas)' });
        localStorage.removeItem(cacheKey);
        return;
      }

      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if(cached?.data && cached?.at && (Date.now() - cached.at) < 30 * 60 * 1000) {
          setWeather({ loading:false, data: cached.data, error:'' });
          return;
        }
      } catch(_) {}

      setWeather(prev => ({ ...prev, loading:true, error:'' }));
      try {
        const { res, data } = await fetchJsonWithTimeout('/.netlify/functions/weather-san-rafael');
        if(!res.ok) throw new Error(data?.error || 'No se pudo cargar el clima.');
        setWeather({ loading:false, data, error:'' });
        safeLocalSet(cacheKey, { at: Date.now(), data });
      } catch(e) {
        setWeather({ loading:false, data:null, error:e.message || 'No se pudo cargar el clima.' });
      }
    }, []);

    useEffect(() => {
      loadWeather();
    }, [loadWeather]);

    const medDashboardStatus = useMemo(() => {
      const v = getMedicationStatusForView({
        selectedDateKey,
        medsState: tracker?.meds || {},
        now: new Date()
      });
      if(!v.roaccutanDone) return { label: 'Roaccutan pendiente', detail: v.viewDateKey === v.calendarTodayKey ? 'Mediodía' : `Sin marcar en ${v.viewDateKey}` };
      if(v.dinnerRelevant) {
        return v.dinnerDone 
          ? { label: 'Tomas del día completas', detail: 'Registros realizados' }
          : { label: 'Meds de cena pendientes', detail: v.calendarTodayKey === v.dinnerLogicalKey ? 'Cena' : 'Cena para ayer' };
      }
      return { label: v.dinnerDone ? 'Cena registrada para ese día' : 'Cena no corresponde ahora', detail: `Vista de ${v.viewDateKey}` };
    }, [tracker, selectedDateKey]);

    const weightHistory = useMemo(() => {
      const history = [];
      const now = new Date();
      for(let i=14; i>=0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        const wk = getWeekKey(d);
        const w = allWeeks[wk];
        if(w?.bodyWeight) {
          history.push({ val: parseFloat(String(w.bodyWeight).replace(',','.')) || 0, date: localDateKey(d) });
        }
      }
      return history.filter(h => h.val > 0).slice(-7);
    }, [allWeeks]);

    const dailyInsight = useMemo(() => {
      if(loading) return null;
      const hours = new Date().getHours();
      const totals = tracker?.meals ? mealTotals(tracker.meals) : { cals:0, prot:0, carb:0, fat:0 };
      const water = tracker?.water || 0;
      
      if (hours < 11) {
        return {
          title: "Foco de la Mañana",
          text: water < 500 ? "Empezá con 500ml de agua para activar. ¿Ya tomaste el Roacutan?" : "Hidratación inicial OK. Si hoy toca gym, asegurate de tener la comida pre-entreno lista.",
          icon: "☀️", color: "#FCD34D"
        };
      }
      if (hours >= 11 && hours < 16) {
        return {
          title: "Estado Nutricional",
          text: totals.prot < 60 ? "Venís bajo en proteína. Priorizá una fuente sólida en el almuerzo." : "Proteína en buen camino. Mantené el ritmo de agua.",
          icon: "🥩", color: "#10B981"
        };
      }
      if (hours >= 16 && hours < 21) {
        return {
          title: "Cierre del Día",
          text: totals.cals > TARGETS.kcal * 0.8 ? "Casi llegás al objetivo calórico. La cena debería ser liviana y alta en micro-nutrientes." : "¿Falta entrenar? Si ya lo hiciste, asegurate de cargar los macros de la merienda.",
          icon: "🌙", color: "#6366F1"
        };
      }
      return {
        title: "Preparación Mañana",
        text: "Día casi terminado. Registrá el sueño y prepará la ropa del gym para mañana. ¡Gran trabajo!",
        icon: "✨", color: "#A5B4FC"
      };
    }, [loading, tracker, TARGETS]);

    return html`
      <div class="stagger-in" style="display:flex;flex-direction:column;gap:10px;padding-bottom:20px;">
        
        <!-- Header & Insight -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:16px;">
          <div style="display:flex;flex-direction:column;">
            <h2 style="margin:0;font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;letter-spacing:0.04em;color:white;text-transform:uppercase;">Resumen del Día</h2>
            <p style="margin:2px 0 0;font-size:12px;color:var(--text-dim);">${dailyInsight?.text || 'Todo al día. Gran trabajo.'}</p>
          </div>
          ${dailyInsight && html`
            <div style="font-size:28px;filter:drop-shadow(0 0 8px ${dailyInsight.color}66);">${dailyInsight.icon}</div>
          `}
        </div>

        <!-- KPI Grid -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          ${[
            { label:'Pend', val: summary.pending, color:'#10B981' },
            { label:'Hoy', val: summary.dueToday, color:'#EF4444' },
            { label:'Ideas', val: summary.notes, color:'#F59E0B' },
            { label:'Alta', val: summary.high, color:'#38BDF8' }
          ].map(item => html`
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 4px;text-align:center;">
              <p style="margin:0;font-size:18px;font-weight:800;color:${item.color};font-family:'Barlow Condensed',sans-serif;">${loading ? '-' : item.val}</p>
              <p style="margin:2px 0 0;font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;letter-spacing:0.05em;">${item.label}</p>
            </div>
          `)}
        </div>

        <!-- Foco y Tareas -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button onClick=${onOpenTasks} class="tap-effect" style="text-align:left;padding:12px;background:var(--surface);border:1px solid rgba(99,102,241,0.2);border-radius:14px;cursor:pointer;">
            <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;color:#A5B4FC;font-weight:800;letter-spacing:0.08em;font-family:'Barlow Condensed',sans-serif;">Siguiente Foco</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${loading ? '...' : (summary.nextTask?.title || 'Libre')}</p>
          </button>
          
          <button onClick=${onOpenHealth} class="tap-effect" style="text-align:left;padding:12px;background:var(--surface);border:1px solid rgba(16,185,129,0.2);border-radius:14px;cursor:pointer;">
            <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;color:#86EFAC;font-weight:800;letter-spacing:0.08em;font-family:'Barlow Condensed',sans-serif;">Estado Salud</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${loading ? '...' : medDashboardStatus.label}</p>
          </button>
        </div>

        <!-- Macros vs Ayer -->
        ${comparison && html`
          <div style="display:flex;gap:8px;">
            ${['prot', 'kcal', 'water'].map(k => {
              const item = comparison[k];
              const isPos = item.diff > 0;
              const color = k === 'prot' ? (isPos ? '#10B981' : '#FCA5A5') : 
                            k === 'kcal' ? (isPos ? '#FCA5A5' : '#10B981') : 
                            (isPos ? '#38BDF8' : '#94A3B8');
              return html`
                <div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px;text-align:center;">
                  <p style="margin:0;font-size:10px;color:var(--text-dim);text-transform:uppercase;font-weight:700;">${item.label}</p>
                  <p style="margin:2px 0 0;font-size:14px;font-weight:800;color:${color};font-family:'Barlow Condensed',sans-serif;">
                    ${isPos ? '+' : ''}${Math.round(item.diff)}${k==='water'?'ml':'g'}
                  </p>
                </div>
              `;
            })}
          </div>
        `}

        ${fastingProgress && html`<${FastingProgressBar} ...${fastingProgress} />`}

        <!-- Modulos Rapidos -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div onClick=${onOpenStudy} class="tap-effect" style="padding:10px 12px;background:var(--surface);border:1px solid rgba(245,158,11,0.2);border-radius:12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="margin:0;font-size:11px;color:#FCD34D;font-weight:800;text-transform:uppercase;">Estudio</p>
              <p style="margin:2px 0 0;font-size:12px;color:var(--text-main);">${loading ? '...' : `${summary.studyDone}/${summary.studySubjects} temas`}</p>
            </div>
            <span style="color:#FCD34D;font-size:16px;">📚</span>
          </div>

          <div onClick=${onOpenBooks} class="tap-effect" style="padding:10px 12px;background:var(--surface);border:1px solid rgba(56,189,248,0.2);border-radius:12px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
            <div style="overflow:hidden;">
              <p style="margin:0;font-size:11px;color:#7DD3FC;font-weight:800;text-transform:uppercase;">Lectura</p>
              <p style="margin:2px 0 0;font-size:12px;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${summary.book?.title || 'Sin libro'}</p>
            </div>
            <span style="color:#7DD3FC;font-size:16px;">📖</span>
          </div>
        </div>

        <!-- Weather & Backup -->
        <div style="display:flex;gap:8px;">
          <div style="flex:1;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:14px;">
            <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;color:var(--text-dim);font-weight:800;letter-spacing:0.1em;font-family:'Barlow Condensed',sans-serif;">San Rafael</p>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:20px;font-weight:800;color:white;font-family:'Barlow Condensed',sans-serif;">${weather.loading ? '...' : (weather.data?.temp_current || '--')}°</span>
              <span style="font-size:11px;color:var(--text-dim);">${weather.loading ? '' : weather.data ? `Máx ${weather.data.temp_next24_max}°` : ''}</span>
            </div>
            <p style="margin:4px 0 0;font-size:10px;color:${weatherGymAdvice.color};font-weight:700;">${weatherGymAdvice.label}</p>
          </div>
          
          ${summary.backupDue && html`
            <div onClick=${onOpenNotif} class="tap-effect" style="flex:1;padding:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:14px;cursor:pointer;display:flex;flex-direction:column;justify-content:center;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#FCD34D;font-weight:800;">Alerta Backup</p>
              <p style="margin:0;font-size:11px;color:var(--text-main);">${summary.backupLabel}</p>
            </div>
          `}
        </div>

        <!-- Trend Chart -->
        ${chartsReady && weightHistory.length > 1 && html`
          <div style="padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <p style="margin:0;font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Tendencia Peso</p>
              <p style="margin:0;font-size:12px;font-weight:700;color:#38BDF8;">${weightHistory[weightHistory.length-1].val} kg</p>
            </div>
            <div style="height:35px;width:100%;">
              <${window.Recharts.ResponsiveContainer}>
                <${window.Recharts.LineChart} data=${weightHistory}>
                  <${window.Recharts.Line} type="monotone" dataKey="val" stroke="#38BDF8" strokeWidth=${2} dot=${false} isAnimationActive=${false} />
                  <${window.Recharts.YAxis} domain=${['dataMin - 1', 'dataMax + 1']} hide />
                </</window.Recharts.LineChart}>
              </${window.Recharts.ResponsiveContainer}>
            </div>
          </div>
        `}

        <!-- Bottom Actions -->
        <div style="display:flex;gap:8px;">
          <button onClick=${onCloneMeal} class="tap-effect" style="flex:1;padding:10px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:12px;color:#86EFAC;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;cursor:pointer;">
            COPIAR COMIDAS
          </button>
          <button onClick=${onOpenTasks} class="tap-effect" style="flex:1;padding:10px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);border-radius:12px;color:#A5B4FC;font-size:12px;font-weight:800;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;cursor:pointer;">
            VER TAREAS
          </button>
        </div>

      </div>
    `;
  };
};
