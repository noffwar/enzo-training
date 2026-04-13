    const WeekSummary = ({weekData, weekKey}) => {
      const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } = getRC();
      const [isMounted, setIsMounted] = useState(false);
      useEffect(() => {
        // PequeÃ±o delay adicional para asegurar que el contenedor padre estÃ© listo
        const timer = setTimeout(() => setIsMounted(true), 50);
        return () => clearTimeout(timer);
      }, []);

      const sessions = weekData?.sessions || {};
      const tracker  = weekData?.tracker  || {};
      const weeklyGymGoal = getPlanMode(weekData) === '5' ? 5 : 4;
      const canRenderBarCharts = !!(isMounted && BarChart && Bar && XAxis && YAxis && CartesianGrid && Tooltip && ResponsiveContainer);
      const canRenderVolumeChart = canRenderBarCharts && ReferenceLine;

      // â”€â”€ MÃ©tricas base
      const totalSteps = Object.values(tracker).reduce((a,d)=>a+(d?.walked&&d?.steps?pn(d.steps):0),0);
      const totalWater = Object.values(tracker).reduce((a,d)=>a+(d?.water||0),0);

      const macByDay = DAYS.map(d=>{
        const t=tracker[d.key]||newDay();
        const tot = dayTotals(t.meals);
        return{name:d.abbr, cals:tot.cals, prot:tot.prot, carb:tot.carb, fat:tot.fat};
      });
      const wm = macByDay.reduce((a,d)=>({cals:a.cals+d.cals,prot:a.prot+d.prot,carb:a.carb+d.carb,fat:a.fat+d.fat}),{cals:0,prot:0,carb:0,fat:0});

      // â”€â”€ SueÃ±o
      const sleepDays = Object.values(tracker).filter(d=>d?.sleepHours&&pn(d.sleepHours)>0);
      const sleepAvg  = sleepDays.length ? (sleepDays.reduce((a,d)=>a+pn(d.sleepHours),0)/sleepDays.length) : 0;
      const sleepColor = sleepAvg>=8?'#10B981':sleepAvg>=7?'#6366F1':sleepAvg>=6?'#F59E0B':'#EF4444';

      // â”€â”€ DÃ­as de entrenamiento
      const trainingDays = Object.values(getRoutineAssignments(weekData)).filter(v=>v!=='').length;

      // â”€â”€ Volumen muscular
      const canonicalMuscles = Array.from(new Set(MUSCLES.map(m => canonicalMuscleName(m)).filter(Boolean)));
      const vol = {}; canonicalMuscles.forEach(m=>vol[m]={direct:0,indirect:0});
      Object.values(sessions).forEach(s=>s&&s.forEach(ex=>{
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
      }));
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

      // â”€â”€ Macros ElÃ¡sticos: carbos objetivo se ajusta segÃºn la grasa real consumida
      // C_objetivo = (2000 - 660 - (G_real Ã— 9)) / 4   |  ProteÃ­na fija: 165g = 660 kcal
      // Bug 10 fix: usar grasa promedio diaria (no el total semanal) en fÃ³rmula diaria
      const fatDailyAvg   = wm.fat / 7;
      const carbsTarget     = Math.max(0, Math.round((TARGETS.kcal - (TARGETS.prot * 4) - (fatDailyAvg * 9)) / 4));
      const carbsTargetWeekly = carbsTarget * 7;

      // â”€â”€ Adherencia a macros con carbos elÃ¡sticos
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

          <!-- RESUMEN RÃPIDO -->
          <${Card}>
            <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#10B981;">ðŸ“‹ Resumen Semanal</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              ${[
                {icon:'ðŸ’ª',label:'Dias gym',value:trainingDays,unit:`/${weeklyGymGoal}`,color:'#6366F1'},
                {icon:'ðŸš¶',label:'Pasos',value:fn(totalSteps),unit:'',color:'#10B981'},
                {icon:'ðŸ’§',label:'Agua',value:(totalWater/1000).toFixed(1),unit:'L',color:'#38BDF8'},
              ].map(({icon,label,value,unit,color})=>html`
                <div style="background:rgba(10,15,30,0.6);border:1px solid #1E2D45;border-radius:10px;padding:10px;text-align:center;">
                  <p style="margin:0 0 2px;font-size:16px;">${icon}</p>
                  <p style="margin:0;font-size:10px;text-transform:uppercase;color:#64748b;">${label}</p>
                  <p style="margin:0;font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${color};">${value}${unit}</p>
                </div>
              `)}
            </div>
          <//>

          <!-- SUEÃ‘O -->
          <${Card}>
            <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#6366F1;">ðŸ˜´ Calidad de SueÃ±o</p>
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
            <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#F59E0B;">ðŸŽ¯ Adherencia Nutricional</p>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">
              ${[['cals','Kcal','#F59E0B'],['prot','Prot','#10B981'],['carb','Carb','#6366F1'],['fat','Grasa','#EF4444']].map(([k,l,c]) => html`
                <div style="background:rgba(10,15,30,0.6);border:1px solid ${c}33;border-radius:10px;padding:8px;text-align:center;">
                  <p style="margin:0 0 2px;font-size:10px;text-transform:uppercase;color:${c};">${l}</p>
                  <p style="margin:0;font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;color:white;">${fn(wm[k])}${k!=='cals'?'g':''}</p>
                  <p style="margin:1px 0 0;font-size:9px;color:#475569;">
                    ${k==='carb' ? `obj: ${fn(carbsTarget)}g/dÃ­a` : k==='cals' ? `obj: ${fn(TARGETS.kcal)}` : k==='prot' ? `obj: ${TARGETS.prot}g` : `obj: ${TARGETS.fat}g`}
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
              <${ITarget} s=${14}/>Series Efectivas â€” Zonas de Volumen
            </p>
            <div style="display:flex;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
              ${[['MEV','mÃ­n','#EF4444',4],['MAV','Ã³ptimo','#10B981',10],['MRV','mÃ¡x','#F59E0B',20]].map(([z,l,c,v])=>html`
                <div style="display:flex;align-items:center;gap:4px;">
                  <div style="width:16px;height:2px;background:${c};border-radius:1px;"></div>
                  <span style="font-size:10px;color:#64748b;">${z} ${l} (~${v})</span>
                </div>
              `)}
            </div>
            ${!hasVolumeData && html`
              ${!hasVolumeData && html`
                <div style="margin-bottom:10px;padding:10px;border-radius:8px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.22);">
                  <p style="margin:0;font-size:12px;color:#C7D2FE;">Todavia no hay series efectivas registradas esta semana. Marca series como completadas en GIMNASIO para ver el volumen por musculo.</p>
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

