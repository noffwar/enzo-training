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
        detail:'No se ve un riesgo fuerte en las pr├│ximas horas.'
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
      if(!v.roaccutanDone) return { label: 'Roaccutan pendiente', detail: v.viewDateKey === v.calendarTodayKey ? 'Mediod├¡a' : `Sin marcar en ${v.viewDateKey}` };
      if(v.dinnerRelevant) {
        return v.dinnerDone 
          ? { label: 'Tomas del d├¡a completas', detail: 'Registros realizados' }
          : { label: 'Meds de cena pendientes', detail: v.calendarTodayKey === v.dinnerLogicalKey ? 'Cena' : 'Cena para ayer' };
      }
      return { label: v.dinnerDone ? 'Cena registrada para ese d├¡a' : 'Cena no corresponde ahora', detail: `Vista de ${v.viewDateKey}` };
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
          title: "Foco de la Ma├▒ana",
          text: water < 500 ? "Empez├í con 500ml de agua para activar. ┬┐Ya tomaste el Roacutan?" : "Hidrataci├│n inicial OK. Si hoy toca gym, asegurate de tener la comida pre-entreno lista.",
          icon: "ÔÿÇ´©Å", color: "#FCD34D"
        };
      }
      if (hours >= 11 && hours < 16) {
        return {
          title: "Estado Nutricional",
          text: totals.prot < 60 ? "Ven├¡s bajo en prote├¡na. Prioriz├í una fuente s├│lida en el almuerzo." : "Prote├¡na en buen camino. Manten├® el ritmo de agua.",
          icon: "­ƒÑ®", color: "#10B981"
        };
      }
      if (hours >= 16 && hours < 21) {
        return {
          title: "Cierre del D├¡a",
          text: totals.cals > TARGETS.kcal * 0.8 ? "Casi lleg├ís al objetivo cal├│rico. La cena deber├¡a ser liviana y alta en micro-nutrientes." : "┬┐Falta entrenar? Si ya lo hiciste, asegurate de cargar los macros de la merienda.",
          icon: "­ƒîÖ", color: "#6366F1"
        };
      }
      return {
        title: "Preparaci├│n Ma├▒ana",
        text: "D├¡a casi terminado. Registr├í el sue├▒o y prepar├í la ropa del gym para ma├▒ana. ┬íGran trabajo!",
        icon: "Ô£¿", color: "#A5B4FC"
      };
    }, [loading, tracker, TARGETS]);

    return html`
      <div class="glass-card stagger-in" style="padding:12px 14px;display:flex;flex-direction:column;gap:10px;">
        ${dailyInsight && html`
          <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);display:flex;gap:12px;align-items:center;margin-bottom:4px;animation: glow-pulse 4s infinite;">
            <div style="font-size:24px;">${dailyInsight.icon}</div>
            <div style="flex:1;">
              <p style=${`margin:0;font-size:10px;font-weight:800;text-transform:uppercase;color:${dailyInsight.color};letter-spacing:0.05em;`}>${dailyInsight.title}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#cbd5e1;line-height:1.4;">${dailyInsight.text}</p>
            </div>
          </div>
          <style>
            @keyframes glow-pulse {
              0% { border-color: rgba(255,255,255,0.05); box-shadow: 0 0 0 rgba(255,255,255,0); }
              50% { border-color: ${dailyInsight.color}44; box-shadow: 0 0 10px ${dailyInsight.color}11; }
              100% { border-color: rgba(255,255,255,0.05); box-shadow: 0 0 0 rgba(255,255,255,0); }
            }
          </style>
        `}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div>
            <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6366F1;font-weight:700;">Tablero principal</p>
            <p style="margin:4px 0 0;font-size:12px;color:#94A3B8;">Lo importante del d├¡a, sin salir del Diario.</p>
          </div>
          <button onClick=${onOpenTasks}
            style="padding:8px 10px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
            VER TAREAS
          </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
          ${[
            { label:'Pend.', val: summary.pending, color:'#10B981' },
            { label:'Hoy', val: summary.dueToday, color:'#EF4444' },
            { label:'Ideas', val: summary.notes, color:'#F59E0B' },
            { label:'Alta', val: summary.high, color:'#38BDF8' }
          ].map(item => html`<${DashboardStatCard} label=${item.label} value=${loading ? '...' : item.val} color=${item.color} />`)}
        </div>

        ${fastingProgress && html`<${FastingProgressBar} ...${fastingProgress} />`}

        ${comparison && html`
          <div style="padding:12px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;gap:12px;">
            ${['prot', 'kcal', 'water'].map(k => {
              const item = comparison[k];
              const isPos = item.diff > 0;
              const color = k === 'prot' ? (isPos ? '#10B981' : '#FCA5A5') : 
                            k === 'kcal' ? (isPos ? '#FCA5A5' : '#10B981') : 
                            (isPos ? '#38BDF8' : '#94A3B8');
              return html`
                <div style="flex:1;text-align:center;">
                  <p style="margin:0;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">${item.label}</p>
                  <p style=${`margin:4px 0 0;font-size:13px;font-weight:700;color:${color};`}>
                    ${isPos ? '+' : ''}${Math.round(item.diff)}${k==='water'?'ml':'g'}
                  </p>
                  <p style="margin:2px 0 0;font-size:9px;color:#475569;">vs ayer</p>
                </div>
              `;
            })}
          </div>
        `}

        <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid #1E2D45;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Acciones r├ípidas</p>
            <p style="margin:4px 0 0;font-size:13px;color:#E2E8F0;font-weight:700;">Copiar comidas de ayer</p>
          </div>
          <button onClick=${onCloneMeal} style="padding:6px 12px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">COPIAR</button>
        </div>

        ${chartsReady && weightHistory.length > 1 && html`
          <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid #1E2D45;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Tendencia de peso</p>
              <p style="margin:0;font-size:13px;font-weight:700;color:#38BDF8;">${weightHistory[weightHistory.length-1].val} kg</p>
            </div>
            <div style="height:40px;width:100%;">
              <${window.Recharts.ResponsiveContainer}>
                <${window.Recharts.LineChart} data=${weightHistory}>
                  <${window.Recharts.Line} type="monotone" dataKey="val" stroke="#38BDF8" strokeWidth=${2} dot=${false} isAnimationActive=${false} />
                  <${window.Recharts.YAxis} domain=${['dataMin - 1', 'dataMax + 1']} hide />
                </${window.Recharts.LineChart}>
              </${window.Recharts.ResponsiveContainer}>
            </div>
          </div>
        `}

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          <${DashboardActionCard}
            onClick=${onOpenStudy}
            title="Estudio"
            value=${loading ? '...' : summary.studyPending}
            detail=${`Pendientes de ${summary.studySubjects} materias - ${summary.studyDone} hechos`}
            border="rgba(99,102,241,0.25)"
            background="rgba(99,102,241,0.08)"
            accent="#A5B4FC"
          />
          <${DashboardActionCard}
            onClick=${onOpenBooks}
            title="Libro actual"
            value=${summary.book?.title || 'Sin libro'}
            detail=${`P├íg ${pn(summary.book?.current_page)} / ${pn(summary.book?.total_pages)} - ${summary.bookPct}%`}
            border="rgba(245,158,11,0.25)"
            background="rgba(245,158,11,0.08)"
            accent="#FCD34D"
          />
          <${DashboardActionCard}
            onClick=${onOpenHealth}
            title="Salud"
            value=${`R ${pn(summary.meds?.roaccutan)} - M ${pn(summary.meds?.minoxidil_finasteride)}`}
            detail=${summary.medsLow ? 'Reponer pronto' : medDashboardStatus.label}
            border=${summary.medsLow ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)'}
            background=${summary.medsLow ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)'}
            accent=${summary.medsLow ? '#FCA5A5' : '#86EFAC'}
          />
          <${DashboardActionCard}
            onClick=${onOpenRecipes}
            title="Biblioteca"
            value=${loading ? '...' : summary.pantryLow}
            detail=${summary.pantryLow > 0 ? 'Items con stock bajo' : 'Sin alertas de stock'}
            border=${summary.pantryLow > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.25)'}
            background=${summary.pantryLow > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)'}
            accent=${summary.pantryLow > 0 ? '#FCD34D' : '#7DD3FC'}
          />
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          <div style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(56,189,248,0.25);background:rgba(56,189,248,0.08);">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#7DD3FC;font-weight:700;">Tiempo San Rafael</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">
              ${weather.loading ? 'Cargando...' : weather.data ? `${weather.data.temp_current}┬░ ahora ┬À prox 24h ${weather.data.temp_next24_max}/${weather.data.temp_next24_min}┬░` : 'Sin datos'}
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">
              ${weather.data
                ? `Noche ${weather.data.temp_tonight_min}┬░ ┬À H ${weather.data.humidity_min}-${weather.data.humidity_max}% ┬À lluvia ${weather.data.rain_probability}% ┬À rafagas ${weather.data.wind_gusts} km/h ┬À UV ${weather.data.uv_max}`
                : (weather.error || 'Sin datos meteorologicos')}
            </p>
            ${weather.data && html`
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
                <span style=${`padding:4px 7px;border-radius:999px;border:1px solid rgba(30,41,59,0.8);background:${weather.data.storm_risk_today === 'alto' ? 'rgba(239,68,68,0.14)' : weather.data.storm_risk_today === 'medio' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.12)'};color:${weather.data.storm_risk_today === 'alto' ? '#FCA5A5' : weather.data.storm_risk_today === 'medio' ? '#FBBF24' : '#86EFAC'};font-size:10px;font-weight:700;text-transform:uppercase;`}>
                  Hoy tormenta: ${weather.data.storm_risk_today}
                </span>
                <span style=${`padding:4px 7px;border-radius:999px;border:1px solid rgba(30,41,59,0.8);background:${weather.data.storm_risk_next24 === 'alto' ? 'rgba(239,68,68,0.14)' : weather.data.storm_risk_next24 === 'medio' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.12)'};color:${weather.data.storm_risk_next24 === 'alto' ? '#FCA5A5' : weather.data.storm_risk_next24 === 'medio' ? '#FBBF24' : '#86EFAC'};font-size:10px;font-weight:700;text-transform:uppercase;`}>
                  Prox 24h: ${weather.data.storm_risk_next24}
                </span>
              </div>
            `}
            <p style="margin:6px 0 0;font-size:11px;color:${weatherGymAdvice.color};font-weight:700;">${weatherGymAdvice.label}</p>
            ${weatherGymAdvice.detail && html`<p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${weatherGymAdvice.detail}</p>`}
            <p style="margin:6px 0 0;font-size:10px;color:#64748b;">Fuente: Open-Meteo para tiempo horario/24h + SMN para alertas.</p>
            ${weather.data && html`
              <p style="margin:6px 0 0;font-size:11px;color:${weather.data.zonda || weather.data.hail_risk || weather.data.lightning_risk ? '#FCA5A5' : '#86EFAC'};">
                ${[
                  weather.data.storm_probable_today ? 'tormentas probables hoy' : null,
                  weather.data.storm_probable_next24 ? 'inestabilidad proximas 24h' : null,
                  weather.data.zonda ? 'Zonda' : null,
                  weather.data.hail_risk ? 'granizo' : null,
                  weather.data.lightning_risk ? 'rayos' : null
                ].filter(Boolean).join(' ┬À ') || 'Sin alertas fuertes detectadas'}
              </p>
            `}
          </div>

          <button onClick=${onOpenHealth} style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(16,185,129,0.25);background:rgba(16,185,129,0.08);cursor:pointer;">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#86EFAC;font-weight:700;">Pr├│xima medicaci├│n</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">${loading ? 'Cargando...' : medDashboardStatus.label}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${loading ? '' : (medDashboardStatus.detail || 'Sin detalles')}</p>
          </button>

          <button onClick=${onOpenTasks} style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(99,102,241,0.25);background:rgba(99,102,241,0.08);cursor:pointer;">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#A5B4FC;font-weight:700;">Pr├│ximo vencimiento</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">${loading ? 'Cargando...' : (summary.nextTask?.title || 'Nada urgente')}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${loading ? '' : (summary.nextTask?.due_at ? formatTaskDate(summary.nextTask.due_at) : 'Sin tareas cerca')}</p>
          </button>
        </div>

        ${summary.backupDue && html`
          <button onClick=${onOpenNotif} style="text-align:left;padding:10px 12px;border-radius:10px;border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.08);cursor:pointer;">
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#FCD34D;font-weight:700;">Backup recomendado</p>
            <p style="margin:0;font-size:14px;font-weight:700;color:#E2E8F0;">Hace backup desde ALERTAS</p>
            <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">${summary.backupLabel || 'Pasaron mas de 72 horas sin backup manual.'}</p>
          </button>
        `}

        <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.45);border:1px solid #1E2D45;">
          <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Siguiente foco</p>
          <p style="margin:6px 0 0;font-size:13px;color:#E2E8F0;font-weight:700;">
            ${loading ? 'Cargando...' : (summary.nextTask?.title || 'Nada urgente. Buen momento para ordenar ideas.')}
          </p>
          ${!loading && summary.nextTask?.due_at && html`
            <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;font-family:'JetBrains Mono',monospace;">
              ${formatTaskDate(summary.nextTask.due_at)}
            </p>
          `}
          ${!loading && summary.nextTask && html`
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
              <button onClick=${()=>quickUpdateTask(summary.nextTask,'done')} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">HECHA</button>
              <button onClick=${()=>quickUpdateTask(summary.nextTask,'archived')} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(148,163,184,0.35);background:rgba(148,163,184,0.12);color:#CBD5E1;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">ARCHIVAR</button>
              <button onClick=${onOpenTasks} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(99,102,241,0.35);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">ABRIR</button>
            </div>
          `}
        </div>
      </div>
    `;
  };
};
