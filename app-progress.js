export const createProgressViews = (deps) => {
  const {
    html, useState, useEffect, useMemo, getRC,
    pn, fn, TARGETS, DAYS, MUSCLES, canonicalMuscleName, resolveMuscleInfo,
    getRoutineAssignments, dayTotals, isBeforeStart, formatWeekLabel,
    getPlanMode, newDay, Card, ITarget
  } = deps;

const WeekSummary = ({weekData, weekKey}) => {
      const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } = getRC();
      const [isMounted, setIsMounted] = useState(false);
      useEffect(() => {
        // Pequeño delay adicional para asegurar que el contenedor padre esté listo
        const timer = setTimeout(() => setIsMounted(true), 50);
        return () => clearTimeout(timer);
      }, []);

      const sessions = weekData?.sessions || {};
      const tracker  = weekData?.tracker  || {};
      const weeklyGymGoal = getPlanMode(weekData) === '5' ? 5 : 4;
      const canRenderBarCharts = !!(isMounted && BarChart && Bar && XAxis && YAxis && CartesianGrid && Tooltip && ResponsiveContainer);
      const canRenderVolumeChart = canRenderBarCharts && ReferenceLine;

      // ── Métricas base
      const totalSteps = Object.values(tracker).reduce((a,d)=>a+(d?.walked&&d?.steps?pn(d.steps):0),0);
      const totalWater = Object.values(tracker).reduce((a,d)=>a+(d?.water||0),0);

      const macByDay = DAYS.map(d=>{
        const t=tracker[d.key]||newDay();
        const tot = dayTotals(t.meals);
        return{name:d.abbr, cals:tot.cals, prot:tot.prot, carb:tot.carb, fat:tot.fat};
      });
      const wm = macByDay.reduce((a,d)=>({cals:a.cals+d.cals,prot:a.prot+d.prot,carb:a.carb+d.carb,fat:a.fat+d.fat}),{cals:0,prot:0,carb:0,fat:0});

      // ── Sueño
      const sleepDays = Object.values(tracker).filter(d=>d?.sleepHours&&pn(d.sleepHours)>0);
      const sleepAvg  = sleepDays.length ? (sleepDays.reduce((a,d)=>a+pn(d.sleepHours),0)/sleepDays.length) : 0;
      const sleepColor = sleepAvg>=8?'#10B981':sleepAvg>=7?'#6366F1':sleepAvg>=6?'#F59E0B':'#EF4444';

      // ── Días de entrenamiento
      const trainingDays = Object.values(getRoutineAssignments(weekData)).filter(v=>v!=='').length;

      // ── Volumen muscular
      const canonicalMuscles = Array.from(new Set(MUSCLES.map(m => canonicalMuscleName(m)).filter(Boolean)));
      const vol = {}; canonicalMuscles.forEach(m=>vol[m]={direct:0,indirect:0});
      Object.values(sessions).forEach(s => { if(!Array.isArray(s)) return; s.forEach(ex => { if(!ex || !Array.isArray(ex.sets)) return;
        const done=ex.sets.filter(s=>s.completed).length;
        const muscles = resolveMuscleInfo(ex.name);
        if(done>0 && muscles){
          muscles.direct.forEach(m=>{
            const key = canonicalMuscleName(m);
            if(vol[key]) vol[key].direct += done;
          });
          muscles.indirect.forEach(m=>{
            const key = canonicalMuscleName(m);
            if(vol[key]) vol[key].indirect += done;
          });
        }
      }); });
      const volumeScaleMax = Math.max(20, ...Object.values(vol).map(v => (v.direct + v.indirect)), 0);
      const volumeData = Object.entries(vol).map(([m,v])=>({
        name:m.slice(0,4),
        fullName:m,
        dir:v.direct,
        ind:v.indirect,
        total:v.direct + v.indirect,
        dirPct: volumeScaleMax > 0 ? (v.direct / volumeScaleMax) * 100 : 0,
        indPct: volumeScaleMax > 0 ? (v.indirect / volumeScaleMax) * 100 : 0
      }));
      const hasVolumeData = volumeData.some(row => row.total > 0);

      const tooltipStyle = {background:'#0F1729',border:'1px solid #1E2D45',borderRadius:'8px',fontFamily:'JetBrains Mono,monospace',fontSize:'11px'};

      // ── Macros Elásticos: carbos objetivo se ajusta según la grasa real consumida
      // C_objetivo = (2000 - 660 - (G_real × 9)) / 4   |  Proteína fija: 165g = 660 kcal
      // Bug 10 fix: usar grasa promedio diaria (no el total semanal) en fórmula diaria
      const fatDailyAvg   = wm.fat / 7;
      const carbsTarget     = Math.max(0, Math.round((TARGETS.kcal - (TARGETS.prot * 4) - (fatDailyAvg * 9)) / 4));
      const carbsTargetWeekly = carbsTarget * 7;

      // ── Adherencia a macros con carbos elásticos
      const macroAdh = {
        prot: Math.min(100, Math.round(wm.prot  / (TARGETS.prot*7)      * 100)),
        carb: Math.min(100, Math.round(wm.carb  / (carbsTargetWeekly||1) * 100)),
        fat:  Math.min(100, Math.round(wm.fat   / (TARGETS.fat*7)        * 100)),
        kcal: Math.min(100, Math.round(wm.cals  / (TARGETS.kcal*7)       * 100)),
      };

      const exportWeekMetrics = () => {
        try {
          const payload = {
            app: 'enzo-training-week',
            exported_at: new Date().toISOString(),
            week_key: weekKey || '',
            summary: {
              training_days: trainingDays,
              weekly_gym_goal: weeklyGymGoal,
              total_steps: totalSteps,
              total_water_ml: totalWater,
              sleep_avg: Number(sleepAvg.toFixed(2)),
              macros_week: wm,
              macro_adherence: macroAdh,
              volume: volumeData
            }
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `semana-${String(weekKey || 'actual')}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch(_) {}
      };

      return html`
        <div class="fade-up" style="display:flex;flex-direction:column;gap:12px;">

          <!-- RESUMEN RÁPIDO -->
          <${Card}>
            <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#10B981;">📋 Resumen Semanal</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              ${[
                {icon:'💪',label:'Dias gym',value:trainingDays,unit:`/${weeklyGymGoal}`,color:'#6366F1'},
                {icon:'🚶',label:'Pasos',value:fn(totalSteps),unit:'',color:'#10B981'},
                {icon:'💧',label:'Agua',value:(totalWater/1000).toFixed(1),unit:'L',color:'#38BDF8'},
              ].map(({icon,label,value,unit,color})=>html`
                <div style="background:rgba(10,15,30,0.6);border:1px solid #1E2D45;border-radius:10px;padding:10px;text-align:center;">
                  <p style="margin:0 0 2px;font-size:16px;">${icon}</p>
                  <p style="margin:0;font-size:10px;text-transform:uppercase;color:#64748b;">${label}</p>
                  <p style="margin:0;font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${color};">${value}${unit}</p>
                </div>
              `)}
            </div>
          <//>

          <!-- SUEÑO -->
          <${Card}>
            <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#6366F1;">😴 Calidad de Sueño</p>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-size:11px;color:#64748b;">Promedio semanal</span>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${sleepColor};">${sleepAvg.toFixed(1)} hs</span>
                </div>
                <div style="width:100%;height:8px;background:#1E2D45;border-radius:4px;overflow:hidden;">
                  <div style="width:${Math.min(sleepAvg/9*100,100)}%;height:100%;background:${sleepColor};border-radius:4px;transition:width 0.5s;"></div>
                </div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">
              ${DAYS.map(d=>{
                const t=tracker[d.key];
                const h=t?.sleepHours?pn(t.sleepHours):0;
                const c=h>=8?'#10B981':h>=7?'#6366F1':h>=6?'#F59E0B':h>0?'#EF4444':'#1E2D45';
                return html`
                  <div style="text-align:center;">
                    <div style="height:32px;background:${c};border-radius:4px;opacity:${h>0?1:0.3};display:flex;align-items:center;justify-content:center;">
                      <span style="font-size:9px;font-family:'JetBrains Mono',monospace;color:${h>0?'#080D1A':'#374151'};">${h>0?h.toFixed(0):''}</span>
                    </div>
                    <span style="font-size:9px;color:#475569;">${d.abbr}</span>
                  </div>
                `;
              })}
            </div>
          <//>

          <!-- ADHERENCIA MACROS -->
          <${Card}>
            <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#F59E0B;">🎯 Adherencia Nutricional</p>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">
              ${[['cals','Kcal','#F59E0B'],['prot','Prot','#10B981'],['carb','Carb','#6366F1'],['fat','Grasa','#EF4444']].map(([k,l,c]) => html`
                <div style="background:rgba(10,15,30,0.6);border:1px solid ${c}33;border-radius:10px;padding:8px;text-align:center;">
                  <p style="margin:0 0 2px;font-size:10px;text-transform:uppercase;color:${c};">${l}</p>
                  <p style="margin:0;font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;color:white;">${fn(wm[k])}${k!=='cals'?'g':''}</p>
                  <p style="margin:1px 0 0;font-size:9px;color:#475569;">
                    ${k==='carb' ? `obj: ${fn(carbsTarget)}g/día` : k==='cals' ? `obj: ${fn(TARGETS.kcal)}` : k==='prot' ? `obj: ${TARGETS.prot}g` : `obj: ${TARGETS.fat}g`}
                  </p>
                  <p style="margin:1px 0 0;font-size:10px;color:${macroAdh[k]>=90?'#10B981':macroAdh[k]>=70?'#F59E0B':'#EF4444'};">${macroAdh[k]}%</p>
                </div>
              `)}
            </div>
            ${canRenderBarCharts && html`
              <div style="height:130px;">
                <${ResponsiveContainer} width="100%" height="100%">
                  <${BarChart} data=${macByDay} margin=${{top:0,right:0,left:-20,bottom:0}}>
                    <${CartesianGrid} strokeDasharray="3 3" stroke="#1E2D45"/>
                    <${XAxis} dataKey="name" tick=${{fill:'#64748b',fontSize:10}} axisLine=${false} tickLine=${false}/>
                    <${YAxis} tick=${{fill:'#64748b',fontSize:9}} axisLine=${false} tickLine=${false}/>
                    <${Tooltip} contentStyle=${tooltipStyle}/>
                    <${Bar} dataKey="prot" name="Prot (g)" stackId="a" fill="#10B981"/>
                    <${Bar} dataKey="carb" name="Carb (g)" stackId="a" fill="#6366F1"/>
                    <${Bar} dataKey="fat" name="Grasa (g)" stackId="a" fill="#EF4444" radius=${[4,4,0,0]}/>
                  <//>
                <//>
              </div>
            `}
          <//>

          <!-- VOLUMEN MUSCULAR con zonas MEV/MAV/MRV -->
          <${Card}>
            <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#6366F1;display:flex;align-items:center;gap:6px;">
              <${ITarget} s=${14}/>Series Efectivas — Zonas de Volumen
            </p>
            <div style="display:flex;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
              ${[['MEV','mín','#EF4444',4],['MAV','óptimo','#10B981',10],['MRV','máx','#F59E0B',20]].map(([z,l,c,v])=>html`
                <div style="display:flex;align-items:center;gap:4px;">
                  <div style="width:16px;height:2px;background:${c};border-radius:1px;"></div>
                  <span style="font-size:10px;color:#64748b;">${z} ${l} (~${v})</span>
                </div>
              `)}
            </div>
            ${!hasVolumeData && html`
              ${!hasVolumeData && html`
                <div style="margin-bottom:10px;padding:10px;border-radius:8px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.22);">
                  <p style="margin:0;font-size:12px;color:#C7D2FE;">todavía no hay series efectivas registradas esta semana. Marca series como completadas en GIMNASIO para ver el volumen por musculo.</p>
                </div>
              `}
            `}
            ${hasVolumeData && html`
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${volumeData.filter(row => row.total > 0).sort((a,b) => b.total - a.total).map(row => html`
                  <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.6);border:1px solid #1E2D45;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                      <p style="margin:0;font-size:12px;font-weight:600;color:white;">${row.fullName}</p>
                      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#E2E8F0;">${row.total} series</span>
                    </div>
                    <div style="height:12px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;display:flex;">
                      <div style=${`width:${row.dirPct}%;background:#10B981;min-width:${row.dir > 0 ? '6px' : '0'};`}></div>
                      <div style=${`width:${row.indPct}%;background:#6366F1;min-width:${row.ind > 0 ? '6px' : '0'};`}></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:10px;color:#94A3B8;">
                      <span>Directas: <span style="color:#10B981;font-family:'JetBrains Mono',monospace;">${row.dir}</span></span>
                      <span>Indirectas: <span style="color:#6366F1;font-family:'JetBrains Mono',monospace;">${row.ind}</span></span>
                      <span>Escala MRV: <span style="color:${row.total >= 20 ? '#F59E0B' : row.total >= 10 ? '#10B981' : row.total >= 4 ? '#EF4444' : '#64748b'};font-family:'JetBrains Mono',monospace;">${row.total}/${volumeScaleMax}</span></span>
                    </div>
                  </div>
                `)}
              </div>
            `}
          <//>
        </div>
      `;
    };

const ProgressView = ({allWeeks, onMount}) => {
      const { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } = getRC();
      const [isMounted, setIsMounted] = useState(false);
      useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 50);
        return () => clearTimeout(timer);
      }, []);

      const [selEx,      setSelEx]      = useState('');
      const [loadingAll, setLoadingAll] = useState(false);
      const [filterYear, setFilterYear] = useState('');
      const [filterMonth,setFilterMonth]= useState('');
      const weeklyGymGoal = 4;
      const weeklyCaloriesTarget = TARGETS.kcal * weeklyGymGoal;
      const canRenderLineChart = !!(isMounted && LineChart && Line && XAxis && YAxis && CartesianGrid && Tooltip && ResponsiveContainer);
      const canRenderBarChart = !!(isMounted && BarChart && Bar && XAxis && YAxis && CartesianGrid && Tooltip && ResponsiveContainer);

      // Carga el historial completo la primera vez que se abre la tab
      useEffect(()=>{
        if(onMount) { setLoadingAll(true); onMount().finally(()=>setLoadingAll(false)); }
      },[]);

      useEffect(() => {
        if(!onMount) return;
        const rerun = () => { setLoadingAll(true); onMount().finally(()=>setLoadingAll(false)); };
        const onFocus = () => rerun();
        const onVisible = () => { if(document.visibilityState === 'visible') rerun(); };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.removeEventListener('focus', onFocus);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, [onMount]);

      // Años disponibles en el historial
      const availableYears = useMemo(()=>{
        const ys = new Set(Object.keys(allWeeks).filter(wk=>!isBeforeStart(wk)).map(wk=>wk.slice(0,4)));
        return Array.from(ys).sort().reverse();
      },[allWeeks]);

      // Semanas filtradas por año/mes
      const filteredWeeks = useMemo(()=>
        Object.entries(allWeeks)
          .filter(([wk])=> !isBeforeStart(wk))
          .filter(([wk])=> !filterYear   || wk.startsWith(filterYear))
          .filter(([wk])=> !filterMonth  || wk.slice(5,7) === filterMonth)
          .sort(([a],[b])=>a.localeCompare(b))
      ,[allWeeks, filterYear, filterMonth]);

      const filteredWeeksObj = useMemo(()=>Object.fromEntries(filteredWeeks),[filteredWeeks]);

      // Historial de peso corporal
      const weightHistory = useMemo(()=>
        Object.entries(allWeeks)
          .filter(([wk])=> !isBeforeStart(wk) && allWeeks[wk]?.bodyWeight)
          .sort(([a],[b])=>a.localeCompare(b))
          .map(([wk,w])=>({ week: formatWeekLabel(wk).slice(0,6), kg: parseFloat(w.bodyWeight)||0 }))
      ,[allWeeks]);

      // Exportar PROGRESO como imagen PNG
      const exportImage = async () => {
        const el = document.getElementById('progress-export-area');
        if(!el) return;
        try {
          await window._loadHtml2Canvas();
          const canvas = await window.html2canvas(el, {
            backgroundColor: '#080D1A',
            scale: 2,
            useCORS: true,
            logging: false
          });
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = `enzo-progreso-${new Date().toISOString().split('T')[0]}.png`;
          a.click();
        } catch(e) {
          console.warn('[Export]', e.message);
          window.print(); // fallback si html2canvas falla
        }
      };

      const allExercises = useMemo(()=>{const s=new Set();Object.values(filteredWeeksObj).forEach(w=>Object.values(w.sessions||{}).forEach(ss=>ss&&ss.forEach(ex=>s.add(ex.name))));return Array.from(s).sort();},[filteredWeeksObj]);
      const exHistory = useMemo(()=>{
        if(!selEx) return [];
        const pts=[];
        Object.entries(filteredWeeksObj)
          .sort(([a],[b])=>a.localeCompare(b))
          .forEach(([wk,w])=>Object.values(w.sessions||{}).forEach(ss=>ss&&ss.forEach(ex=>{
            if(ex.name===selEx) ex.sets.filter(s=>s.completed).forEach((set,si)=>{
              const wt=pn(set.weight);
              if(wt>0) pts.push({
                week: formatWeekLabel(wk).slice(0,6),
                weight: wt,
                rpe: set.rpe ? parseInt(set.rpe) : null,
                set: si+1
              });
            });
          })));
        return pts;
      },[selEx, filteredWeeksObj]);

      const macHistory = useMemo(()=>
        Object.entries(filteredWeeksObj)
          .sort(([a],[b])=>a.localeCompare(b))
          .map(([wk,w])=>{
            let cals=0,prot=0;
            Object.values(w.tracker||{}).forEach(d=>{ const t=dayTotals(d.meals||[]); cals+=t.cals; prot+=t.prot; });
            return{week:formatWeekLabel(wk).slice(0,6),cals,prot};
          })
      ,[filteredWeeksObj]);
      const caloriesScaleMax = Math.max(weeklyCaloriesTarget, ...macHistory.map(row => row.cals || 0), 1);
      const caloriesBars = macHistory.map(row => ({
        ...row,
        pct: caloriesScaleMax > 0 ? (row.cals / caloriesScaleMax) * 100 : 0
      }));
      const exerciseScaleMax = Math.max(...exHistory.map(row => row.weight || 0), 1);
      const exerciseRows = exHistory.map(row => ({ ...row, pct: exerciseScaleMax > 0 ? (row.weight / exerciseScaleMax) * 100 : 0 }));
      const weightScaleMax = Math.max(...weightHistory.map(row => row.kg || 0), 1);
      const weightScaleMin = Math.min(...weightHistory.map(row => row.kg || 0), weightScaleMax);
      const weightRange = Math.max(1, weightScaleMax - weightScaleMin);
      const weightRows = weightHistory.map(row => ({ ...row, pct: ((row.kg - weightScaleMin) / weightRange) * 100 }));

      // PRs: máximo de TODO el historial (no filtrado — son records históricos)
      const personalRecords = useMemo(()=>{
        const prs = {};
        Object.values(allWeeks).forEach(w=>
          Object.values(w.sessions||{}).forEach(ss=>ss&&ss.forEach(ex=>{
            ex.sets.filter(s=>s.completed).forEach(set=>{
              const wt = pn(set.weight);
              if(wt > 0 && (!prs[ex.name] || wt > prs[ex.name])) prs[ex.name] = wt;
            });
          }))
        );
        return Object.entries(prs).sort(([,a],[,b])=>b-a);
      },[allWeeks]);
      const tooltipStyle = {background:'#0F1729',border:'1px solid #1E2D45',borderRadius:'8px',fontFamily:'JetBrains Mono,monospace',fontSize:'11px'};

      const exportProgressData = () => {
        try {
          const payload = {
            app: 'enzo-training-progress',
            exported_at: new Date().toISOString(),
            filters: { year: filterYear || null, month: filterMonth || null, exercise: selEx || null },
            weekly_calories_target: weeklyCaloriesTarget,
            weight_history: weightHistory,
            exercise_history: exHistory,
            calories_history: macHistory,
            personal_records: personalRecords
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `progreso-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch(e) {
          console.warn('[ProgressExportData]', e.message || e);
        }
      };

      if(Object.keys(allWeeks).length===0) return html`
        <${Card}>
          <div style="text-align:center;padding:32px 0;">
            <p style="font-size:36px;margin:0 0 8px;">📊</p>
            <p style="color:#94a3b8;margin:0;">Todavía no hay datos históricos.</p>
            <p style="color:#64748b;font-size:12px;margin:4px 0 0;">Completá entrenamientos en varias semanas para ver progresión.</p>
          </div>
        <//>
      `;

      return html`
        <div id="progress-export-area" class="fade-up" style="display:flex;flex-direction:column;gap:12px;">
          ${loadingAll && html`
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);">
              <span class="spin" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(99,102,241,0.3);border-top-color:#6366F1;border-radius:50%;flex-shrink:0;"></span>
              <span style="font-size:12px;color:#6366F1;font-family:'JetBrains Mono',monospace;">Cargando historial completo...</span>
            </div>
          `}
          <${Card}>
            <!-- D. Filtro por Año/Mes -->
            <div style="display:flex;gap:6px;margin-bottom:12px;">
              <select class="inp" style="flex:1;font-size:12px;padding:6px 8px;"
                value=${filterYear} onChange=${e=>{ setFilterYear(e.target.value); setFilterMonth(''); }}>
                <option value="">Todos los años</option>
                ${availableYears.map(y=>html`<option value=${y}>${y}</option>`)}
              </select>
              <select class="inp" style="flex:1;font-size:12px;padding:6px 8px;"
                value=${filterMonth} onChange=${e=>setFilterMonth(e.target.value)}
                disabled=${!filterYear}>
                <option value="">Todos los meses</option>
                ${['01','02','03','04','05','06','07','08','09','10','11','12'].map((m,i)=>html`
                  <option value=${m}>${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]}</option>
                `)}
              </select>
              ${(filterYear||filterMonth) && html`
                <button onClick=${()=>{ setFilterYear(''); setFilterMonth(''); }}
                  style="padding:6px 10px;border-radius:8px;border:1px solid #1E2D45;background:rgba(239,68,68,0.1);color:#EF4444;font-size:11px;cursor:pointer;white-space:nowrap;">
                  Reset
                </button>
              `}
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-bottom:12px;flex-wrap:wrap;">
              <button onClick=${exportProgressData} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(56,189,248,0.3);background:rgba(56,189,248,0.12);color:#7DD3FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                EXPORTAR DATOS
              </button>
              <button onClick=${exportImage} style="padding:6px 10px;border-radius:8px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.12);color:#A5B4FC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
                EXPORTAR IMAGEN
              </button>
            </div>
            <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#10B981;">Progresion de Peso por Ejercicio</p>
            <select class="inp" style="margin-bottom:12px;" value=${selEx} onChange=${e=>setSelEx(e.target.value)}>
              <option value="">Seleccionar ejercicio...</option>
              ${allExercises.map(e=>html`<option>${e}</option>`)}
            </select>
            ${selEx && exHistory.length>0 && html`
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${exerciseRows.map(row => html`
                  <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.6);border:1px solid #1E2D45;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                      <span style="font-size:11px;color:#CBD5E1;font-weight:700;">${row.week} - serie ${row.set}</span>
                      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#10B981;">${row.weight} kg</span>
                    </div>
                    <div style="height:10px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;">
                      <div style=${`width:${row.pct}%;height:100%;background:#10B981;min-width:${row.weight > 0 ? '6px' : '0'};`}></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:10px;color:#94A3B8;">
                      <span>RPE: <span style="color:#F59E0B;font-family:'JetBrains Mono',monospace;">${row.rpe ?? '-'}</span></span>
                      <span>Max: <span style="color:#10B981;font-family:'JetBrains Mono',monospace;">${exerciseScaleMax} kg</span></span>
                    </div>
                  </div>
                `)}
              </div>
            `}
            ${selEx && exHistory.length>0 && canRenderLineChart && html`
              <div style="height:200px;">
                <${ResponsiveContainer} width="100%" height="100%">
                  <${LineChart} data=${exHistory} margin=${{top:5,right:5,left:-20,bottom:0}}>
                    <${CartesianGrid} strokeDasharray="3 3" stroke="#1E2D45"/>
                    <${XAxis} dataKey="week" tick=${{fill:'#64748b',fontSize:9}} axisLine=${false} tickLine=${false}/>
                    <${YAxis} yAxisId="w" tick=${{fill:'#64748b',fontSize:9}} axisLine=${false} tickLine=${false} unit="kg"/>
                    <${YAxis} yAxisId="r" orientation="right" domain=${[1,10]} tick=${{fill:'#F59E0B',fontSize:9}} axisLine=${false} tickLine=${false}/>
                    <${Tooltip} contentStyle=${tooltipStyle} formatter=${(v,n)=>[n==='RPE'?v:v+'kg',n]}/>
                    <${Line} yAxisId="w" type="monotone" dataKey="weight" name="Peso" stroke="#10B981" strokeWidth=${2} dot=${{fill:'#10B981',r:3}}/>
                    <${Line} yAxisId="r" type="monotone" dataKey="rpe" name="RPE" stroke="#F59E0B" strokeWidth=${1.5} strokeDasharray="4 3" dot=${{fill:'#F59E0B',r:2}} connectNulls/>
                  <//>
                <//>
              </div>
              <div style="display:flex;gap:12px;margin-top:6px;justify-content:center;">
                <div style="display:flex;align-items:center;gap:4px;"><div style="width:12px;height:2px;background:#10B981;border-radius:1px;"></div><span style="font-size:10px;color:#64748b;">Peso (kg)</span></div>
                <div style="display:flex;align-items:center;gap:4px;"><div style="width:12px;height:2px;background:#F59E0B;border-radius:1px;border-style:dashed;"></div><span style="font-size:10px;color:#64748b;">RPE (fatiga)</span></div>
              </div>
            `}
            ${selEx && exHistory.length===0 && html`<p style="color:#64748b;font-size:13px;text-align:center;padding:20px 0;">Sin datos registrados aun para este ejercicio.</p>`}
          <//>

          <!-- RECORDS PERSONALES -->
          ${personalRecords.length > 0 && html`
            <${Card}>
              <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#F59E0B;">Records Personales</p>
              <div style="display:flex;flex-direction:column;gap:6px;">
                ${personalRecords.map(([ex, pr], i) => html`
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:7px;background:${i===0?'rgba(245,158,11,0.08)':'rgba(10,15,30,0.4)'};border:1px solid ${i===0?'rgba(245,158,11,0.3)':'#1E2D45'};">
                    <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                      <span style="font-size:12px;flex-shrink:0;">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'  '}</span>
                      <span style="font-size:12px;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ex}</span>
                    </div>
                    <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${i===0?'#F59E0B':'#94a3b8'};flex-shrink:0;margin-left:8px;">${pr}kg</span>
                  </div>
                `)}
              </div>
            <//>
          `}

          ${macHistory.length>0 && html`
            <${Card}>
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#F59E0B;">Calorias por Semana</p>
              <p style="margin:0 0 10px;font-size:11px;color:#64748b;">Objetivo base: ${fn(weeklyCaloriesTarget)} kcal por 4 dias de gym.</p>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${caloriesBars.map(row => html`
                  <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.6);border:1px solid #1E2D45;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                      <span style="font-size:11px;color:#CBD5E1;font-weight:700;">${row.week}</span>
                      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${row.cals >= weeklyCaloriesTarget ? '#10B981' : '#F59E0B'};">${fn(row.cals)} kcal</span>
                    </div>
                    <div style="position:relative;height:12px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;">
                      <div style=${`width:${row.pct}%;height:100%;background:${row.cals >= weeklyCaloriesTarget ? '#10B981' : '#F59E0B'};min-width:${row.cals > 0 ? '6px' : '0'};`}></div>
                      <div style=${`position:absolute;top:0;bottom:0;left:${(weeklyCaloriesTarget / caloriesScaleMax) * 100}%;width:2px;background:#6366F1;opacity:0.95;`}></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:10px;color:#94A3B8;">
                      <span>Objetivo: <span style="color:#818CF8;font-family:'JetBrains Mono',monospace;">${fn(weeklyCaloriesTarget)}</span></span>
                      <span>Diferencia: <span style="color:${row.cals - weeklyCaloriesTarget >= 0 ? '#10B981' : '#FCA5A5'};font-family:'JetBrains Mono',monospace;">${row.cals - weeklyCaloriesTarget >= 0 ? '+' : ''}${fn(row.cals - weeklyCaloriesTarget)}</span></span>
                    </div>
                  </div>
                `)}
              </div>
            <//>
          `}

          <!-- PESO CORPORAL -->
          ${weightHistory.length > 0 && html`
            <${Card}>
              <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#38BDF8;">Evolucion de Peso Corporal</p>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <div>
                  <span style="font-size:10px;color:#64748b;">Inicio: </span>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:white;">${weightHistory[0]?.kg}kg</span>
                </div>
                <div>
                  <span style="font-size:10px;color:#64748b;">Actual: </span>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:${pn(weightHistory.at(-1)?.kg) < pn(weightHistory[0]?.kg) ? '#10B981':'#F59E0B'};">
                    ${weightHistory.at(-1)?.kg}kg
                    ${weightHistory.length>1 ? ` (${(pn(weightHistory.at(-1)?.kg)-pn(weightHistory[0]?.kg)>0?'+':'')}${(pn(weightHistory.at(-1)?.kg)-pn(weightHistory[0]?.kg)).toFixed(1)}kg)` : ''}
                  </span>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${weightRows.map(row => html`
                  <div style="padding:10px;border-radius:10px;background:rgba(10,15,30,0.6);border:1px solid #1E2D45;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                      <span style="font-size:11px;color:#CBD5E1;font-weight:700;">${row.week}</span>
                      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#38BDF8;">${row.kg} kg</span>
                    </div>
                    <div style="height:10px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;">
                      <div style=${`width:${row.pct}%;height:100%;background:#38BDF8;min-width:6px;`}></div>
                    </div>
                  </div>
                `)}
              </div>
            <//>
          `}

          <!-- EXPORTAR -->
          <${Card}>
            <p style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#64748b;">Exportar</p>
            <button onClick=${exportImage}
              style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(99,102,241,0.3);background:rgba(99,102,241,0.1);color:#818CF8;font-size:13px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
              Capturar progreso como imagen
            </button>
            <p style="margin:6px 0 0;font-size:10px;color:#374151;text-align:center;">
              Usa Ctrl+P o la captura de pantalla del celular para guardar
            </p>
          <//>

        </div>
      `;
    };

  return { WeekSummary, ProgressView };
};

