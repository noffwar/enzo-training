

export const createGymPanel = (deps) => {
  const {
    html, useState, useRef, IClock, IDumb, ICheck, SectionAccordion,
    fn, pn, ft, resolveMuscleInfo, isGymClosedDate, getDayDate
  } = deps;
  
  const GymPanel = ({session, tracker:t, onSetComplete, onInput, onHabit, onApplyOverload, onCompleteSession, onResetSessionChecks}) => {
    const [open,setOpen] = useState(true);
    if(!session||session.length===0) return html`
      <${SectionAccordion} icon=${html`<${IDumb} s=${18}/>`} title="Rutina Gimnasio" isOpen=${true} onToggle=${()=>{}}>
        <div style="padding:16px;text-align:center;color:#64748B;font-size:12px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;border-radius:10px;margin-bottom:10px;">
          No hay rutina asignada para hoy.
        </div>
      <//>
    `;
    const safeT = { gymStartTime:'', gymEndTime:'', ...t };
    const totalSets = session.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
    const completedSets = session.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
    const completedExercises = session.filter(ex => ex.sets.length > 0 && ex.sets.every(s => s.completed)).length;
    const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    // Detecta ejercicios donde se superaron las reps objetivo en al menos 1 serie
    const overloadCandidates = session.filter(ex =>
      ex.sets.some(s => s.completed && parseInt(s.reps) > parseInt(s.idealReps||s.reps))
    );

    return html`
      <${SectionAccordion} icon=${html`<${IDumb} s=${18}/>`} title="Rutina Gimnasio" isOpen=${open} onToggle=${()=>setOpen(!open)}>
        <!-- Horarios sesión -->
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;margin-bottom:12px;">
          <${IClock} s=${16} c=""/>
          <span style="font-size:13px;color:#94a3b8;">Sesión:</span>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            ${[['gymStartTime','Inicio'],['gymEndTime','Fin']].map(([k,l]) => html`
              <div style="display:flex;align-items:center;gap:6px;">
                <label style="font-size:10px;text-transform:uppercase;color:#64748b;">${l}</label>
                <input type="time" value=${safeT[k]||''} onInput=${e=>onHabit(k,e.target.value)} class="inp-sm"/>
              </div>
            `)}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;margin-bottom:12px;">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${[
              { label:'Series', value:`${completedSets}/${totalSets}`, color:'#10B981' },
              { label:'Ejercicios', value:`${completedExercises}/${session.length}`, color:'#6366F1' },
              { label:'Progreso', value:`${progressPct}%`, color:'#F59E0B' }
            ].map(stat => html`
              <div style="padding:8px;border-radius:8px;background:#0F1729;border:1px solid #1E2D45;text-align:center;">
                <p style="margin:0;font-size:9px;text-transform:uppercase;color:#64748b;">${stat.label}</p>
                <p style="margin:2px 0 0;font-size:15px;font-weight:700;font-family:'JetBrains Mono',monospace;color:${stat.color};">${stat.value}</p>
              </div>
            `)}
          </div>
          <div style="height:8px;border-radius:999px;background:#0F1729;border:1px solid #1E2D45;overflow:hidden;">
            <div style=${`width:${progressPct}%;height:100%;background:linear-gradient(90deg,#10B981,#6366F1);transition:width 0.3s ease;`}></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button onClick=${()=>onCompleteSession&&onCompleteSession()}
              style="padding:7px 12px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.12);color:#86EFAC;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
              COMPLETAR SESION
            </button>
            <button onClick=${()=>onResetSessionChecks&&onResetSessionChecks()}
              style="padding:7px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.28);background:rgba(239,68,68,0.10);color:#FCA5A5;font-size:11px;font-weight:800;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
              REINICIAR CHECKS
            </button>
          </div>
        </div>

        <!-- Ejercicios -->
        ${session.map((ex,ei) => html`
          <div style="border-radius:10px;overflow:hidden;border:1px solid #1E2D45;margin-bottom:10px;">
            <div style="padding:8px 12px;background:rgba(22,32,53,0.7);border-left:3px solid var(--green);">
              <p style="margin:0;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:15px;color:white;letter-spacing:0.04em;">${ei+1}. ${ex.name}</p>
              ${resolveMuscleInfo(ex.name) && html`
                <p style="margin:2px 0 0;font-size:10px;color:#475569;">
                  ${resolveMuscleInfo(ex.name).direct.join(', ')}
                  ${resolveMuscleInfo(ex.name).indirect.length>0 ? ' · '+resolveMuscleInfo(ex.name).indirect.join(', ') : ''}
                </p>
              `}
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="text-align:center;width:28px;">#</th>
                    <th>Reps</th><th>Peso</th><th>RIR</th><th>Pausa</th>
                    <th style="text-align:center;">✓</th>
                  </tr>
                </thead>
                <tbody>
                  ${ex.sets.map((set,si) => html`
                    <tr class=${set.completed?'set-row-done':''}>
                      <td style="text-align:center;font-size:11px;font-family:'JetBrains Mono',monospace;color:#475569;">${si+1}</td>
                      <td><input class="inp-xs" style="width:52px;" value=${set.reps} onInput=${e=>onInput(ei,si,'reps',e.target.value)}/></td>
                      <td><input class="inp-xs" style="width:60px;" value=${set.weight} onInput=${e=>onInput(ei,si,'weight',e.target.value)}/></td>
                      <td><span class=${`tag-rir ${set.rir.includes('Fallo')?'fallo':''}`}>${set.rir}</span></td>
                      <td><span style="font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace;white-space:nowrap;">${set.restStr}</span></td>
                      <td style="text-align:center;">
                        <button class="check-btn" onClick=${()=>onSetComplete(ei,si,set.restSecs)}
                          style=${set.completed?'background:#10B981;box-shadow:0 0 10px rgba(16,185,129,0.4);':'background:#162035;border:1px solid #1E2D45;'}>
                          <${ICheck} s=${14} c=""/>
                        </button>
                      </td>
                    </tr>
                    ${set.completed && html`
                      <tr style="background:rgba(10,15,30,0.3);">
                        <td colspan="6" style="padding:6px 8px;">
                          <div style="display:flex;justify-content:space-between;font-size:9px;color:#64748b;margin-bottom:3px;">
                            <span>RPE: ${set.rpe||7}</span><span>Esfuerzo percibido</span>
                          </div>
                          <input type="range" min="1" max="10" class="rpe-slider"
                            value=${set.rpe||7}
                            onInput=${e=>onInput(ei,si,'rpe',parseInt(e.target.value))}/>
                          ${(parseInt(set.reps) > parseInt(set.idealReps||set.reps)) && html`
                            <p style="margin:4px 0 0;font-size:10px;color:#10B981;">🚀 Sugerencia: +2,5kg la próxima semana</p>
                          `}
                        </td>
                      </tr>
                    `}
                  `)}
                </tbody>
              </table>
            </div>
          </div>
        `)}

        <!-- Sobrecarga progresiva -->
        ${overloadCandidates.length > 0 && html`
          <div style="padding:10px 12px;border-radius:8px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);margin-bottom:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div>
                <p style="margin:0;font-size:12px;font-weight:700;color:#10B981;">🚀 Sobrecarga Disponible</p>
                <p style="margin:2px 0 0;font-size:10px;color:#64748b;">
                  ${overloadCandidates.map(ex=>ex.name.split(' ')[0]).join(', ')} — superaste las reps objetivo
                </p>
              </div>
              <button onClick=${()=>onApplyOverload&&onApplyOverload(overloadCandidates)}
                style="flex-shrink:0;padding:7px 14px;border-radius:8px;border:none;background:#10B981;color:#080D1A;font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:12px;cursor:pointer;letter-spacing:0.05em;white-space:nowrap;">
                +2,5kg aplicar
              </button>
            </div>
          </div>
        `}

        <!-- Notas del entrenamiento -->
        <textarea
          placeholder="Notas de la sesión (sensaciones, dolores, PRs...)"
          value=${t.gymNotes||''}
          onInput=${e=>onHabit('gymNotes',e.target.value)}
          style="width:100%;background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:10px;font-size:13px;color:#cbd5e1;font-family:'Barlow',sans-serif;resize:vertical;min-height:70px;margin-top:4px;"></textarea>
      <//>
    `;
  };

  const RoutineManager = (props) => {
    const { weekKey, weekData, onMappingChange } = props;
    const dm = weekData?.dayMapping || {};
    const planMode = dm._planMode || '4';
    
    // Lista de opciones 4 o 5 dias
    const planOptions = [['4', '4 Días'], ['5', '5 Días']];
    
    const routineOptions = [
      ['', 'Descanso'],
      ...Object.values(props.routineData || deps.routineData || {}).map(r => [r.id, r.name])
    ];

    const DAYS_INFO = [
      { key: '1', label: 'Lunes' },
      { key: '2', label: 'Martes' },
      { key: '3', label: 'Miércoles' },
      { key: '4', label: 'Jueves' },
      { key: '5', label: 'Viernes' },
      { key: '6', label: 'Sábado' },
      { key: '0', label: 'Domingo' }
    ];

    const applyStandardPlan = (mode) => {
      const newMapping = buildPlanDayMapping(mode, weekKey, isGymClosedDate, getDayDate); 
      onMappingChange(newMapping);
    };

    return html`
      <div style="display:flex;flex-direction:column;gap:16px;">
        <${SectionAccordion} icon="📋" title="Plan de Entrenamiento" isOpen=${true} onToggle=${()=>{}}>
          <p style="margin:0 0 12px;font-size:12px;color:#94A3B8;">Selecciona tu frecuencia semanal para autoresetear los días:</p>
          <div style="display:flex;gap:8px;margin-bottom:20px;">
            ${planOptions.map(([val, lbl]) => html`
              <button 
                onClick=${() => applyStandardPlan(val)}
                style=${`padding:10px 16px;border-radius:10px;border:1px solid ${planMode === val ? '#10B981' : '#1E2D45'};background:${planMode === val ? 'rgba(16,185,129,0.1)' : 'rgba(15,23,41,0.5)'};color:${planMode === val ? '#86EFAC' : '#94A3B8'};font-family:'Barlow Condensed',sans-serif;font-weight:700;cursor:pointer;flex:1;`}>
                ${lbl}
              </button>
            `)}
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;">
            ${DAYS_INFO.map(day => html`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;">
                <span style="font-size:14px;font-weight:700;color:#E2E8F0;width:80px;">${day.label}</span>
                <select 
                  value=${dm[day.key] || ''} 
                  onChange=${e => onMappingChange({ ...dm, [day.key]: e.target.value })}
                  style="background:#0F1729;border:1px solid #1E2D45;border-radius:8px;padding:6px 10px;color:white;font-size:12px;flex:1;max-width:180px;">
                  ${routineOptions.map(([val, lbl]) => html`<option value=${val}>${lbl}</option>`)}
                </select>
              </div>
            `)}
          </div>

          <div style="margin-top:16px;padding:12px;border-radius:10px;background:rgba(99,102,241,0.05);border:1px solid rgba(99,102,241,0.2);">
            <p style="margin:0;font-size:11px;color:#A5B4FC;line-height:1.4;">
              💡 <b>Tip:</b> Si cambias el plan, se resetearán las asignaciones. Puedes ajustar días individuales manualmente después.
            </p>
          </div>
        <//>
      </div>
    `;
  };

  return { GymPanel, RoutineManager };
};

export const createRoutineEditor = (deps) => {
  const { html, useState, Card, pn } = deps;

  return ({ routines, onSave }) => {
    const [rts, setRts] = useState(routines);
    const [selId, setSelId] = useState(Object.keys(routines)[0] || '1');
    const [dirty, setDirty] = useState(false);

    const upd = (fn) => { setRts(r => { const n = fn(r); setDirty(true); return n; }); };

    const updateExName = (ei, val) => upd(r => ({ ...r, [selId]: { ...r[selId], exercises: r[selId].exercises.map((ex, i) => i === ei ? { ...ex, name: val } : ex) } }));

    const parseRestStr = (str) => {
      const s = String(str).trim().toLowerCase();
      const numMatch = s.match(/[\d,\.]+/);
      if (!numMatch) return null;
      const num = pn(numMatch[0]);
      if (s.includes('seg') || s.includes('s)')) return Math.round(num);
      return Math.round(num * 60);
    };

    const updateSet = (ei, si, field, val) => upd(r => {
      const exercises = r[selId].exercises.map((ex, i) => i === ei ? {
        ...ex,
        sets: ex.sets.map((s, j) => j === si ? (() => {
          const updated = { ...s, [field]: val };
          if (field === 'restStr') {
            const secs = parseRestStr(val);
            if (secs !== null) updated.restSecs = secs;
          }
          if (field === 'restSecs') {
            const secs = parseInt(val);
            if (!isNaN(secs)) updated.restStr = secs >= 60
              ? `${(secs / 60).toFixed(secs % 60 === 0 ? 0 : 1).replace('.', ',')} min`
              : `${secs} seg`;
          }
          return updated;
        })() : s)
      } : ex);
      return { ...r, [selId]: { ...r[selId], exercises } };
    });

    const addSet = (ei) => upd(r => ({ ...r, [selId]: { ...r[selId], exercises: r[selId].exercises.map((ex, i) => i === ei ? { ...ex, sets: [...ex.sets, { reps: '10', weight: '0,0', rir: '2', restSecs: 90, restStr: '1,5 min' }] } : ex) } }));
    const removeSet = (ei, si) => upd(r => ({ ...r, [selId]: { ...r[selId], exercises: r[selId].exercises.map((ex, i) => i === ei ? { ...ex, sets: ex.sets.filter((_, j) => j !== si) } : ex) } }));
    const addExercise = () => upd(r => ({ ...r, [selId]: { ...r[selId], exercises: [...r[selId].exercises, { name: 'Nuevo ejercicio', sets: [{ reps: '10', weight: '0,0', rir: '2', restSecs: 90, restStr: '1,5 min' }] }] } }));
    const removeExercise = (ei) => upd(r => ({ ...r, [selId]: { ...r[selId], exercises: r[selId].exercises.filter((_, i) => i !== ei) } }));

    const handleSave = () => { onSave(rts); setDirty(false); };

    const routine = rts[selId];

    return html`
      <div class="fade-up" style="display:flex;flex-direction:column;gap:12px;">
        <${Card}>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10B981;">📋 Editor de Rutinas</p>
            ${dirty && html`
              <button onClick=${handleSave}
                style="padding:7px 16px;border-radius:8px;border:none;background:#10B981;color:#080D1A;font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:13px;cursor:pointer;letter-spacing:0.05em;">
                GUARDAR CAMBIOS
              </button>
            `}
          </div>

          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
            ${Object.values(rts).map(r => html`
              <button onClick=${() => setSelId(r.id)}
                style=${`padding:6px 14px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;cursor:pointer;border:1px solid ${selId === r.id ? '#10B981' : '#1E2D45'};background:${selId === r.id ? 'rgba(16,185,129,0.15)' : 'transparent'};color:${selId === r.id ? '#10B981' : '#64748b'};`}>
                ${r.name}
              </button>
            `)}
          </div>

          <div style="display:flex;flex-direction:column;gap:12px;">
            ${routine?.exercises.map((ex, ei) => html`
              <div style="padding:10px;border-radius:8px;background:rgba(10,15,30,0.5);border:1px solid #1E2D45;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:#6366F1;flex-shrink:0;">${ei + 1}.</span>
                  <input value=${ex.name} onInput=${e => updateExName(ei, e.target.value)}
                    style="flex:1;background:#0F1729;border:1px solid #2A3F5F;border-radius:6px;padding:6px 10px;font-size:13px;color:white;font-family:'Barlow',sans-serif;"/>
                  <button onClick=${() => removeExercise(ei)}
                    style="width:28px;height:28px;border-radius:6px;border:none;background:rgba(239,68,68,0.15);color:#EF4444;font-size:16px;cursor:pointer;flex-shrink:0;">×</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px;">
                  <div style="display:grid;grid-template-columns:32px 1fr 1fr 1fr 1fr 28px;gap:4px;padding:0 2px;">
                    ${['#', 'Reps', 'Kg', 'RIR', 'Pausa', ''].map(h => html`<span style="font-size:9px;text-transform:uppercase;color:#475569;text-align:center;">${h}</span>`)}
                  </div>
                  ${ex.sets.map((s, si) => html`
                    <div style="display:grid;grid-template-columns:32px 1fr 1fr 1fr 1fr 28px;gap:4px;align-items:center;">
                      <span style="font-size:10px;color:#475569;text-align:center;font-family:'JetBrains Mono',monospace;">${si + 1}</span>
                      ${['reps', 'weight', 'rir', 'restStr'].map(f => html`
                        <input value=${s[f]} onInput=${e => updateSet(ei, si, f, e.target.value)}
                          style="background:#0a0f1e;border:1px solid #1E2D45;border-radius:5px;padding:4px 6px;font-size:11px;color:white;text-align:center;font-family:'JetBrains Mono',monospace;width:100%;"/>
                      `)}
                      <button onClick=${() => removeSet(ei, si)}
                        style="width:28px;height:24px;border-radius:5px;border:none;background:rgba(239,68,68,0.1);color:#EF4444;font-size:14px;cursor:pointer;">×</button>
                    </div>
                  `)}
                </div>
                <button onClick=${() => addSet(ei)}
                  style="width:100%;padding:5px;border-radius:6px;border:1px dashed #1E2D45;background:transparent;color:#475569;font-size:11px;cursor:pointer;">
                  + Agregar serie
                </button>
              </div>
            `)}
          </div>
          <button onClick=${addExercise}
            style="width:100%;margin-top:10px;padding:10px;border-radius:8px;border:1px dashed rgba(99,102,241,0.4);background:transparent;color:#6366F1;font-size:12px;font-weight:700;font-family:'Barlow Condensed',sans-serif;cursor:pointer;letter-spacing:0.05em;">
            + AGREGAR EJERCICIO
          </button>
        <//>
      </div>
    `;
  };
};

// ─── Gym Logic Helpers ──────────────────────────────────────

export const muscleMap = {
  "Press banca plano":{direct:["Pecho"],indirect:["Hombros","Tríceps"]},
  "Remo 45° con barra":{direct:["Espalda"],indirect:["Bíceps","Lumbares"]},
  "Press militar Smith":{direct:["Hombros"],indirect:["Tríceps"]},
  "Jalón Dorsal Isolateral":{direct:["Espalda"],indirect:["Bíceps"]},
  "Vuelo lateral hombro":{direct:["Hombros"],indirect:[]},
  "Encogimientos trapecio":{direct:["Trapecio"],indirect:[]},
  "Tríceps polea barra":{direct:["Tríceps"],indirect:[]},
  "Sentadilla Smith":{direct:["Cuádriceps"],indirect:["Glúteos","Femorales","Lumbares"]},
  "Peso muerto rumano":{direct:["Femorales","Glúteos"],indirect:["Lumbares"]},
  "Extensión cuádriceps":{direct:["Cuádriceps"],indirect:[]},
  "Aductores máquina":{direct:["Aductores"],indirect:[]},
  "Gemelos de pie":{direct:["Pantorrillas"],indirect:[]},
  "Soleos banco":{direct:["Pantorrillas"],indirect:[]},
  "Dominadas prono/neutras":{direct:["Espalda"],indirect:["Bíceps"]},
  "Press inclinado mancuernas":{direct:["Pecho"],indirect:["Hombros","Tríceps"]},
  "Remo polea bilateral":{direct:["Espalda"],indirect:["Bíceps"]},
  "Mariposa pectoral":{direct:["Pecho"],indirect:[]},
  "Facepull polea alta":{direct:["Hombros"],indirect:["Trapecio","Espalda"]},
  "Curl mancuernas bíceps":{direct:["Bíceps"],indirect:[]},
  "Tríceps polea soga":{direct:["Tríceps"],indirect:[]},
  "Hip Thrust con Barra":{direct:["Glúteos"],indirect:["Femorales"]},
  "Sentadilla Búlgara Smith":{direct:["Cuádriceps","Glúteos"],indirect:[]},
  "Curl femoral":{direct:["Femorales"],indirect:[]},
  "Extensión cuádr. unilateral":{direct:["Cuádriceps"],indirect:[]},
  "Extensiones lumbares":{direct:["Lumbares"],indirect:["Glúteos","Femorales"]},
  "Abductores máquina":{direct:["Glúteos"],indirect:["Aductores"]},
  "Press militar en Smith":{direct:["Hombros"],indirect:["Triceps"]},
  "Maquina de Jalon Dorsal Isolateral":{direct:["Espalda"],indirect:["Biceps"]},
  "Encogimientos de Trapecio":{direct:["Trapecio"],indirect:[]},
  "Cruces en polea alta":{direct:["Pecho"],indirect:["Hombros"]},
  "Cruces invertidos en polea":{direct:["Hombros"],indirect:["Trapecio","Espalda"]},
  "Push-up Plus":{direct:["Hombros"],indirect:["Pecho","Core"]},
  "Peso muerto mancuernas (Rumano)":{direct:["Femorales","Gluteos"],indirect:["Lumbares"]},
  "Maquina cuadriceps (Extensiones Bilaterales)":{direct:["Cuadriceps"],indirect:[]},
  "Curl femoral tumbado":{direct:["Femorales"],indirect:[]},
  "Aductores maquina":{direct:["Aductores"],indirect:[]},
  "Elevacion de Gemelos de pie":{direct:["Pantorrillas"],indirect:[]},
  "Curl Biceps Martillo mancuernas":{direct:["Biceps"],indirect:[]},
  "Triceps polea con barra":{direct:["Triceps"],indirect:[]},
  "Crunch en polea alta":{direct:["Core"],indirect:[]},
  "Pallof Press":{direct:["Core"],indirect:[]},
  "Elevaciones de Tibial":{direct:["Pantorrillas"],indirect:[]},
  "Mancuernas biceps supino":{direct:["Biceps"],indirect:[]},
  "Dominadas prono y neutras":{direct:["Espalda"],indirect:["Biceps"]},
  "Remo sentado en maquina unilateral":{direct:["Espalda"],indirect:["Biceps"]},
  "Mariposa (Pectoral)":{direct:["Pecho"],indirect:[]},
  "Facepull en Polea Alta":{direct:["Hombros"],indirect:["Trapecio","Espalda"]},
  "Hombro vuelo lateral en polea baja":{direct:["Hombros"],indirect:[]},
  "Hip Thrust con Maquina":{direct:["Gluteos"],indirect:["Femorales"]},
  "Sentadilla Bulgara en Smith":{direct:["Cuadriceps","Gluteos"],indirect:[]},
  "Curl femoral sentado":{direct:["Femorales"],indirect:[]},
  "Maquina cuadriceps unilateral":{direct:["Cuadriceps"],indirect:[]},
  "Abductores maquina":{direct:["Gluteos"],indirect:["Aductores"]},
  "Elevacion de Gemelos (Prensa)":{direct:["Pantorrillas"],indirect:[]},
  "Extensiones Lumbares en Banco Romano":{direct:["Lumbares"],indirect:["Gluteos","Femorales"]},
  "Mancuernas biceps":{direct:["Biceps"],indirect:[]},
  "Triceps polea soga":{direct:["Triceps"],indirect:[]},
  "Elevacion de rodillas colgado":{direct:["Core"],indirect:[]}
};

export const normalizeExerciseKey = (text='') =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

export const resolveMuscleInfo = (exerciseName='') => {
  if(muscleMap[exerciseName]) return muscleMap[exerciseName];
  const target = normalizeExerciseKey(exerciseName);
  if(!target) return null;
  for (const [name, info] of Object.entries(muscleMap)) {
    const key = normalizeExerciseKey(name);
    if(key === target || key.includes(target) || target.includes(key)) return info;
  }
  return null;
};

export const MUSCLE_ALIASES = {
  'Tríceps': 'Triceps',
  'Bíceps': 'Biceps',
  'Cuádriceps': 'Cuadriceps',
  'Glúteos': 'Gluteos',
  'Abdomen': 'Core'
};

export const canonicalMuscleName = (muscle='') => {
  const raw = String(muscle || '').trim();
  if(!raw) return '';
  const normalized = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return MUSCLE_ALIASES[raw] || MUSCLE_ALIASES[normalized] || normalized;
};

export const DELOAD_REP_OVERRIDES = {
  "1": {
    "Press banca plano": ["7","6"],
    "Remo 45° con barra": ["9","7"],
    "Press militar en Smith": ["8","6"],
    "Maquina de Jalon Dorsal Isolateral": ["9","7"],
    "Hombro vuelo lateral": ["10","8"],
    "Encogimientos de Trapecio": ["10","8"],
    "Cruces en polea alta": ["10","8"],
    "Cruces invertidos en polea": ["10","8"],
    "Push-up Plus": ["8","8"]
  },
  "2": {
    "Sentadilla Smith": ["8","6"],
    "Peso muerto mancuernas (Rumano)": ["6","5"],
    "Maquina cuadriceps (Extensiones Bilaterales)": ["10","8"],
    "Curl femoral tumbado": ["10","8"],
    "Aductores maquina": ["10","8"],
    "Elevacion de Gemelos de pie": ["Metodo 5-5-5","Metodo 5-5-5"],
    "Soleos banco": ["14","12"],
    "Curl Biceps Martillo mancuernas": ["8","6"],
    "Triceps polea con barra": ["10","8"],
    "Crunch en polea alta": ["10","8"],
    "Pallof Press": ["10","8"],
    "Elevaciones de Tibial": ["10","10"]
  },
  "4": {
    "Dominadas prono y neutras": ["6","5"],
    "Press inclinado mancuernas": ["8","6"],
    "Remo sentado en maquina unilateral": ["8","6"],
    "Mariposa (Pectoral)": ["10","8"],
    "Facepull en Polea Alta": ["10","8"],
    "Hombro vuelo lateral en polea baja": ["8","8"],
    "Push-up Plus": ["8","8"]
  },
  "5": {
    "Hip Thrust con Maquina": ["8","7"],
    "Sentadilla Bulgara en Smith": ["8","6"],
    "Curl femoral sentado": ["6","8"],
    "Maquina cuadriceps unilateral": ["10","8"],
    "Abductores maquina": ["10","8"],
    "Elevacion de Gemelos (Prensa)": ["10","8"],
    "Extensiones Lumbares en Banco Romano": ["10","8"],
    "Mancuernas biceps": ["10","6"],
    "Triceps polea soga": ["10","8"],
    "Elevacion de rodillas colgado": ["8","10"],
    "Elevaciones de Tibial": ["10","10"]
  }
};

export const buildDeloadSets = (routineId, exercise) => {
  const overrides = DELOAD_REP_OVERRIDES[routineId] || {};
  const repPair = overrides[exercise.name];
  const sourceSets = Array.isArray(exercise.sets) ? exercise.sets : [];
  const baseSets = sourceSets.slice(0, 2);
  if(baseSets.length === 0) return [];
  const result = baseSets.map((set, idx) => ({
    ...set,
    reps: repPair?.[idx] || set.reps,
    rir: '4-5'
  }));
  return result;
};

export const getRoutineForWeek = (routineId, routineData, weekKey, isDeloadWeek) => {
  const baseRoutine = routineData?.[routineId];
  if(!baseRoutine) return null;
  if(!isDeloadWeek(weekKey)) return baseRoutine;
  return {
    ...baseRoutine,
    name: `${baseRoutine.name} · Descarga`,
    description: `${baseRoutine.description} · Semana de descarga`,
    exercises: baseRoutine.exercises.map(ex => ({
      ...ex,
      sets: buildDeloadSets(routineId, ex)
    }))
  };
};

export const buildPlanDayMapping = (mode='4', weekKey='', isGymClosedDate, getDayDate) => {
  const DAY_KEYS = ['1', '2', '3', '4', '5', '6', '0'];
  const split = String(mode) === '5' ? ['1','2','3','4','5'] : ['1','2','4','5'];
  const mapping = { "1":"", "2":"", "3":"", "4":"", "5":"", "6":"", "0":"", _planMode: String(mode) };
  let consecutive = 0;
  DAY_KEYS.forEach(key => {
    const closed = weekKey ? isGymClosedDate(getDayDate(weekKey, parseInt(key, 10))) : key === '0';
    if(closed) { consecutive = 0; return; }
    if(String(mode) === '4' && consecutive >= 2) { consecutive = 0; return; }
    const nextRoutine = split.shift() || '';
    if(nextRoutine) {
      mapping[key] = nextRoutine;
      consecutive += 1;
    } else {
      consecutive = 0;
    }
  });
  return mapping;
};

export const getRoutineAssignments = (weekData) => {
  const DAY_KEYS = ['1', '2', '3', '4', '5', '6', '0'];
  return DAY_KEYS.reduce((acc, key) => {
    const value = weekData?.dayMapping?.[key];
    acc[key] = typeof value === 'string' ? value : '';
    return acc;
  }, {});
};

export const didTrainDay = (weekData, dayKey) => {
  const sessionData = weekData?.sessions?.[dayKey];
  const session = Array.isArray(sessionData) ? sessionData : [];
  const hasCompletedSet = session.some(ex => (ex?.sets || []).some(set => !!set.completed));
  const trackerDay = weekData?.tracker?.[dayKey] || {};
  return hasCompletedSet || !!trackerDay.gymStartTime || !!trackerDay.gymEndTime;
};
